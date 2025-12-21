# API Endpoint Implementation Plan: Remove from Favorites

## 1. Endpoint Overview
Deletes a photo from the authenticated user’s favorites list. Only the owner of the favorites collection can perform this action.

## 2. Request Details
- **HTTP Method**: DELETE
- **URL Structure**: `/api/users/:userId/favorites/:photoId`
- **Parameters**:
  - Required (Path):
    - `userId` (uuid) – ID of the requesting user
    - `photoId` (uuid) – ID of the photo to remove from favorites
- **Request Body**: _None_
- **Authentication**: Supabase session (JWT) – required

## 3. Used Types
- `RemoveFavoriteResponse` (defined in `src/types.ts`)
- `ApiError` (error DTO)
- Database table: `favorites` (`user_id`, `photo_id`, `created_at`)

## 4. Response Details
| Status | Condition | Payload |
|--------|-----------|---------|
| 200 OK | Favorite removed successfully | `{ "message": "Photo removed from favorites" }` |
| 401 Unauthorized | Missing or invalid auth token | `ApiError` |
| 403 Forbidden | Auth user ≠ `userId` | `ApiError` |
| 404 Not Found | Favorite record does not exist | `ApiError` |
| 500 Internal Server Error | Unhandled exceptions | `ApiError` |

## 5. Data Flow
1. **Middleware** authenticates request and injects `supabase` & `authUser` into `Astro.locals`.
2. **API route handler** validates path params with Zod.
3. Verify `authUser.id === userId`; else respond 403.
4. Call `FavoritesService.removeFavorite(userId, photoId)`.
   1. Service issues `DELETE` to Supabase table `favorites` filtering by both IDs and returns row count.
5. If `rowCount === 0`, respond 404.
6. On success, respond 200 with `RemoveFavoriteResponse`.
7. Errors caught, logged via `ErrorLogger.log()` and re-thrown as `ApiError`.

## 6. Security Considerations
- Require valid Supabase JWT.
- Authorize by matching `authUser.id` with `userId` path param.
- Use parameterized queries (Supabase SDK) to prevent SQL injection.
- Rate-limit via existing API gateway/middleware (if configured).
- Ensure proper CORS headers via Astro default config.

## 7. Error Handling
| Scenario | HTTP | Code | Message |
|----------|------|------|---------|
| Not authenticated | 401 | `auth/unauthorized` | "Not authenticated" |
| Different user | 403 | `auth/forbidden` | "Removing from another user’s favorites" |
| Favorite missing | 404 | `favorites/not_found` | "Favorite not found" |
| DB failure | 500 | `server/error` | "Unexpected server error" |

Errors are logged to `error_logs` table with context (`endpoint`, `user_id`, stack). Use centralized `ErrorLogger` utility.

## 8. Performance Considerations
- Ensure composite index on `(user_id, photo_id)` in `favorites` for fast delete & existence checks.
- Single row delete → minimal DB load.
- Endpoint is idempotent; subsequent deletes after first will 404 quickly via index.

## 9. Implementation Steps
1. **Create Service** `src/lib/services/favorites.service.ts` (if not exists)
   ```ts
   export async function removeFavorite(supabase: SupabaseClient, userId: string, photoId: string) {
     const { error, count } = await supabase
       .from('favorites')
       .delete({ count: 'exact' })
       .eq('user_id', userId)
       .eq('photo_id', photoId);
     if (error) throw error;
     return count; // 0 or 1
   }
   ```
2. **Add Zod schema** in `src/lib/validation/favorites.schema.ts`:
   ```ts
   import { z } from 'zod';
   export const removeFavoriteParams = z.object({
     userId: z.string().uuid(),
     photoId: z.string().uuid(),
   });
   ```
3. **Create API route** `src/pages/api/users/[userId]/favorites/[photoId].delete.ts`:
   1. Import schema, service, `ApiError`, and `RemoveFavoriteResponse` types.
   2. Extract & validate params: `const { userId, photoId } = removeFavoriteParams.parse(Astro.params)`.
   3. Get `authUser` & `supabase` from `Astro.locals`.
   4. If no `authUser` → 401.
   5. If `authUser.id !== userId` → 403.
   6. `const count = await removeFavorite(supabase, userId, photoId)`.
   7. If `count === 0` → 404.
   8. Return JSON `RemoveFavoriteResponse`.
   9. Wrap in try/catch; on error, log then return 500.
4. **Update central error logger** if needed to record new endpoint path.
5. **Add DB index** migration if not present: `CREATE UNIQUE INDEX favorites_uid_pid_idx ON favorites(user_id, photo_id);`
6. **Write unit tests** (Vitest) for service & handler covering success and error cases.
7. **Update API documentation** (OpenAPI / Markdown) with new responses.
8. **Run linter & type check** to ensure compliance with coding practices.

