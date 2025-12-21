# API Endpoint Implementation Plan: Get User’s Photos

## 1. Endpoint Overview
Retrieve a paginated list of photos that belong to a specific user.  
• Public visitors see **only approved** photos.  
• The owner (authenticated user whose id == `:userId`) can see **all** their photos regardless of status.  
• Results are ordered by `created_at DESC`.

## 2. Request Details
- **HTTP Method:** `GET`
- **URL Pattern:** `/api/users/:userId/photos`
- **Path Parameters:**
  - `userId` (`uuid`, required) – ID of the photo owner.
- **Query Parameters:**
  | Name     | Type    | Required | Default | Constraints | Purpose |
  |----------|---------|----------|---------|-------------|---------|
  | `status` | string  | No       | —       | One of `approved \| pending \| rejected` (owner only) | Filter by status |
  | `limit`  | integer | No       | `20`    | 1 – 100      | Pagination page size |
  | `offset` | integer | No       | `0`     | ≥ 0          | Pagination offset |
- **Request Body:** none
- **Auth Scenarios:**
  1. **Public / other user** – no session or `user.id ≠ :userId` → only `approved` photos.
  2. **Owner** – valid session with `user.id == :userId` → may request any status (default all).

## 3. Used Types
```ts
// src/types.ts (additions)
export type PhotoStatus = 'approved' | 'pending' | 'rejected';

export interface PhotoSummaryDTO {
  id: string;           // uuid
  title: string;
  thumbnail_url: string;
  category: string;
  status?: PhotoStatus; // present only to owner / moderator
  created_at: string;   // ISO string
  favorite_count: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface GetUserPhotosResponse {
  data: PhotoSummaryDTO[];
  meta: PaginationMeta;
}
```
Service-level command model (internal only):
```ts
interface GetUserPhotosCommand {
  requesterId?: string; // undefined for public requests
  targetUserId: string;
  status?: PhotoStatus;
  limit: number;
  offset: number;
}
```

## 4. Response Details
- **Success (200)**  – returns `GetUserPhotosResponse`.
- **Errors**
  | Status | Reason |
  |--------|--------|
  | 400 | Validation failed (invalid uuid, limit>100, negative offset, unknown status) |
  | 401 | Unauthenticated when requesting non-approved photos |
  | 404 | User not found |
  | 500 | Unhandled server error |

## 5. Data Flow
1. **Astro Endpoint** (`src/pages/api/users/[userId]/photos.ts`)
   1. Parse `userId` from route params.
   2. Read query params → build `GetUserPhotosCommand`.
   3. Determine `requesterId` via `locals.supabase.getUser()`.
   4. Pass command & `locals.supabase` to `photosService.getUserPhotos(cmd, supabase)`.
2. **Service Layer** (`src/lib/services/photos.ts`)
   1. Authorize: if `requesterId !== targetUserId` force `status='approved'`.
   2. Fetch total count with `select('*', { count: 'exact', head: true })`.
   3. Fetch rows with `select(...columns)` + filters + order + range.
   4. Map DB rows → `PhotoSummaryDTO[]`.
3. **Endpoint** builds response `{ data, meta }` and returns JSON.
4. **Error path:** service throws `AppError` subclasses → endpoint maps to status codes, logs to `error_logs` table via `logError()` helper.

## 6. Security Considerations
- **Authorization bypass** – enforce ownership check in service.
- **Row-level security** – ensure Supabase RLS allows selecting approved rows publicly.
- **Input sanitation** – Zod validation eliminates SQL-injection risk.
- **DoS** – cap `limit` at 100.
- **Information leakage** – hide `status` field for public users.

## 7. Error Handling
- Use `AppError` hierarchy (`BadRequestError`, `UnauthorizedError`, `NotFoundError`, `InternalServerError`).
- Endpoint `try/catch` converts errors to proper HTTP code & JSON `{ error: message }`.
- On 5xx, insert record into `error_logs` with stack trace & request context.

## 8. Performance Considerations
- Use `select` with specific columns, not `*`.
- Single query for page data; avoid N+1 by storing `favorite_count` materialized in `photos` table.
- Add index on `(user_id, status, created_at DESC)`.
- Leverage Supabase postgREST pagination (`range()` uses `limit, offset`).
- Consider CDN caching for public approved photos.

## 9. Implementation Steps
1. **Types**  
   • Add/extend `PhotoStatus`, `PhotoSummaryDTO`, `PaginationMeta`, `GetUserPhotosResponse` in `src/types.ts`.
2. **Service Layer** (`src/lib/services/photos.ts`)  
   • Create `getUserPhotos(cmd, supabase)` implementing business logic & returning `{ data, total }`.
3. **Validation**  
   • In endpoint, define Zod schema for params & query: `uuid`, `limit<=100`, `offset>=0`, `status` enum.
4. **Endpoint File**  
   • Create `src/pages/api/users/[userId]/photos.ts` with `export const prerender = false` and `GET` handler.  
   • Parse, validate, call service, build response.
5. **Error Utilities**  
   • Re-use or add generic `errorResponse()` and `logError()` helpers in `src/lib/utils.ts`.
6. **Testing**  
   • Add service unit tests (`src/lib/services/__tests__/photos.test.ts`).  
   • Add API route tests using Vitest + Supabase mock (`src/pages/api/users/__tests__/photos.test.ts`).
7. **RLS & DB**  
   • Verify `photos` table RLS policy:  
     – `status='approved'` selectable by anonymous.  
     – Owner selectable any status.  
   • Create composite index if missing.
8. **Documentation**  
   • Update OpenAPI / API reference docs.
9. **Review & QA**  
   • Lint, run tests, manual curl checks, performance smoke-test with `limit=100`.

