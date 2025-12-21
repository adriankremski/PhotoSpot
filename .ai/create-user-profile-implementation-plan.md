# API Endpoint Implementation Plan: Create User Profile (`POST /api/users/:userId/profile`)

## 1. Endpoint Overview
Allows an authenticated user to create **their own** profile for the first time. This is typically called after user registration to set up initial profile information (display name, avatar, bio, and optionally company data for photographers).

---

## 2. Request Details
- **HTTP Method**: `POST`
- **URL**: `/api/users/:userId/profile`
- **Path Param**
  - `userId` `string` (required) – UUID of the user whose profile is being created
- **Request Body (JSON)**
  ```json
  {
    "display_name": "John Doe",                    // required, ≤100 chars
    "avatar_url": "https://…",                     // optional, full URL
    "bio": "Landscape photographer",               // optional, ≤500 chars
    "company_name": "John Doe Photography",        // optional — photographer only, ≤100 chars
    "website_url": "https://johndoe.com",          // optional — photographer only, valid URL
    "social_links": {                                // optional, object of URLs
      "instagram": "https://instagram.com/johndoe",
      "facebook": "https://facebook.com/johndoe"
    }
  }
  ```
  • `display_name` is required.  
  • `company_name`, `website_url`, and `social_links` are allowed only for users with role `photographer`.
  • Role is determined from `auth.users.raw_user_meta_data.role` and cannot be set via this endpoint.

- **Authentication**: Required – JWT cookie/session provided by Supabase.  
- **Authorization**: Caller's `userId` **must match** `:userId` path param; otherwise `403 Forbidden`.

---

## 3. Used Types
Already present in `src/types.ts`:
- `CreateProfileCommand` (to be added)
- `CreateProfileResponse` (to be added)
- `UserProfileDto`

New (to add):
- Zod schema `createProfileSchema` in `src/lib/validators/profile.ts`

---

## 4. Response Details
### Success `201 Created`
```json
{
  "message": "Profile created successfully",
  "profile": { /* UserProfileDto */ }
}
```

### Error Codes
| Status | When                                                                    |
|--------|-------------------------------------------------------------------------|
| 400    | Invalid request body (schema errors, missing display_name)              |
| 401    | Not authenticated                                                       |
| 403    | Authenticated but attempting to create another user's profile, or enthusiast attempting to set photographer-only fields           |
| 409    | Profile already exists for this user                                     |
| 500    | Unhandled server / DB error                                             |

---

## 5. Data Flow
1. **Astro API Route** (`src/pages/api/users/[userId]/profile.ts`)
   1. Parse `userId` from URL.
   2. Retrieve `supabase` & `session` from `context.locals` (populated by middleware).
   3. Ensure `session?.user.id === userId`; else return `403`.
   4. Parse & validate JSON body with `createProfileSchema`.
   5. Check if profile already exists for this userId:
      - Query `user_profiles` table for existing record
      - If exists, return `409 Conflict`
   6. Retrieve user role from `auth.users.raw_user_meta_data.role`
   7. Validate photographer-only fields against role
   8. Insert new profile record with provided data
   9. Fetch the created profile using `getUserProfile()` service
   10. Return `201` JSON payload with created profile

2. **Service Layer** (`src/lib/services/profile.ts`)
   - `createUserProfile(userId: string, payload: CreateProfileCommand, supabase: SupabaseClient)`
   - Contains:
     - Existence check (prevent duplicate profiles)
     - Role retrieval from auth.users
     - Role-specific field filtering
     - Profile creation with proper defaults
     - Error mapping (Supabase → custom error)

3. **Validator** (`src/lib/validators/profile.ts`)
   - Zod schema with:
     - `display_name` `string().trim().min(1).max(FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX)` (required)
     - `bio` `string().max(PROFILE_BIO_MAX).optional()`
     - `avatar_url` `string().url().optional()`
     - URL validations via `z.string().url()`
     - Conditional check: if caller's role ≠ `photographer`, reject photographer-only fields

4. **Middleware**
   - Already available: `src/middleware/index.ts`. Ensures `context.locals.user` & `supabase` exist, otherwise returns `401`.

---

## 6. Security Considerations
1. **AuthN**: Require valid Supabase session cookie/JWT.
2. **AuthZ**: Compare `session.user.id` with `:userId`.
3. **Input Validation**: Zod schema prevents XSS (string length limits) and SSRF (URL validation).
4. **RBAC**: Reject photographer-only fields for non-photographer role.
5. **Idempotency Check**: Prevent duplicate profile creation (409 Conflict).
6. **Role Integrity**: Role is fetched from auth.users and cannot be set by user.
7. **Data Integrity**: Only allowed columns inserted.

