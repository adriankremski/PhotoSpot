# API Endpoint Implementation Plan: Update User Profile (`PATCH /api/users/:userId/profile`)

## 1. Endpoint Overview
Allows an authenticated user to partially update **their own** profile information (display name, avatar, bio, company data, website, social links).

---

## 2. Request Details
- **HTTP Method**: `PATCH`
- **URL**: `/api/users/:userId/profile`
- **Path Param**
  - `userId` `string` (required) – UUID of the user whose profile is being updated
- **Request Body (JSON)**
  ```json
  {
    "display_name": "John Doe",                    // required, ≤100 chars
    "avatar_url": "https://…",                     // optional, full URL
    "bio": "Landscape photographer",               // optional, ≤500 chars
    "company_name": "John Doe Photography",        // optional — photographer only, ≤100 chars
    "website_url": "https://johndoe.com",          // optional — photographer only, valid URL
    "social_links": {                                // optional, object of URLs
      "instagram": "https://instagram.com/johndoe"
    }
  }
  ```
  • All unspecified fields remain unchanged.  
  • `company_name`, `website_url`, and social links are allowed only for users with role `photographer`.

- **Authentication**: Required – JWT cookie/session provided by Supabase.  
- **Authorization**: Caller’s `userId` **must match** `:userId` path param; otherwise `403 Forbidden`.

---

## 3. Used Types
Already present in `src/types.ts`:
- `UpdateProfileCommand`
- `UpdateProfileResponse`
- `UserProfileDto`

New (to add):
- Zod schema `updateProfileSchema` (validator, see Implementation Steps)

---

## 4. Response Details
### Success `200 OK`
```json
{
  "message": "Profile updated successfully",
  "profile": { /* UserProfileDto */ }
}
```

### Error Codes
| Status | When                                                                    |
|--------|-------------------------------------------------------------------------|
| 400    | Invalid request body (schema errors, missing display_name)              |
| 401    | Not authenticated                                                       |
| 403    | Authenticated but attempting to modify another user’s profile           |
| 404    | Profile row not found (first‐time users should have been seeded)        |
| 500    | Unhandled server / DB error                                             |

---

## 5. Data Flow
1. **Astro API Route** (`src/pages/api/users/[userId]/profile.ts`)
   1. Parse `userId` from URL.
   2. Retrieve `supabase` & `session` from `context.locals` (populated by middleware).
   3. Ensure `session?.user.id === userId`; else return `403`.
   4. Parse & validate JSON body with `updateProfileSchema`.
   5. Build an object `updates` containing only provided fields.
   6. `supabase.from('user_profiles').update(updates).eq('user_id', userId).single()`.
   7. If Supabase returns an error → map to `500` or `400` depending on code.
   8. Fetch the updated row, map to `UserProfileDto`.
   9. Return `200` JSON payload.

2. **Service Layer** (`src/lib/services/profile.ts`)
   - `updateUserProfile(userId: string, payload: UpdateProfileCommand, supabase: SupabaseClient)`
   - Contains:
     - Role-specific field filtering.
     - Error mapping (Supabase → custom error).
     - Optional domain hooks (e.g. avatar-URL pre-signed checks).

3. **Validator** (`src/lib/validators/profile.ts`)
   - Zod schema with:
     - `display_name` `string().trim().min(1).max(FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX)`
     - `bio` `string().max(PROFILE_BIO_MAX).optional()`
     - URL validations via `z.string().url()`
     - Conditional check: if caller’s role ≠ `photographer`, disallow photographer-only fields.

4. **Middleware**
   - Already available: `src/middleware/index.ts`. Ensures `context.locals.user` & `supabase` exist, otherwise returns `401`.

---

## 6. Security Considerations
1. **AuthN**: Require valid Supabase session cookie/JWT.
2. **AuthZ**: Compare `session.user.id` with `:userId`.
3. **Input Validation**: Zod schema prevents XSS (string length limits) and SSRF (URL validation).
4. **RBAC**: Reject photographer-only fields for non-photographer role.
5. **Rate Limiting** (optional future): Use middleware to protect against brute-force profile edits.
6. **Data Integrity**: Update restricted to allowed columns only.

---

## 7. Error Handling
-  Zod validation errors → aggregate and return `400` with details.
-  Supabase row count 0 → `404`.
-  Supabase `error.code` mapping:
   - `23505` duplicate key (shouldn’t happen) → `400`.
   - Others → `500`.
-  Unexpected exceptions logged via existing logger (or `console.error` until logger exists) and respond `500`.

---

## 8. Performance Considerations
- Single DB round-trip (`update … returning *`).
- Use `select` only necessary columns when returning DTO.
- Avatar URL unchanged → no storage action needed.
- JSON response small (<2 KB).

---

## 9. Implementation Steps
1. **Create Zod Validator**
   - File: `src/lib/validators/profile.ts`
   - Export `updateProfileSchema` & `UpdateProfileInput`.
2. **Create Service**
   - File: `src/lib/services/profile.ts`
   - Implement `updateUserProfile` with Supabase interaction and custom error class `ProfileServiceError`.
3. **Add API Route**
   ```
   src/pages/api/users/[userId]/profile.ts
   ```
   - `export const prerender = false;`
   - Handle `PATCH` only (return `405` otherwise).
   - Apply validation, auth checks, service call.
4. **Update Middleware (if required)**
   - Ensure `context.locals.role` is available for role checks.
5. **Add Tests**
   - `src/pages/api/auth/update-profile.test.ts`
   - Cases: success, 400 invalid, 401 unauth, 403 forbidden, 404 not found.
6. **Update `README` / API docs** (if applicable) and `.ai/api-plan.md`.
7. **Run lint & vitest** to ensure green CI.

---

## 10. File Checklist
- `src/lib/validators/profile.ts` (new)
- `src/lib/services/profile.ts` (new)
- `src/pages/api/users/[userId]/profile.ts` (new)
- Update re-exports in any `index.ts` barrels if present.

