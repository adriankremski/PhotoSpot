# API Endpoint Implementation Plan: POST /api/auth/login

## 1. Endpoint Overview
The Login endpoint authenticates an existing user using Supabase Auth. It validates user credentials, delegates authentication to `supabase.auth.signInWithPassword`, and returns a normalized `AuthResponse` containing the user profile stub and a session object. All logic is encapsulated in the `loginUser` service to keep the route thin and maintainable.

## 2. Request Details
- **HTTP Method:** POST
- **URL:** /api/auth/login
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Parameters:**
  - **Required:** `email`, `password`
  - **Optional:** none
- **Content-Type:** application/json UTF-8

## 3. Used Types
- `LoginCommand` – request DTO (email, password)
- `AuthResponse` – success response DTO (user, session)
- `ApiError` – error wrapper
- `AuthServiceError` – internal error class (already exists in `src/lib/services/auth.ts`)

## 4. Response Details
| Status | Scenario | Body |
|--------|----------|------|
| 200 OK | Successful login | `AuthResponse` |
| 400 Bad Request | Invalid input payload (Zod) | `ApiError` (`INVALID_INPUT`) |
| 401 Unauthorized | Wrong email / password | `ApiError` (`INVALID_CREDENTIALS`) |
| 429 Too Many Requests | Supabase rate-limit | `ApiError` (`RATE_LIMIT_EXCEEDED`) |
| 500 Internal Server Error | Unexpected failure | `ApiError` (`INTERNAL_ERROR`) |

## 5. Data Flow
1. Astro API route receives POST `/api/auth/login`.
2. Parse & validate JSON body with Zod schema → `LoginCommand`.
3. Obtain `supabase` from `context.locals` (middleware injects).
4. Call `loginUser(email, password, supabase)` from `src/lib/services/auth.ts`.
5. Service calls `supabase.auth.signInWithPassword`.
6. Map Supabase response into `AuthResponse` or throw `AuthServiceError`.
7. Route catches:
   - Success → return 200 + JSON `AuthResponse`.
   - `AuthServiceError` → map to `ApiError` with proper status.
   - Unknown → log, return 500.
8. Sentry (future) or console logs error for observability.

## 6. Security Considerations
- Transport: enforce HTTPS (handled by Vercel).
- Brute-force: rely on Supabase Auth rate-limiting; propagate 429.
- Enumeration: always return 401 for invalid credentials without revealing if email exists.
- Sensitive data:
  - Never return password or hash.
  - Limit session TTL via Supabase settings.
- Input sanitation via Zod prevents injection.
- CORS: Astro defaults; ensure only allowed origins.

## 7. Error Handling
- **Validation Errors** (`ZodError`): map to 400 with field-level details.
- **AuthServiceError**: use contained `statusCode` & `code`.
- **Unexpected Exceptions**: log and respond 500 with generic message.
- **Logging**: In the future pipe to `src/lib/services/logger`, but for now `console.error` with requestId.

## 8. Performance Considerations
- O(1) operation; single external call to Supabase edge node (low latency).
- No DB reads/writes beyond Supabase Auth.
- Payloads < 1 KB.
- Use edge function (Astro default) for minimal cold-start.

## 9. Implementation Steps
1. **DTO & Validation**
   - Ensure `LoginCommand` already exists (`types.ts`).
   - Create `loginSchema` in `src/lib/validators/auth.ts`:
     ```ts
     export const loginSchema = z.object({
       email: z.string().email(),
       password: z.string().min(8).max(128),
     });
     ```
2. **Service Layer**
   - `loginUser` already implemented. Review for completeness (already maps errors).
3. **API Route** `src/pages/api/auth/login.ts`:
   ```ts
   import { loginSchema } from '@/lib/validators/auth';
   import { loginUser, AuthServiceError } from '@/lib/services/auth';
   import type { APIRoute } from 'astro';

   export const prerender = false;

   export const POST: APIRoute = async ({ request, locals }) => {
     try {
       const payload = await request.json();
       const { email, password } = loginSchema.parse(payload);
       const data = await loginUser(email, password, locals.supabase);
       return new Response(JSON.stringify(data), { status: 200 });
     } catch (err) {
       if (err instanceof ZodError) {
         return new Response(JSON.stringify({ error: { code: 'INVALID_INPUT', message: 'Invalid request', details: err.flatten() } }), { status: 400 });
       }
       if (err instanceof AuthServiceError) {
         return new Response(JSON.stringify({ error: { code: err.code, message: err.message, details: err.details } }), { status: err.statusCode });
       }
       console.error('login error', err);
       return new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }), { status: 500 });
     }
   };
   ```
4. **Validator Update**: Add `loginSchema` export.
5. **Tests** (optional but recommended):
   - Unit: service happy path + error paths using Supabase JS client mock.
   - Integration: route returns correct codes.
6. **Docs**: Update Swagger / API reference.
7. **Deployment**: Push to branch, CI runs lint/test, Vercel preview.
8. **Monitoring**: Verify Supabase dashboard for auth events.

