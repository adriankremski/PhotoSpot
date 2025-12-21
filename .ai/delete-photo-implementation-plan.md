# API Endpoint Implementation Plan: Delete Photo (`DELETE /api/photos/:photoId`)

## 1. Endpoint Overview
Soft-delete a photo owned by the authenticated user or, when authorised, by a moderator. The endpoint sets `deleted_at = NOW()` on the `photos` record, relies on database triggers to cascade soft-deletes to related tables, and removes the binary file from Supabase Storage. Returns a confirmation message on success.

## 2. Request Details
- **HTTP Method**: DELETE
- **URL Structure**: `/api/photos/:photoId`
- **Path Parameters**:
  - `photoId` (string, **required**) – UUID of the photo to delete.
- **Headers**: Automatically supplied [`Authorization: Bearer <JWT>`] by Supabase session cookie.
- **Request Body**: _None_

## 3. Used Types
- `DeletePhotoResponse` (from `src/types.ts`):
  ```ts
  interface DeletePhotoResponse {
    message: string; // "Photo deleted successfully"
  }
  ```
- Domain entities: `Photo`, `Favorite`, `PhotoTag`, etc. (read-only for this endpoint)

## 4. Response Details
| Status | Condition | Schema |
|--------|-----------|--------|
| 200 OK | Deletion succeeded | `DeletePhotoResponse` |
| 401 Unauthorized | User not logged in | `ApiError` |
| 403 Forbidden | User not owner nor moderator | `ApiError` |
| 404 Not Found | Photo doesn’t exist or already deleted | `ApiError` |
| 500 Internal Server Error | Unexpected failure (DB, Storage) | `ApiError` |

Successful example:
```json
{
  "message": "Photo deleted successfully"
}
```

## 5. Data Flow
1. **Astro Route** (`/src/pages/api/photos/[photoId].ts`)
   1. Extract `photoId` from `Astro.params`.
   2. Validate with Zod (`uuid()` schema).
   3. Retrieve `supabase` instance from `context.locals` to access auth/session.
   4. Fetch the target photo (columns: `id`, `user_id`, `file_path`, `deleted_at`).
   5. Authorisation:
      - `session.user.id === photo.user_id` → owner.
      - OR `session.user.user_metadata.role === 'moderator'`.
   6. Call `photoService.softDelete(photoId, actorId, actorRole)`.
2. **`photoService.softDelete`** (`src/lib/services/photos.ts` – _new_):
   1. Start DB transaction.
   2. Update `photos` set `deleted_at = now()` where `id = :photoId and deleted_at is null`.
   3. If `rowCount === 0` → throw `NotFoundError`.
   4. Delete file from Supabase Storage bucket (`photos/<uuid>`).
   5. Commit.
   6. Return void.
3. **Database**: Triggers already cascade soft-delete to child tables (favorites, reports, etc.).
4. Response 200.

## 6. Security Considerations
- **Authentication**: Require valid Supabase session (via middleware in `src/middleware/index.ts`).
- **Authorization**: Allow operation only if requester is photo owner or has role `moderator`.
- **Input Validation**: Zod UUID validation for `photoId`.
- **SQL Injection**: Parameterised queries via Supabase client.
- **Path Traversal**: Storage deletion uses server-side stored `file_path`; do not trust client input.
- **Race Conditions**: Use DB transaction; `deleted_at is null` predicate prevents double-delete.
- **Audit Trail**: (optional) insert row into `photo_deletions` audit table or structured log.

## 7. Error Handling
| Scenario | HTTP | Action |
|----------|------|--------|
| Missing/invalid `photoId` | 400 | Zod error mapped to `ApiError` with code `INVALID_ID` |
| Not authenticated | 401 | Early return from auth middleware |
| Not owner or moderator | 403 | Throw `ForbiddenError` |
| Photo not found or already deleted | 404 | Throw `NotFoundError` |
| Storage failure or DB error | 500 | Log error, return `INTERNAL_ERROR` |

Errors are transformed by a central error handler (`handleApiError`) that logs via `lib/utils.ts` and returns `ApiError` JSON.

## 8. Performance Considerations
- **DB**: Single indexed UPDATE by PK – negligible load.
- **Storage**: Deletion is I/O bound. Perform after DB update; if it fails, optionally enqueue retry job rather than rollback (trade-off: eventual consistency).
- **Cold starts**: None (edge → Vercel/Netlify functions) – ensure service file only imports lightweight modules.

## 9. Implementation Steps
1. **Route File**: Create `src/pages/api/photos/[photoId].ts` with DELETE handler skeleton (`export const prerender = false`).
2. **Validation**: Add `deletePhotoParamsSchema = z.object({ photoId: z.string().uuid() });` in `src/lib/validators/photos.ts`.
3. **Service**: Create `src/lib/services/photos.ts` with `softDelete()` implementation described above. Re-export public API from index.
4. **Middleware Update**: Ensure `context.locals.supabase` + `context.locals.session` are available (already present).
5. **Error Utilities**: Extend `lib/utils.ts` with `NotFoundError`, `ForbiddenError` if not existing.
6. **Endpoint Logic**:
   - Parse & validate params.
   - Assert auth; if no session → 401.
   - Fetch photo row (select `user_id`, `file_path`, `deleted_at`).
   - Authorise.
   - Call `photoService.softDelete`.
   - Return `json<DeletePhotoResponse>({ message: 'Photo deleted successfully' }, 200)`.
7. **Unit Tests** (`vitest`):
   - Owner delete succeeds (200, deleted_at set, storage mocked).
   - Moderator delete succeeds.
   - Non-owner enthusiast → 403.
   - Unknown photo → 404.
   - Already deleted → 404.
8. **Integration Test**: API DELETE call via `@supabase/auth-helpers` with session cookie.
9. **Docs Update**: Reference new endpoint in README or API docs.
10. **CI**: Add new test paths to coverage.

