# API Endpoint Implementation Plan: Get Single Photo

## 1. Endpoint Overview
Fetch complete details for a single photo by its UUID. The endpoint serves three distinct audiences in a single handler:

1. **Public visitors** – can only view photos that are `approved` and **never** receive sensitive fields (`exif`, `location_exact`, `status`).
2. **Photo owner (authenticated)** – can view their own photos in any status and receive all fields, including `exif`, `location_exact`, and `status`.
3. **Moderators** – same visibility as owner plus moderation‐oriented `status` field.

The handler must enforce these visibility rules while returning a consistent DTO (`PhotoDetailDto`) with optional properties omitted from JSON when not applicable.

## 2. Request Details
- **HTTP Method:** `GET`
- **URL Structure:** `/api/photos/:photoId`
- **Parameters:**
  - **Path (required)**
    - `photoId` – `string` (UUID v4)
  - **Headers / Cookies (implicit)**
    - `Authorization: Bearer <jwt>` – optional; identifies the user to Supabase Auth.
- **Request Body:** _None_

## 3. Used Types
### Existing DTOs
- `PhotoDetailDto` – response wrapper.
- `UserBasicInfo` – embedded user info.
- `GeoPoint`, `GearInfo`, `ExifData` (nested inside `PhotoDetailDto`).
- `ApiError` – error response type.

### New / Updated Types
_**None.**_  All required types already exist in `src/types.ts`.

### Zod Schemas (to be created in `src/lib/validators/photo.ts`)
```ts
export const GetPhotoParamsSchema = z.object({
  photoId: z.string().uuid(),
});
```

## 4. Response Details
### Success – `200 OK`
Returns a `PhotoDetailDto` JSON object.

| Audience | Hidden Fields |
|----------|---------------|
| Public   | `exif`, `location_exact`, `status` |
| Owner    | _None_ (full set) |
| Moderator| _None_ (full set) |

### Error Codes
| Status | Reason |
|--------|--------|
| 400 | Invalid UUID path parameter |
| 401 | Supplied token invalid / expired |
| 403 | Photo exists but user lacks permission to view (e.g. status≠`approved`) |
| 404 | Photo not found or soft-deleted |
| 500 | Unexpected server error |

Error payload format follows `ApiError`.

## 5. Data Flow
```
Client → Astro API Route (/src/pages/api/photos/[photoId].ts)  
  ↳ Astro middleware injects `locals.supabase` & `locals.user` (if auth)  
  ↳ Handler validates :photoId via Zod  
  ↳ Calls `photoService.getPhotoById(photoId, requester)`  
    ↳ PhotoService queries Supabase:  
         - Select from `photos` joined with `user_profiles`, `favorites` (aggregate) & `photo_tags`  
         - Filter: `id = :photoId` AND `deleted_at IS NULL`  
    ↳ Service checks ownership / moderation role & status  
         - If public + status≠approved → 403  
         - Else map DB row → `PhotoDetailDto` with conditional field stripping  
  ↳ Handler returns JSON 200 or mapped error
```

## 6. Security Considerations
1. **Authentication** – Parse JWT with Supabase. For anonymous users, treat as public.
2. **Authorization (BOLA)** – Ensure requester can only fetch non-approved photos if they are the owner or moderator.
3. **Object Property Filtering** – Never leak sensitive fields to unauthorized audiences.
4. **SQL Injection** – Use Supabase query builder (parameterised) – safe.
5. **Rate Limiting (optional)** – Rely on API Gateway / middleware if available.
6. **XSS** – Escape/sanitize any string fields displayed in UI (handled client-side).

## 7. Error Handling
1. **Invalid UUID** – Throw `400` early via Zod.
2. **Not Found** – No row returned → `404`.
3. **Forbidden** – Row found but status≠`approved` and requester isn’t owner/mod → `403`.
4. **Supabase Error** – Log details; respond `500` generic message.
5. **JSON Serialization Fail** – Unlikely; wrap response in `try/catch`.

Logging Strategy:
- Use `src/lib/services/auth.ts` logger or create `logger.error()` abstraction.
- Persist unexpected errors into `audit_log` (table already exists) with `action = 'error'`.

## 8. Performance Considerations
- Create DB index on `photos(id)` (already PK) and `photos(status)` if not present.
- Use a single SQL view for join to minimize round-trips (could leverage existing `public_photos_v` for public read, but owner/mod requires direct table access).
- Aggregate `favorite_count` with Supabase `select('..., favorites(count)')` to avoid N+1.
- Send `Cache-Control: public, max-age=60` for public approved photos; disable caching for owner/mod.

## 9. Implementation Steps
1. **Add Zod validator** in `src/lib/validators/photo.ts` – `GetPhotoParamsSchema`.
2. **Create/Update service** `src/lib/services/photos.ts`
   - `getPhotoById(photoId: string, requester?: { id: string; role?: UserRole })`.
   - Performs DB query & conditional filtering.
3. **Astro API Route**: `src/pages/api/photos/[photoId].ts`
   1. `export const prerender = false`.
   2. `const { photoId } = GetPhotoParamsSchema.parse(params)`.
   3. Determine `requester` from `locals.user` (owner / mod / anon).
   4. Call service; map service errors to HTTP errors.
   5. Strip undefined props before `return new Response(JSON.stringify(photo), { status: 200 })`.
4. **Update Middleware** (`src/middleware/index.ts`) if missing to attach `locals.userRole`.
5. **Unit Tests** (`src/lib/services/__tests__/photos.test.ts`)
   - Fetch approved photo anonymously → OK 200 no exif.
   - Fetch pending photo anonymously → 403.
   - Fetch own pending photo → OK 200 full data.
   - Fetch nonexistent UUID → 404.
6. **Integration Tests** (`src/pages/api/photos/__tests__/get-photo.test.ts`) using Supabase test DB.
7. **Add docs** entry in API reference (if using content collections).
8. **Perform Lint & Type Check** – `pnpm run lint && pnpm run test`.
9. **Deploy & Monitor** – Verify audit logs, ensure no extra fields leak.

> **Estimated Effort:** 4–6 dev hours (incl. tests & review)

