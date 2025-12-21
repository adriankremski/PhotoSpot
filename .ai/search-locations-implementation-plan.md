# API Endpoint Implementation Plan: Search Locations (`GET /api/locations/search`)

## 1. Endpoint Overview
Public endpoint that lets the client search for geographical locations via Mapbox Geocoding and returns a trimmed, type-safe list of matching places. Results are cached in the `location_cache` table for 30 days to minimise external API calls and latency.

## 2. Request Details
- **HTTP Method:** GET  
- **URL:** `/api/locations/search`
- **Query Parameters**  
  - **Required**  
    - `q` (string) – user-supplied location string (e.g. “Boulder, Colorado”)
  - **Optional**  
    - `limit` (integer, _default 5, max 10_) – max number of items to return

No request body is expected.

## 3. Used Types
From `src/types.ts`  
- `LocationSearchParams` (query DTO)  
- `LocationSearchResultDto` (response item DTO)  
- `LocationSearchResponse` (wrapped response DTO)

## 4. Response Details
```json
Status 200 OK
{
  "data": [LocationSearchResultDto, …],
  "meta": { "cached": boolean }
}
```
Error status codes and bodies:
- **400** – `ApiError` with `code: "INVALID_QUERY"`
- **503** – `ApiError` with `code: "GEO_SERVICE_UNAVAILABLE"`
- **500** – `ApiError` with `code: "INTERNAL_SERVER_ERROR"`

## 5. Data Flow
1. **Validation & Normalisation**  
   - Parse query via **Zod**; trim & `toLowerCase()` the search string.
2. **Read Cache**  
   - `SELECT * FROM location_cache WHERE query = :query LIMIT :limit`  
   - If rows exist **and** `updated_at` ≤ 30 days → return with `meta.cached = true`.
3. **Call Mapbox** (if cache miss/stale)  
   - GET `https://api.mapbox.com/geocoding/v5/mapbox.places/{enc(q)}.json?limit={limit}&access_token=${MAPBOX_TOKEN}`
   - Map response → `LocationSearchResultDto[]`.
4. **Upsert Cache**  
   - `INSERT … ON CONFLICT (query) DO UPDATE …`.
5. **Return** response with `meta.cached = false`.

## 6. Security Considerations
- **No Authentication** required, but:
  - Add simple **rate-limiter** middleware (IP-based, e.g. 30 req / min) to mitigate abuse of Mapbox quota.
  - Escape/encode `q` when calling Mapbox to avoid request-smuggling/injection.
- **Environment Secret:** `MAPBOX_ACCESS_TOKEN` stored in `.env` and referenced via `import.meta.env`.

## 7. Error Handling
| Scenario | Status | Action |
|----------|--------|--------|
| `q` missing / empty | 400 | return `ApiError` (`INVALID_QUERY`) |
| `limit` > 10 or < 1 | 400 | `INVALID_LIMIT` |
| Supabase error | 500 | log via `lib/services/logger.ts` (new / existing) |
| Mapbox 4xx/5xx | 503 | `GEO_SERVICE_UNAVAILABLE`; include retry-after header if present |
| JSON parse / unexpected data | 500 | `INTERNAL_SERVER_ERROR` |

All errors are logged in an `error_logs` table (if present) or using existing logger, with context (endpoint, params, trace id).

## 8. Performance Considerations
- **DB Index** on `location_cache.query` for fast look-ups.
- **expire_at** index (or cron job) to purge >30 day rows.
- **select specific columns** (no `SELECT *`) to reduce bandwidth.
- **HTTP caching:** set `Cache-Control: public,max-age=300` on successful responses (cached or not) to leverage CDN/private caches.

## 9. Implementation Steps
1. **DTO Review**  
   - Confirm `LocationSearchDTOs` exist (already in `types.ts`), extend if needed.
2. **Create Zod Validator** `src/lib/validators/location.ts`  
   ```ts
   export const locationSearchSchema = z.object({
     q: z.string().trim().min(1, 'Query is required'),
     limit: z
       .number()
       .int()
       .positive()
       .max(PAGINATION_DEFAULTS.LOCATION_SEARCH.MAX)
       .default(PAGINATION_DEFAULTS.LOCATION_SEARCH.DEFAULT)
       .optional()
       .transform(val => val ?? PAGINATION_DEFAULTS.LOCATION_SEARCH.DEFAULT),
   });
   export type LocationSearchInput = z.infer<typeof locationSearchSchema>;
   ```
3. **Create Geocoding Service** `src/lib/services/geocoding.ts`
   - `searchLocations(input: LocationSearchInput, supabase: SupabaseClient): Promise<LocationSearchResponse>`
   - Internal helpers:
     - `getCache(query, limit)`
     - `saveCache(query, results)`
     - `fetchFromMapbox(query, limit)`
   - Use `location_cache` Supabase table type alias `LocationCache`.
4. **Add Logger Extension** (if not present), exporting `logError`.
5. **API Route** `src/pages/api/locations/search.ts`
   ```ts
   export const GET: APIRoute = async ({ request, locals, url }) => {
     try {
       const params = locationSearchSchema.parse(Object.fromEntries(url.searchParams));
       const response = await searchLocations(params, locals.supabase);
       return new Response(JSON.stringify(response), { status: 200 });
     } catch (err) {
       // zod validation
       if (err instanceof ZodError) { …400… }
       // Mapbox unavailable
       if (err instanceof GeoServiceError) { …503… }
       …log & 500…
     }
   };
   export const prerender = false;
   ```
6. **Unit Tests** `src/lib/services/geocoding.test.ts`
   - Mock Mapbox and Supabase client.
   - Test cache hit, cache miss, stale cache, invalid params.
7. **Integration Test** `src/pages/api/locations/search.test.ts`
   - Using `supertest` or similar, assert status codes, caching flag.
8. **DB Migration** (if not yet present)  
   ```sql
   CREATE TABLE location_cache (
     id bigint generated by default as identity primary key,
     query text not null,
     results jsonb not null,
     updated_at timestamptz not null default now(),
     constraint uq_location_query UNIQUE (query)
   );
   CREATE INDEX idx_location_updated_at ON location_cache(updated_at);
   ```
9. **Env Configuration**  
   - Add `MAPBOX_ACCESS_TOKEN` to `.env.example`.
10. **Docs & Changelog**  
    - Update API docs and CHANGELOG.
11. **Deploy & Smoke-test**.

