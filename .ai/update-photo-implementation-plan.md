# API Endpoint Implementation Plan: Update Photo (`PATCH /api/photos/:photoId`)

## 1. Endpoint Overview

Updates the metadata of an existing photo owned by the authenticated user. Editable fields include title, description, category, season, time of day, tags, and gear. Non-editable fields (e.g. `file_url`, exact/public location) are explicitly rejected. When an approved photo is modified, its moderation `status` is reset to `pending`.

## 2. Request Details

- **HTTP Method:** `PATCH`
- **URL Structure:** `/api/photos/:photoId`
- **Path Params:**
  - `photoId` (uuid, required) – ID of the photo to update
- **Request Body:** JSON matching the `UpdatePhotoCommand` DTO (all properties optional)
  ```jsonc
  {
    "title": "Mountain Sunrise – Updated", // ≤200 chars
    "description": "Updated description", // ≤1000 chars
    "category": "landscape", // enum PhotoCategory
    "season": "summer", // enum Season
    "time_of_day": "sunrise", // enum TimeOfDay
    "tags": ["mountains", "sunrise", "colorado"], // ≤10 items, each ≤30 chars
    "gear": { "camera": "Canon EOS R5" }, // GearInfo object
  }
  ```

## 3. Used Types

- `UpdatePhotoCommand` – request payload (src/types.ts)
- `UpdatePhotoResponse` – success response wrapper
- `PhotoDetailDto` – updated photo object inside success response
- `ApiError` – standard error wrapper

## 4. Response Details

| Status               | When                                                   | Body                  |
| -------------------- | ------------------------------------------------------ | --------------------- |
| **200 OK**           | Update succeeded                                       | `UpdatePhotoResponse` |
| **400 Bad Request**  | Payload fails validation / forbidden property supplied | `ApiError`            |
| **401 Unauthorized** | No valid auth session                                  | `ApiError`            |
| **403 Forbidden**    | Auth user is not the owner                             | `ApiError`            |
| **404 Not Found**    | Photo does not exist or soft-deleted                   | `ApiError`            |
| **500 Internal**     | Unhandled server error                                 | `ApiError`            |

## 5. Data Flow

1. **API Route** (`src/pages/api/photos/[photoId].ts`)
   1. Parse `photoId` from URL.
   2. Read auth session via `context.locals.supabase.auth.getUser()`.
   3. Parse & validate JSON body with Zod schema `updatePhotoSchema`.
   4. Call `updatePhoto()` service with `(supabase, user.id, photoId, validatedPayload)`.
2. **Service Layer** (`src/lib/services/photo.ts`)
   1. **Fetch & ownership check** – `select * from photos where id = :photoId and deleted_at is null`.
   2. Verify `photo.user_id === userId`; else throw `ForbiddenError`.
   3. **Start transaction**.
   4. **Update `photos` row** using the allowed subset of columns only.
      - If any of `title/description/category/season/time_of_day/gear` change **and** `status = 'approved'`, set `status = 'pending'`.
   5. **Tags replacement**
      - Delete existing rows in `photo_tags` for the photo.
      - Upsert new tags into `tags` table (case-insensitive unique name).
      - Insert corresponding `photo_tags` links.
   6. Commit and return populated `PhotoDetailDto` (join with `user_profiles` + tags aggregate).
3. **API Route** – Wrap result in `UpdatePhotoResponse` and send JSON.
4. **Errors** bubble up as `ApiError` with proper status code.

## 6. Security Considerations

1. **Authentication** – Require valid Supabase session.
2. **Authorization** – Ensure authenticated user owns the target photo (row-level check + RLS fallback).
3. **Input Whitelisting** – Only accept properties defined in `UpdatePhotoCommand`; reject/strip others to prevent mass-assignment.
4. **RLS** – Supabase RLS already restricts updates to owner; service still checks early to return 403 quickly.
5. **SQL Injection** – Prevented by Supabase query builder parameterisation.
6. **XSS / Content Sanitisation** – Optionally sanitize `title`, `description`, and tag names to strip HTML.
7. **Rate Limiting** – Not critical for update, but API gateway throttling applies globally.

## 7. Error Handling

| Scenario                                         | Status | Notes                                                    |
| ------------------------------------------------ | ------ | -------------------------------------------------------- |
| Missing/invalid auth                             | 401    | `code: "auth/unauthorized"`                              |
| Photo not owned by user                          | 403    | `code: "photo/not-owner"`                                |
| Photo not found                                  | 404    | `code: "photo/not-found"`                                |
| Invalid payload (e.g. too many tags, wrong enum) | 400    | Validation error details in `details`                    |
| Attempt to update forbidden fields               | 400    | Reject with `code: "photo/immutable-field"`              |
| DB failure / unexpected                          | 500    | Log via `console.error` & optional `audit_log` insertion |

_All errors are returned using the unified `ApiError` DTO._

## 8. Performance Considerations

- Use a single transaction for the update + tag replacement to minimise round-trips.
- Fetch necessary joins (tags, user) in one `select` after update to avoid extra queries.
- Indexes already cover `photos.id` (PK) and `photo_tags.tag_id`; no extra index work.
- Response caching is not applicable to mutable operation.

## 9. Implementation Steps

1. **Types & Schema**
   1. Ensure `UpdatePhotoCommand` & `UpdatePhotoResponse` exist (already in `src/types.ts`).
   2. Add `updatePhotoSchema` in `src/lib/validators/photo.ts` using Zod:
      - Optional fields with constraints (title length, tags array length, enum checks).
      - `.strict()` to reject unknown keys.
2. **Service Layer** – Create / extend `src/lib/services/photo.ts`:
   ```ts
   export async function updatePhoto(
     supabase: SupabaseClient,
     userId: string,
     photoId: string,
     data: UpdatePhotoCommand
   ): Promise<PhotoDetailDto> {
     /* implementation */
   }
   ```
3. **API Route**
   1. Create file `src/pages/api/photos/[photoId].ts` (Astro endpoint):
      - Allow methods: `PATCH` only.
      - `export const prerender = false`.
      - Retrieve `supabase` from `context.locals`.
      - Guard unsupported methods (405).
   2. In `PATCH` handler:
      1. Check auth; return 401 if missing.
      2. Parse body as JSON, validate with `updatePhotoSchema`.
      3. Call `updatePhoto()` service.
      4. Return `200` success JSON.
      5. Catch errors → map to status codes using helper `handleApiError()`.
4. **Validator & Helper Updates**
   - If `src/lib/utils.ts` does not yet expose `handleApiError`, create it to convert internal errors to `ApiError` + status.
5. **Unit Tests** (Vitest)
   - Create tests in `src/pages/api/auth/login.test.ts` style:
     - Successful update.
     - 401 when not logged in.
     - 403 when user does not own photo.
     - 404 when photo missing.
     - 400 for invalid input & forbidden fields.
6. **Docs & OpenAPI**
   - Update `.ai/api-plan.md` and Swagger spec if maintained.
7. **Review & Merge**
   - Run `pnpm lint` and `pnpm test`.
   - Ensure RLS rules already allow owner updates; adjust if necessary.
