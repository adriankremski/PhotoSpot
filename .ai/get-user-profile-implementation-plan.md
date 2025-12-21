# API Endpoint Implementation Plan: Get User Profile (`GET /api/users/:userId/profile`)

## 1. Endpoint Overview
Retrieves the public profile of a PhotoSpot user, optionally including private/extended fields when the authenticated user requests their own profile. The endpoint returns a `200 OK` JSON payload with profile information or appropriate error codes.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/users/:userId/profile`
- **Route Parameters**:
  - `userId` (string, **required**) – UUID v4 of the user to fetch.
- **Query Parameters**: _None_
- **Request Body**: _None_

## 3. Used Types
- `UserProfileDto` – successful response payload.
- `ApiError` – error responses.
- Zod validation schema (to be created) for `userId` param.

## 4. Response Details
| Scenario | Status | Payload |
|----------|--------|---------|
| Success | **200** | `UserProfileDto` |
| Invalid `userId` (not UUID) | **400** | `ApiError` (`invalid_parameter`) |
| Unauthenticated self-profile request | **401** | `ApiError` (`unauthorized`) |
| User not found / soft-deleted | **404** | `ApiError` (`not_found`) |
| Unexpected server error | **500** | `ApiError` (`internal_error`) |

### Field Visibility Rules
| Viewer | Returned Fields |
|--------|-----------------|
| Owner (authenticated) | all fields |
| Other users / public | if `role === 'photographer'` ⇒ all fields; if `role === 'enthusiast'` ⇒ basic fields (`display_name`, `avatar_url`, `bio`) |

## 5. Data Flow
1. **Astro Endpoint** (`src/pages/api/users/[userId]/profile.ts`)
   1. Parse & validate `userId` param via Zod.
   2. Determine `currentUserId` from `context.locals.supabase.auth.getUser()`.
   3. **Auth check**: if `currentUserId === userId` and not authenticated ⇒ `401`.
   4. Call service `getUserProfile(userId, currentUserId)`.
2. **Service Layer** (`src/lib/services/user.service.ts` – _new_)
   1. Query `user_profiles` (`up`) joined with `users` (`u`):
      ```sql
      SELECT up.*, u.role, u.created_at, COUNT(p.id) AS photo_count
      FROM user_profiles up
      JOIN users u ON u.id = up.user_id
      LEFT JOIN photos p ON p.user_id = up.user_id AND p.deleted_at IS NULL
      WHERE up.user_id = :userId AND u.deleted_at IS NULL
      GROUP BY up.user_id, u.role, u.created_at;
      ```
   2. If no row ⇒ `null`.
   3. Map DB row → `UserProfileDto`, applying **field visibility rules**.
3. **Endpoint Response**: Serialize DTO → JSON.
4. **Error Handling**: Map service/validation errors to HTTP codes.

## 6. Security Considerations
1. **Authentication**
   - Use Supabase Auth session via `context.locals.supabase`.
2. **Authorization**
   - Self-profile requires valid session with matching `userId`.
   - Other profiles are public but restricted by role.
3. **RLS**
   - Reads on `user_profiles` and `users` are unrestricted (public) but `deleted_at IS NULL` enforced in query.
4. **Input Validation**
   - Validate `userId` as UUID with Zod.
5. **Leakage Prevention**
   - Apply role-based field filtering before returning data.
6. **Rate Limiting** (future)
   - Leverage Vercel Edge Middleware or Supabase Edge Functions if abuse observed.

## 7. Error Handling
| Code | Error Code | Description | Action |
|------|------------|-------------|--------|
| 400 | `invalid_parameter` | Param not a valid UUID. | Log debug; no DB logging. |
| 401 | `unauthorized` | Self-profile without auth. | Log warning. |
| 404 | `not_found` | User missing or soft-deleted. | No PII leak. |
| 500 | `internal_error` | Unhandled exception / DB failure. | Log to Sentry; return generic message. |

## 8. Performance Considerations
- Use `COUNT` with `LEFT JOIN` and `GROUP BY` (single query) – avoid N+1.
- Indexes already exist: `photos.user_id`. Query uses equality, covered by PK.
- DTO mapping happens server-side, negligible.

## 9. Implementation Steps
1. **Add Zod validation**
   ```ts
   // src/lib/schemas/params.ts
   export const userIdParamSchema = z.object({ userId: z.string().uuid() });
   ```
2. **Create user service**
   ```ts
   // src/lib/services/user.service.ts
   export async function getUserProfile(
     supabase: SupabaseClient,
     userId: string,
     currentUserId?: string | null
   ): Promise<UserProfileDto | null> { /* ... */ }
   ```
3. **Implement DB query with Supabase**
   - Use `rpc` or SQL view for complex join, or `supabase.from(...).select()` with `count('exact')`.
4. **Field filtering logic**
   - Determine `isOwner`, `isPhotographer`.
   - Omit confidential fields for enthusiasts when viewer ≠ owner.
5. **Add API route**
   ```ts
   // src/pages/api/users/[userId]/profile.ts
   import { userIdParamSchema } from '@/lib/schemas/params';
   import { getUserProfile } from '@/lib/services/user.service';

   export async function GET({ params, locals, request }: APIRoute) { /* ... */ }
   export const prerender = false;
   ```
6. **Integrate error handling utility** (`src/lib/http/errors.ts`) if not present.
7. **Unit tests** (Vitest)
   - Valid owner request, public photographer, public enthusiast.
   - Invalid UUID, not found, unauthorized.
8. **E2E tests** (Playwright) hitting deployed preview.
9. **Update documentation** (.ai/api-plan.md) – mark endpoint implemented.
10. **Code review & merge.**