---

## 7. Error Handling
- Zod validation errors → aggregate and return `400` with details.
- Profile already exists → `409 Conflict`.
- Supabase `error.code` mapping:
  - `23505` duplicate key → `409`.
  - `23503` foreign key violation (user not in auth.users) → `400`.
  - Others → `500`.
- User role not found → `400` (user must have role in metadata).
- Unexpected exceptions logged and respond `500`.

---

## 8. Performance Considerations
- Check for existing profile before creation (single SELECT query).
- Fetch user role from auth.users (single query or cached).
- Single INSERT operation for profile creation.
- Use `getUserProfile()` service to return consistent profile format.
- Total DB round-trips: ~2-3 (check existence, get role, insert, fetch created).
- JSON response small (<2 KB).

---

## 9. Implementation Steps
1. **Update Types**
   - File: `src/types.ts`
   - Add `CreateProfileCommand` and `CreateProfileResponse` types.

2. **Create/Update Zod Validator**
   - File: `src/lib/validators/profile.ts`
   - Export `createProfileSchema` similar to `updateProfileSchema` but with `display_name` required.
   - Add `validateProfileCreate()` function for role-based validation.

3. **Update Service**
   - File: `src/lib/services/profile.ts`
   - Implement `createUserProfile` function with:
     - Profile existence check
     - Role retrieval from auth.users
     - Role-based field validation
     - Profile insertion
     - Return created profile using `getUserProfile()`

4. **Update API Route**
   ```
   src/pages/api/users/[userId]/profile.ts
   ```
   - Add `POST` handler alongside existing `GET` and `PATCH` handlers.
   - Implement validation, auth checks, service call.
   - Return `201 Created` on success.

5. **Add Tests**
   - Update `src/lib/validators/profile.test.ts` with create validation tests.
   - Update `src/lib/services/profile.test.ts` with create service tests.
   - Update `src/pages/api/users/[userId]/profile.test.ts` with POST endpoint tests.
   - Test cases:
     - Success: photographer with all fields
     - Success: photographer with minimal fields
     - Success: enthusiast with basic fields
     - Error: missing display_name (400)
     - Error: enthusiast with photographer fields (403)
     - Error: profile already exists (409)
     - Error: unauthorized (401)
     - Error: forbidden (403)
     - Error: invalid userId (400)

6. **Update Documentation**
   - Mark POST endpoint as implemented in `.ai/api-plan.md`.
   - Create `.ai/create-user-profile-implementation-summary.md` after implementation.

7. **Run lint & vitest** to ensure green CI.

---

## 10. File Checklist
- `src/types.ts` (update)
- `src/lib/validators/profile.ts` (update - add create schema)
- `src/lib/validators/profile.test.ts` (update)
- `src/lib/services/profile.ts` (update - add create function)
- `src/lib/services/profile.test.ts` (update)
- `src/pages/api/users/[userId]/profile.ts` (update - add POST handler)
- `src/pages/api/users/[userId]/profile.test.ts` (update)

---

## 11. Business Logic Details

### Profile Creation Flow
1. **User Registration** → Supabase Auth creates user in `auth.users` with role in metadata
2. **Profile Creation** → User calls POST `/api/users/:userId/profile` to create profile
3. **Validation** → System validates display_name and role-appropriate fields
4. **Insert** → New row created in `user_profiles` table
5. **Response** → Returns complete profile with `photo_count: 0`

### Field Handling
- **Required**: `display_name`, `user_id` (from path)
- **Auto-generated**: `created_at`, `updated_at`, `deleted_at: null`
- **Role-based**: `company_name`, `website_url`, `social_links` (photographer only)
- **Optional**: `avatar_url`, `bio`
- **Computed**: `photo_count` (always 0 for new profiles)

### Role Determination
```typescript
// Fetch role from auth.users
const { data: userData } = await supabase.auth.admin.getUserById(userId);
const role = userData?.user?.user_metadata?.role as 'photographer' | 'enthusiast';

// Validate photographer-only fields
if (role !== 'photographer' && (company_name || website_url || social_links)) {
  throw new ProfileServiceError('FORBIDDEN', 'Only photographers can set company details');
}
```

### Idempotency Check
```typescript
// Check if profile exists
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('user_id')
  .eq('user_id', userId)
  .maybeSingle();

if (existingProfile) {
  throw new ProfileServiceError('CONFLICT', 'Profile already exists');
}
```

---

## 12. Integration with Existing Code

### Reuse Existing Components
- **getUserProfile()**: Call after creation to return consistent profile format
- **validateUserId()**: Validate userId parameter format
- **Supabase middleware**: Authentication and session management
- **UserProfileDto**: Standard profile response format
- **ProfileServiceError**: Error handling and mapping

