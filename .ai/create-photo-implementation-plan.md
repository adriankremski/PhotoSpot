# API Endpoint Implementation Plan: Create Photo (`POST /api/photos`)

## 1. Endpoint Overview

Allows an authenticated user to upload a JPG/PNG photo (≤ 10 MB) together with metadata.
Creates a database record (`photos`, `photo_tags`), stores the file in Supabase Storage, extracts EXIF, optionally blurs location, sets initial `status = 'pending'`, and returns a lightweight confirmation object.

## 2. Request Details

- **HTTP Method:** POST
- **URL:** `/api/photos`
- **Auth:** Required (Supabase Auth – bearer cookie or header)
- **Content-Type:** `multipart/form-data`

### Parameters

| Name            | Type / Format         | Required | Validation / Notes                               |
| --------------- | --------------------- | -------- | ------------------------------------------------ |
| `file`          | binary (JPG/PNG)      | ✔       | ≤ 10 MB, MIME & ext in `FILE_UPLOAD_CONSTRAINTS` |
| `title`         | string                | ✔       | 1–200 chars                                      |
| `description`   | string                |          | ≤ 1000 chars                                     |
| `category`      | `photo_category` enum | ✔       | see `isPhotoCategory()`                          |
| `season`        | `season` enum         |          | optional                                         |
| `time_of_day`   | `time_of_day` enum    |          | optional                                         |
| `latitude`      | number                | ✔       | –90 … 90                                         |
| `longitude`     | number                | ✔       | –180 … 180                                       |
| `blur_location` | boolean               |          | default `false`                                  |
| `blur_radius`   | number (m)            |          | 100–500; required only when `blur_location` true |
| `tags`          | string[]              |          | ≤ 10, each ≤ 30 chars, lowercase trimmed         |
| `gear`          | JSON (`GearInfo`)     |          | optional                                         |

### DTO / Command Model

`CreatePhotoCommand` (request)  
`CreatePhotoResponse` (success)  
`ApiError` (errors)

## 3. Response Details

### Success — `201 Created`

```json
{
  "message": "Photo uploaded successfully",
  "photo": {
    "id": "uuid",
    "title": "Mountain Sunrise",
    "status": "pending",
    "file_url": "https://.../photos/uuid.jpg",
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

### Error Codes

| Status                    | Scenario                                                    |
| ------------------------- | ----------------------------------------------------------- |
| 400 Bad Request           | missing/invalid fields, wrong enum, >10 tags                |
| 401 Unauthorized          | user not signed in                                          |
| 413 Payload Too Large     | file > 10 MB                                                |
| 422 Unprocessable Entity  | invalid coordinates / EXIF parsing failed                   |
| 429 Too Many Requests     | > 5 photos / 24 h (DB trigger raises pg error – map to 429) |
| 500 Internal Server Error | storage or DB failure                                       |

## 4. Data Flow

1. **API Route** `/src/pages/api/photos/index.ts` (POST handler)
2. Parse multipart via `@hattip/multipart` streamed to disk/tmp buffer.
3. **Validation Service** (`photoValidation.ts`) • Zod schema checks every field.
4. **photosService.createPhoto()**
   1. Check rate-limit by querying `photos` where `user_id = auth.uid()` and `created_at > now-24h` (defensive, trigger is primary).
   2. Upload file to Supabase Storage bucket `photos` → get `file_url`, size.
   3. Extract EXIF with `exifr` (async).
   4. Prepare `location_exact` = ST_Point(lon, lat). If `blur_location`, calculate random offset ≤ `blur_radius` (helpers in `geo.ts`) else copy exact.
   5. Insert row into `photos`.
   6. Upsert tags (`tags` table) with `ON CONFLICT DO NOTHING`, collect ids, bulk insert into `photo_tags`.
   7. Return lightweight DTO.
5. Serialize response and send 201.

## 5. Security Considerations

- Enforce Supabase Auth; reject if `locals.user` undefined.
- RLS on `photos` ensures row-level security after insert.
- Validate MIME, magic-bytes check with `file-type` to prevent disguised files.
- Strip/verify EXIF to avoid hidden GPS if user chose blur.
- Limit upload size stream-based to avoid memory bloat/DOS.
- Store file under user-scoped path `photos/{userId}/{uuid}.{ext}` with `private` ACL (only signed URL until approved).
- Sanitize text (title/desc/tags) to prevent XSS when echoed in front-end.
- Use prepared queries (`supabase.from(...).insert`) – no SQL injection.

## 6. Error Handling

- Wrap each async step in try/catch and map Supabase errors to `ApiError`.
- Database constraint errors (file_size, enum, trigger) → inspect `error.code`; if `payload_too_large` → 413, trigger name `photos_limit` → 429.
- Log unexpected errors to `audit_log` or external logger (`sentry`). Record: `user_id`, action `create_photo`, message, stack.
- Always return structured `ApiError`.

## 7. Performance Considerations

- Stream upload directly from multipart parser to Supabase Storage (no full RAM buffering).
- EXIF extraction offloaded to background if large (but typically fast).
- Tag upsert executed in single bulk query.
- Use `RETURNING id,title,status,file_url,created_at` to avoid second select.
- Ensure GIST index on `location_public` already exists for future queries.

## 8. Implementation Steps

1. **Dependencies**

   ```bash
   pnpm add exifr file-type zod @hattip/multipart
   ```

2. **Add Service Files**  
   • `src/lib/services/photosService.ts` – main orchestration  
   • `src/lib/validators/photoValidation.ts` – Zod schema & helpers  
   • `src/lib/utils/geo.ts` – random blur offset function

3. **photoValidation.ts**  
   • Build Zod schema using `FIELD_CONSTRAINTS`, `LOCATION_BLUR`, enums.  
   • Custom refinement for blur_radius + blur_location.  
   • Export `parseCreatePhotoCommand(formData: FormData): ParsedData`.

4. **geo.ts**

```ts
export function randomOffsetPoint(lat: number, lon: number, radiusMeters: number) {
  // Haversine-based random point generator
}
```

5. **photosService.createPhoto(userId, data)**  
   • Implement steps 4.1-4.6 from Data Flow.  
   • Return minimal DTO (`CreatePhotoResponse`).

6. **API Route** `src/pages/api/photos/index.ts`

```ts
export const prerender = false;

import { photosService } from "@/lib/services/photosService";
import { parseMultipartForm } from "@/lib/utils/multipart";
import { photoValidation } from "@/lib/validators/photoValidation";

export async function POST(context: APIRouteContext) {
  const { supabase, user } = context.locals;
  if (!user)
    return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Not authenticated" } }), {
      status: 401,
    });

  const form = await parseMultipartForm(context.request); // stream-safe
  const parsed = photoValidation.parse(form);

  try {
    const response = await photosService.createPhoto(supabase, user.id, parsed);
    return new Response(JSON.stringify(response), { status: 201 });
  } catch (err) {
    // map & log
  }
}
```

7. **Unit Tests**

- Validation schema edge cases.
- geo blur radius math.

8. **Integration Tests** (Vitest + Supabase test project)

- Successful upload.
- 400 on invalid category.
- 413 on >10 MB.
- 429 when limit exceeded.

9. **Docs**

- Update `/docs/api.md` and Swagger/OpenAPI spec.

10. **CI**

- Add test & lint step for new files.
