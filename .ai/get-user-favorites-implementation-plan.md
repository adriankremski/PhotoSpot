# API Endpoint Implementation Plan: Get User's Favorites

## 1. Endpoint Overview
Returns a paginated list of photos that the authenticated user has marked as “favorite”.  
• Only the owner of the favorites list can access this endpoint (self-service).  
• Each item includes basic photo info and when it was favorited.

## 2. Request Details
- **HTTP Method:** `GET`  
- **URL:** `/api/users/:userId/favorites`  
- **URL Params:**  
  - `userId` – UUID of the user whose favorites are requested (must equal the authenticated user).
- **Query Parameters:**  
  | Name   | Type    | Default | Constraints             |
  |--------|---------|---------|-------------------------|
  | limit  | integer | 20      | 1 – 100 (`PAGINATION_DEFAULTS.FAVORITES`) |
  | offset | integer | 0       | ≥ 0                     |
- **Request Body:** none (query-string only)

## 3. Used Types
1. `FavoriteListItemDto` – list element (defined in `src/types.ts`).  
2. `ListResponse<FavoriteListItemDto>` – envelope `data + meta`.  
3. `PaginationMeta`, `ApiError` – shared helpers.  
4. **(New)** `FavoriteQueryParams`  
   ```ts
   export interface FavoriteQueryParams {
     limit?: number;
     offset?: number;
   }
   ```

## 4. Response Details
### Success (200 OK)
```json
{
  "data": [FavoriteListItemDto, …],
  "meta": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": false
  }
}
```
### Error Codes
| Status | Reason                              |
|--------|-------------------------------------|
| 400    | Validation failure (limit, offset)  |
| 401    | Not authenticated                   |
| 403    | Requesting another user’s favorites |
| 500    | Unexpected / database error         |

## 5. Data Flow
```
Client ──▶ /api/users/[userId]/favorites (Astro API)
          ├─ Validate & auth-check
          ├─ Service: getUserFavorites(params, supabase)
          │   • Build PostgREST query on tables:
          │       favorites   (alias f)
          │       public_photos_v (alias p)
          │       user_profiles   (alias u)
          │   • count=exact, order by f.created_at DESC
          └─ Map rows ➜ FavoriteListItemDto[]
          ◀── Return ListResponse JSON
```

## 6. Security Considerations
1. **Authentication** – must have an active session.  
2. **Authorization** – `locals.user.id` must equal `:userId`; otherwise 403.  
3. **RLS** – Supabase policy on `favorites` ensures rows are visible only to owner; nevertheless we enforce check in code.  
4. **SQL Injection** – PostgREST query builder is used (no string concat).  
5. **Rate Limiting** – rely on global API gateway limits (future enhancement).  
6. **Sensitive Data** – photos come from `public_photos_v` which already hides EXIF & private fields.

## 7. Error Handling
| Scenario                           | Status | Code               | Action                                         |
|------------------------------------|--------|--------------------|------------------------------------------------|
| limit > 100 OR < 1                 | 400    | `INVALID_LIMIT`    | Return `ApiError`, no DB call                  |
| offset < 0                         | 400    | `INVALID_OFFSET`   | –                                             |
| Auth missing                       | 401    | `UNAUTHENTICATED`  | –                                             |
| userId ≠ session.user.id           | 403    | `FORBIDDEN`        | –                                             |
| Supabase/Postgres failure          | 500    | `DATABASE_ERROR`   | Log to `audit_log`, generic message to client |
| Unexpected exception               | 500    | `INTERNAL_ERROR`   | Same logging                                   |

`logApiError(details, req)` helper writes a row in `audit_log`.

## 8. Performance Considerations
1. **Index usage** – `favorites(user_id, created_at)` composite index exists or must be created.  
2. `count=exact` only when `offset === 0`; otherwise `count=planned`.  
3. Query returns only required columns; avoids N+1 by joining in single request.  
4. Limit ≤ 100 prevents large payloads.  
5. JSON compression handled by Vite/HTTP server.

## 9. Implementation Steps
1. **Types**  
   - Add `FavoriteQueryParams` to `src/types.ts` (if not already present).  

2. **Validation** (`src/lib/validators/favorites.ts`)  
   ```ts
   import { z } from 'zod';
   import { PAGINATION_DEFAULTS } from '@/types';

   export const favoriteQueryParamsSchema = z.object({
     limit: z.preprocess(Number, z.number().int().min(1).max(PAGINATION_DEFAULTS.FAVORITES.MAX).optional())
             .default(PAGINATION_DEFAULTS.FAVORITES.DEFAULT),
     offset: z.preprocess(Number, z.number().int().min(0).optional())
              .default(0),
   });
   export type FavoriteQueryParams = z.infer<typeof favoriteQueryParamsSchema>;
   ```

3. **Service Layer** (`src/lib/services/favorites.ts`)  
   ```ts
   import type { SupabaseClient } from '@/db/supabase.client';
   import { ListResponse, FavoriteListItemDto } from '@/types';

   export async function getUserFavorites(
     userId: string,
     params: FavoriteQueryParams,
     supabase: SupabaseClient
   ): Promise<ListResponse<FavoriteListItemDto>> {
     const { limit, offset } = params;
     const countOpt = offset === 0 ? 'exact' : 'planned';

     let query = supabase
       .from('favorites')
       .select(`
         photo_id,
         favorited_at:created_at,
         photo:public_photos_v (
           id, title, thumbnail_url,
           user:user_profiles (id, display_name)
         )
       `, { count: countOpt })
       .eq('user_id', userId)
       .order('created_at', { ascending: false })
       .range(offset, offset + limit - 1);

     const { data, count, error } = await query;

     if (error) throw error;

     return {
       data: data as FavoriteListItemDto[],
       meta: {
         total: count ?? 0,
         limit,
         offset,
         has_more: count ? offset + limit < count : false,
       },
     };
   }
   ```

4. **API Route** (`src/pages/api/users/[userId]/favorites/index.ts`)  
   ```ts
   export const prerender = false;

   import { favoriteQueryParamsSchema } from '@/lib/validators/favorites';
   import { getUserFavorites } from '@/lib/services/favorites';
   import { logApiError } from '@/lib/services/logging';

   export async function GET({ params, request, locals }) {
     try {
       // 1. Auth
       const session = locals.session;
       if (!session) return new Response('Unauthenticated', { status: 401 });

       const { userId } = params;
       if (userId !== session.user.id) {
         return new Response('Forbidden', { status: 403 });
       }

       // 2. Validate query
       const parsed = favoriteQueryParamsSchema.parse(
         Object.fromEntries(new URL(request.url).searchParams),
       );

       // 3. Fetch data
       const result = await getUserFavorites(userId, parsed, locals.supabase);

       return new Response(JSON.stringify(result), { status: 200 });
     } catch (err) {
       if (err instanceof ZodError) {
         return new Response(
           JSON.stringify({ error: { code: 'INVALID_REQUEST', message: err.message } }),
           { status: 400 },
         );
       }
       // Log & generic 500
       await logApiError({ err }, request);
       return new Response('Internal Server Error', { status: 500 });
     }
   }
   ```

5. **Unit Tests** (recommended)  
   - Validator tests for boundary values.  
   - Service integration test (mock Supabase).  

6. **Database**  
   - Ensure index: `CREATE INDEX IF NOT EXISTS favorites_user_created_idx ON favorites (user_id, created_at DESC);`  

7. **Documentation**  
   - Update API reference with new endpoint details + examples.  

8. **Lint & Build**  
   - Run `pnpm lint && pnpm test && pnpm build`.

---

### Estimated Effort
1–2 days (including tests and docs).