### Consistency with Update Endpoint
- Same validation rules for field formats
- Same role-based restrictions
- Same error response format
- Same success response structure (different status code and message)

---

## 13. Testing Strategy

### Unit Tests (Validator)
- Valid create with all fields
- Valid create with minimal fields (display_name only)
- Invalid: missing display_name
- Invalid: display_name too long
- Invalid: invalid URL formats
- Role validation: enthusiast cannot set photographer fields

### Unit Tests (Service)
- Successful profile creation (photographer)
- Successful profile creation (enthusiast)
- Error: profile already exists (409)
- Error: user not found in auth.users
- Error: role not set in user metadata
- Error: database failure
- Field processing: empty strings to null

### Integration Tests (API Route)
- POST with valid data returns 201
- POST without auth returns 401
- POST for different user returns 403
- POST with existing profile returns 409
- POST with invalid data returns 400
- POST with enthusiast trying photographer fields returns 403
- POST returns complete profile with photo_count: 0

---

## 14. Example Requests/Responses

### Successful Creation (Photographer)
```http
POST /api/users/123e4567-e89b-12d3-a456-426614174000/profile
Content-Type: application/json
Cookie: sb-access-token=...

{
  "display_name": "John Doe",
  "bio": "Professional landscape photographer",
  "avatar_url": "https://example.com/avatar.jpg",
  "company_name": "Doe Photography",
  "website_url": "https://doephoto.com",
  "social_links": {
    "instagram": "https://instagram.com/johndoe"
  }
}
```

Response (201 Created):
```json
{
  "message": "Profile created successfully",
  "profile": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "display_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Professional landscape photographer",
    "role": "photographer",
    "company_name": "Doe Photography",
    "website_url": "https://doephoto.com",
    "social_links": {
      "instagram": "https://instagram.com/johndoe"
    },
    "photo_count": 0,
    "created_at": "2025-12-21T10:00:00Z"
  }
}
```

### Successful Creation (Enthusiast - Minimal)
```http
POST /api/users/456e4567-e89b-12d3-a456-426614174001/profile

{
  "display_name": "Jane Smith"
}
```

Response (201 Created):
```json
{
  "message": "Profile created successfully",
  "profile": {
    "user_id": "456e4567-e89b-12d3-a456-426614174001",
    "display_name": "Jane Smith",
    "avatar_url": null,
    "bio": null,
    "role": "enthusiast",
    "photo_count": 0,
    "created_at": "2025-12-21T10:00:00Z"
  }
}
```

### Error: Profile Already Exists
```http
POST /api/users/123e4567-e89b-12d3-a456-426614174000/profile

{
  "display_name": "John Doe"
}
```

Response (409 Conflict):
```json
{
  "error": {
    "code": "conflict",
    "message": "Profile already exists for this user"
  }
}
```

### Error: Enthusiast Setting Photographer Fields
```http
POST /api/users/456e4567-e89b-12d3-a456-426614174001/profile

{
  "display_name": "Jane Smith",
  "company_name": "My Company"
}
```

Response (403 Forbidden):
```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid request data",
    "details": {
      "issues": [
        {
          "path": "role",
          "message": "Only photographers can set company_name, website_url, and social_links"
        }
      ]
    }
  }
}
```

---

## 15. Considerations

### When to Call This Endpoint
- Immediately after user registration (onboarding flow)
- When user first accesses profile settings page
- As part of initial account setup wizard

### Alternative: Database Trigger
Consider adding a database trigger to auto-create a minimal profile on user registration:
```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

If using trigger approach:
- POST endpoint changes to return 409 for all existing users
- Update endpoint becomes primary way to set profile data
- Consider removing POST endpoint or making it optional

### Frontend Integration
```typescript
// After successful registration
async function setupUserProfile(userId: string, displayName: string) {
  try {
    const response = await fetch(`/api/users/${userId}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName })
    });
    
    if (response.status === 409) {
      // Profile already exists, skip to next step
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to create profile');
    }
    
    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Profile creation failed:', error);
    throw error;
  }
}
```

---

## 16. Summary

This endpoint provides explicit profile creation capability, giving developers control over the profile setup flow. Key features:

✅ Explicit profile creation (user-initiated)  
✅ Role-based field validation  
✅ Idempotency protection (409 on duplicate)  
✅ Consistent with update endpoint patterns  
✅ Comprehensive error handling  
✅ Full test coverage  
✅ Secure by default (auth + authz checks)  

The implementation follows established patterns from the GET and PATCH endpoints, ensuring consistency across the profile API surface.

