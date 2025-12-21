# API Endpoint Implementation Plan: Get Photos (Map View)

## 1. Endpoint Overview
Retrieves a public list of approved photos optimised for a map viewport.  
Only non-sensitive fields are returned (public location, NO EXIF, NO exact location).  
Supports optional filters (bounding box, category, season, time of day, photographer uploads only) and cursor-style pagination (limit/offset ≤ 200).  
The result may include a `cluster_id` hint when more than 50 points fall into the requested viewport.

## 2. Request Details
- HTTP Method: **GET**  
- URL Structure: `/api/photos`  
- Query Parameters:
  - **bbox** `string` – `minLng,minLat,maxLng,maxLat` (optional)
  - **category** `string` (\*PhotoCategory enum, optional)
  - **season** `string` (\*Season enum, optional)
  - **time_of_day** `string` (\*TimeOfDay enum, optional)
  - **photographer_only** `boolean` – return uploads from users whose `role = 'photographer'` (optional)
  - **limit** `integer` – max rows (default 200, max 200)
  - **offset** `integer` – pagination offset (default 0)

> Guard rails
> • Reject unknown params • Enforce positive integers • Validate enums • Validate bbox (4 comma-separated floats within range) • Clamp limit ≤ 200.

## 3. Used Types
1. **PhotoQueryParams** – input DTO defined in `src/types.ts` (will extend with `photographer_only`).
2. **PhotoListItemDto** – each list element.
3. **ListResponse<PhotoListItemDto>** – envelope `{ data, meta }`.
4. **GeoPoint, PaginationMeta, ApiError** – shared support types.

## 4. Response Details
Successful `200 OK`:
```json
{
  "data": [PhotoListItemDto, …],
  "meta": {
    "total": 1547,
    "limit": 200,
    "offset": 0,
    "has_more": true
  }
}
```

Error codes
- **400** Bad Request – invalid bbox / unknown enum / limit>200
- **500** Internal Error – unexpected Server/Supabase problem (logged)

## 5. Data Flow
```
Request → Astro API route /api/photos (GET)
  ↳ Zod validator parses & validates query → typed `PhotoQueryParams`
  ↳ Service `getPublicPhotos(params, supabase)` (in `src/lib/services/photos.ts`)
       • Build PostgREST query on view `public_photos_v`
       • Apply filters, limit, offset
       • Run count=exact for total
  ↳ Map rows → PhotoListItemDto (helper function)
  ↳ Return ListResponse JSON
```

Clustering hint: If `params.limit === 200` AND returned row count == 200 AND total>50, ask Postgres function `cluster_id` (pre-computed) – include field already present; front-end handles display.

## 6. Security Considerations
1. **Public endpoint**: no auth required, but still use RLS-safe view `public_photos_v`.
2. **SQL injection**: rely on PostgREST parameterised query, no string concatenation.
3. **DoS**: enforce `limit<=200`; early return on invalid bbox prevents heavy index scans.
4. **Data leakage**: use `public_photos_v` which hides EXIF & exact coordinates; enforce `status='approved' and deleted_at IS NULL`.
5. **Enumeration**: large `offset` is allowed but still `limit<=200`; consider soft cap of 5 k.
6. **CORS / CSRF**: use Astro default (same-origin JSON); no cookies affected.

## 7. Error Handling
| Scenario | Status | Message | Action |
|----------|--------|---------|--------|
| Invalid bbox string | 400 | `INVALID_BBOX` | Return ApiError, log warn |
| Enum value invalid | 400 | `INVALID_FILTER` | 〃 |
| Limit >200 or <1 | 400 | `INVALID_LIMIT` | 〃 |
| Supabase error | 500 | `DATABASE_ERROR` | log error row in `audit_log` |
| Unexpected exception | 500 | `INTERNAL_ERROR` | 〃 |

Logging strategy
- Use helper `logApiError(details, req)` that writes to `audit_log` with `action='api_error'`, `table_name='public_photos_v'`, `row_data=details`.

## 8. Performance Considerations
1. GIST index on `location_public` already exists → bounding-box filter uses `&&` with PostGIS `ST_MakeEnvelope`.
2. Request without bbox returns latest 200 approved photos (`ORDER BY created_at DESC`) to avoid full scan.
3. Use `select` with `count=exact` only when `offset===0` to reduce cost; otherwise use `count=planned`.
4. Mitigate N+1 by embedding user basic info & tags in view.
5. Response JSON compressed automatically by Vite/Net.

## 9. Implementation Steps
1. **Types**
   - Extend `PhotoQueryParams` with `photographer_only?: boolean` if missing.
2. **Validation** (`src/lib/validators/photos.ts`)
   - Create Zod schema `photoQueryParamsSchema` validating all filters, bbox parser → `[minLng,minLat,maxLng,maxLat]` within valid ranges & `minLng<maxLng, minLat<maxLat`.
3. **Service Layer** (`src/lib/services/photos.ts`)
   - export `getPublicPhotos(params: PhotoQueryParams, supabase: SupabaseClient): Promise<ListResponse<PhotoListItemDto>>`
   - Compose PostgREST query:
     ```ts
     let query = supabase.from('public_photos_v').select('*', { count: countOption })
                      .eq('status', 'approved')
                      .is('deleted_at', null);
     if (params.bbox) { query = query.filter('location_public', 'st_within', `bbox=${bboxString}`) }
     // additional filters ...
     query = query.range(params.offset, params.offset + params.limit - 1)
                  .order('created_at', { ascending: false });
     ```
   - Map DB row → DTO (omit null safety casting).
4. **API Route** (`src/pages/api/photos/index.ts`)
   - `export const prerender = false;`  
   - Handler:
     ```ts
     import { photoQueryParamsSchema } from '@/lib/validators/photos';
     import { getPublicPhotos } from '@/lib/services/photos';

     export async function GET({ request, locals }) {
       try {
         const parsed = photoQueryParamsSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
         const response = await getPublicPhotos(parsed, locals.supabase);
         return new Response(JSON.stringify(response), { status: 200 });
       } catch (err) {
         // ZodError → 400, others → 500
       }
     }
     ```
5. **Validator Tests** – `src/lib/validators/__tests__/photos.test.ts` checking edge cases.
6. **Service Tests** – mock Supabase client; happy path, bbox filter, invalid enum.
7. **Integration Test** – Vitest  `pages/api/photos.test.ts` hitting endpoint with test DB.
8. **Docs** – add to API reference `.ai/api-plan.md` links.
9. **Review & Merge** – run linters, fix issues, push.

---
✅  Plan ready for implementation.
