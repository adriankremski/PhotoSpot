# API Endpoint Implementation Plan: Get All Tags (`GET /api/tags`)

## 1. Endpoint Overview

Retrieve the complete list of tags used in PhotoSpot, ordered by their popularity (descending `usage_count`). Each tag entry includes:

- `id`: Primary key of tag
- `name`: Tag label (unique, lowercase)
- `usage_count`: Number of approved photos that reference the tag

The endpoint is **public** (no authentication required) and read-only.

## 2. Request Details

- **HTTP Method**: `GET`
- **URL**: `/api/tags`
- **Query Parameters**: None
- **Headers**: Standard (accept, content-type). No auth header required.
- **Request Body**: _N/A_

## 3. Used Types

| Purpose                       | Type           | File           |
| ----------------------------- | -------------- | -------------- |
| Response DTO for a single tag | `TagDto`       | `src/types.ts` |
| Response wrapper              | `TagsResponse` | `src/types.ts` |
| Supabase row type             | `Tag`          | `src/types.ts` |

No input DTOs/command models are necessary (no parameters).

## 4. Response Details

| Status   | Condition         | Body           |
| -------- | ----------------- | -------------- |
| `200 OK` | Always on success | `TagsResponse` |

```json
{
  "data": [
    { "id": 1, "name": "landscape", "usage_count": 1247 },
    { "id": 2, "name": "portrait", "usage_count": 892 }
  ]
}
```

| `500 Internal Server Error` | Unexpected DB/runtime failure | `ApiError` |

## 5. Data Flow

1. **Route Handler** (`src/pages/api/tags/index.ts`) is invoked by a GET request.
2. Astro supplies `context.locals.supabase` (typed `SupabaseClient`) – already authenticated for the `anon` role.
3. Handler delegates to `TagService.getAllTags()` in `src/lib/services/tags.ts`.
4. `TagService` performs a **single SQL query** via Supabase:
   ```sql
   SELECT t.id, t.name, COUNT(pt.photo_id)::int AS usage_count
   FROM tags t
   LEFT JOIN photo_tags pt ON pt.tag_id = t.id
   LEFT JOIN photos p ON p.id = pt.photo_id AND p.status = 'approved'
   GROUP BY t.id, t.name
   ORDER BY usage_count DESC;
   ```
   _Rationale_: Filters out non-approved photos, counts usage efficiently (index on `photo_tags.tag_id`).
5. Raw rows are mapped to `TagDto[]` (TypeScript type-safe).
6. Handler returns `{ data: tagDtos }` with HTTP 200.
7. Errors are caught, logged (Sentry + console), and surfaced as `ApiError` with HTTP 500.

## 6. Security Considerations

- **RLS**: The `anon` role can `SELECT` from `tags` & `photo_tags`. Ensure RLS on `photos` only allows `status='approved'`; join condition enforces that.
- **SQL Injection**: No dynamic SQL—safe parameterised query via Supabase.
- **Abuse / DoS**: Endpoint is lightweight but add Vercel Edge rate-limiting (existing middleware) to deter abuse.

## 7. Error Handling

| Scenario                 | Status | Message                 | Notes                           |
| ------------------------ | ------ | ----------------------- | ------------------------------- |
| Supabase/network failure | 500    | "Internal server error" | Log error, include `error.code` |
| Unexpected exception     | 500    | "Internal server error" | Catch-all guard                 |

All errors funnel through `handleApiError()` helper (exists in other routes) or create one in `src/lib/utils.ts` if missing.

## 8. Performance Considerations

- **Indexes**: `photo_tags.tag_id` already exists; counts with `GROUP BY` will use it.
- **Query plan caching**: Supabase/Postgres handles.
- **Cold start**: Route is an Edge Function; minimal processing keeps TTFB low.
- Response payload is tiny (<10 KB) even with thousands of tags.

## 9. Implementation Steps

1. **Create Service** `src/lib/services/tags.ts`

   ```ts
   import type { SupabaseClient } from "@/db/supabase.client";
   import type { TagDto } from "@/types";

   export async function getAllTags(supabase: SupabaseClient): Promise<TagDto[]> {
     const { data, error } = await supabase
       .rpc("get_all_tags_with_usage") // see step 2
       .returns<TagDto[]>();
     if (error) throw error;
     return data ?? [];
   }
   ```

   _Alternative_: Use `.from('tags').select(...)` with joins if we don’t add the RPC.

2. **Add SQL RPC / View** (migrations):
   - File: `supabase/migrations/<timestamp>_rpc_get_all_tags_with_usage.sql`

   ```sql
   CREATE OR REPLACE FUNCTION public.get_all_tags_with_usage()
   RETURNS TABLE(id int, name text, usage_count int) LANGUAGE sql STABLE AS $$
     SELECT t.id, t.name, COUNT(pt.photo_id)::int AS usage_count
     FROM tags t
     LEFT JOIN photo_tags pt ON pt.tag_id = t.id
     LEFT JOIN photos p ON p.id = pt.photo_id AND p.status = 'approved'
     GROUP BY t.id, t.name
     ORDER BY usage_count DESC;
   $$;
   -- Grant execute to anon & authenticated
   ALTER FUNCTION public.get_all_tags_with_usage() OWNER TO postgres;
   GRANT EXECUTE ON FUNCTION public.get_all_tags_with_usage() TO anon, authenticated;
   ```

   _Reason_: Keeps API code lean and query tuned inside DB.

3. **Route Handler** `src/pages/api/tags/index.ts`

   ```ts
   import type { APIRoute } from "astro";
   import { getAllTags } from "@/lib/services/tags";
   import type { TagsResponse } from "@/types";
   import { handleApiError } from "@/lib/utils";

   export const prerender = false; // Edge

   export const GET: APIRoute = async (context) => {
     try {
       const supabase = context.locals.supabase;
       const data = await getAllTags(supabase);
       return context.json<TagsResponse>({ data }, 200);
     } catch (err) {
       return handleApiError(err);
     }
   };
   ```

4. **Utilities**
   - Ensure `handleApiError()` exists & conforms to `ApiError` type; if not, create in `src/lib/utils.ts`.
   - Add unit tests in `src/pages/api/auth/__tests__/tags.test.ts` using Vitest & Supabase mock.

5. **Update Tests**
   - Success path returns 200 + ordered array.
   - Failure path (mock Supabase error) returns 500 + error body.

6. **Update Documentation**
   - Add to `README.md` or API spec file.

7. **Run Linters & Tests**
   - `pnpm lint && pnpm test`

8. **Deploy**
   - Run `supabase db push` to apply migration locally.
   - CI applies migration to staging; verify endpoint in Postman.

---

**Estimated Effort**: 2 dev-hours (code) + 0.5 DB migration + 0.5 test & docs.
