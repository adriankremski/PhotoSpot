# API Endpoint Implementation Plan: Register User

## 1. Endpoint Overview

Creates a new user account using Supabase Auth. The endpoint accepts an e-mail address, password, and desired role (either `photographer` or `enthusiast`) and returns the newly-created user object plus a session (JWT + refresh token). The endpoint is a thin wrapper around `supabase.auth.signUp()` that adds:

- Strong input validation (Zod)
- Unified response model
- Consistent error handling & logging
- Protection against common auth-related attacks (rate limiting, dictionary attacks)

## 2. Request Details

- **HTTP Method:** POST
- **URL:** `/api/auth/register`
- **Headers:**
  - `Content-Type: application/json`
  - (Optional) `Accept-Language` – used by Supabase to localise transactional e-mails
- **Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "options": {
    "data": {
      "role": "photographer" // or "enthusiast"
    }
  }
}
```

- **Required Fields:** `email`, `password`, `options.data.role`
- **Optional Fields:** `options` parent object is optional if role is supplied flat – schema handles both shapes for DX.

## 3. Used Types

Create / extend the shared `src/types.ts` file with:

```ts
export type UserRole = "photographer" | "enthusiast";

export interface RegisterUserPayload {
  email: string;
  password: string;
  options?: {
    data?: {
      role: UserRole;
    };
  };
}

export interface RegisterUserResponse {
  user: {
    id: string;
    email: string;
    user_metadata: {
      role: UserRole;
    };
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number; // seconds
  };
}
```

A dedicated command-model interface is not required because the DTO can be passed directly to the Supabase SDK after validation.

## 4. Response Details

| Scenario                      | Status | Body                                                        |
| ----------------------------- | ------ | ----------------------------------------------------------- |
| Successful sign-up            | 200    | `RegisterUserResponse`                                      |
| Email already registered      | 409    | `{ "error": "Email already registered" }`                   |
| Invalid payload / weak pw     | 400    | `{ "error": "Invalid input", "details": { … } }`            |
| Other Supabase / server error | 500    | `{ "error": "Internal server error", "traceId": "<uuid>" }` |

## 5. Data Flow

1. **Request ⇒ Astro Endpoint**: Client sends POST `/api/auth/register` with payload.
2. **Validation Layer**: Zod schema parses & validates input.
3. **Service Layer (`src/lib/services/auth.ts`)**: Encapsulates call to `supabase.auth.signUp()` and maps Supabase errors to `AuthError` union.
4. **Response Builder**: Constructs unified JSON response & returns to client.

## 6. Security Considerations

- **Rate Limiting**: Use Astro middleware + KV store to limit registrations per IP (e.g. 10/hour).
- **Password Policy**: Enforced via Zod (≥ 8 chars, at least 1 number & 1 letter) plus Supabase built-in rules.
- **RLS**: Not applicable during sign-up, but ensure `public` role can insert into `auth.users`.
- **Transport Security**: Vercel enforces HTTPS; mark endpoint as `POST` only.
- **Sensitive Logs**: Never log raw passwords. Obfuscate e-mail (`user***@domain.com`) in error logs.
- **Enumeration Protection**: Return the same 200 structure for `auth/user_already_exists`? => spec requires 409. Mitigate by rate limiting.

## 7. Error Handling

| Error Source               | Detected Where         | Returned Code | Logging Action               |
| -------------------------- | ---------------------- | ------------- | ---------------------------- |
| Zod validation failure     | Validation layer       | 400           | None (client error)          |
| Supabase: user exists      | Service → `error.code` | 409           | None (expected client error) |
| Supabase: invalid password | Service                | 400           | None                         |

## 8. Performance Considerations

- Endpoint is I/O bound – ensure handler is **edge-optimised** and returns early on validation errors.
- Use Supabase’s JS client in “singleton per request” fashion (`context.locals.supabase`).
- Avoid additional DB round-trips; rely on Supabase error for uniqueness.
- Response body is small (< 1 KB) so bandwidth negligible.

## 9. Implementation Steps

1. **Create Zod schema** in `src/lib/validators/auth.ts`:
   - `email` – `z.string().email()`
   - `password` – `z.string().min(8)` (extend with regex for complexity)
   - `role` – `z.enum(['photographer', 'enthusiast'])`
2. **Scaffold service** `src/lib/services/auth.ts`:
   - `export async function registerUser(payload: RegisterUserPayload, supabase: SupabaseClient)`
   - Inside, call `supabase.auth.signUp()` and map `AuthError` codes to typed union.
3. **Create endpoint file** `src/pages/api/auth/register.ts`:

   ```ts
   import type { APIRoute } from "astro";
   import { z } from "zod";
   import { registerUserSchema } from "~/lib/validators/auth";
   import { registerUser } from "~/lib/services/auth";

   export const POST: APIRoute = async ({ request, locals }) => {
     try {
       const json = await request.json();
       const payload = registerUserSchema.parse(json);

       const result = await registerUser(payload, locals.supabase);
       return new Response(JSON.stringify(result), { status: 200 });
     } catch (err) {
       /* map ZodError ⇒ 400, AuthError ⇒ 400/409, others ⇒ 500 */
     }
   };
   export const prerender = false;
   ```

4. **Implement unified error mapper** in `src/lib/utils.ts` (if not already present).
5. **Write Jest/ Vitest tests** for validator, service, and endpoint (using Supabase test doubles).
6. **Add ESLint & type-checking** to CI to enforce new code quality.
7. **Update `src/types.ts`** with DTO additions.
8. **Document** endpoint in `/README.md` or API docs site.
9. **Add middleware rate limiter** (reuse existing ratelimit util or implement Redis/Edge config).

---

This plan adheres to the project’s tech stack (Astro 5, Supabase, TypeScript 5) and coding conventions while providing clear guidance for the development team to implement a secure and maintainable user registration endpoint.
