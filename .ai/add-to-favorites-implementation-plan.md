# API Endpoint Implementation Plan: Add Photo to Favorites

## 1. Endpoint Overview

Create an authenticated endpoint that lets a user add a published photo to their list of favorites. The endpoint ensures that only the owner of the favorites list can perform the action, validates the photo, prevents duplicates, and returns the newly-created `favorite` record.

## 2. Request Details

- **HTTP Method**: `POST`
- **URL Pattern**: `/api/users/:userId/favorites/:photoId`
- **Path Parameters**
  - **Required**
    - `userId` (string, UUID-v4) – ID of the authenticated user whose favorites list is being modified.
    - `photoId` (string, UUID-v4) – ID of the photo to favorite.
  - **Optional**: none
- **Query Parameters**: none
- **Request Body**: empty (all data supplied via URL)
- **Authentication**: Supabase Auth session cookie / bearer; user must match `userId`.

## 3. Used Types

- `AddFavoriteResponse` (defined in `src/types.ts`)
- `ApiError` (shared error DTO)
- Supabase table types
  - `FavoriteInsert` (alias for `TablesInsert<'favorites'>`)
  - `Photo` (alias for `Tables<'photos'>`)

## 4. Response Details

| Status                    | Description                           | Schema                |
| ------------------------- | ------------------------------------- | --------------------- |
| 201 Created               | Photo successfully added to favorites | `AddFavoriteResponse` |
| 401 Unauthorized          | No valid session                      | `ApiError`            |
| 403 Forbidden             | Authenticated user ≠ `userId`         | `ApiError`            |
| 404 Not Found             | Photo not found or not approved       | `ApiError`            |
| 409 Conflict              | Photo already in favorites            | `ApiError`            |
| 500 Internal Server Error | Unexpected error                      | `ApiError`            |

Successful payload example:

```json
{
  "message": "Photo added to favorites",
  "favorite": {
    "user_id": "uuid",
    "photo_id": "uuid",
    "created_at": "2025-12-16T10:30:00Z"
  }
}
```

## 5. Data Flow

1. **Client** sends `POST /api/users/{userId}/favorites/{photoId}` with valid auth cookie or bearer token.
2. **Middleware** populates `locals.supabase` and `locals.user` (`AuthUser`).
3. **Endpoint handler**:
   1. Validate path params with Zod.
   2. Ensure `locals.user` exists. If not → 401.
   3. Compare `locals.user.id` and `userId`. If mismatch → 403.
   4. Query `photos` table for `photoId` and `status = 'approved'` (visibility requirement). If not found → 404.
   5. Attempt insert into `favorites` table `{ user_id: userId, photo_id: photoId }`.
      - If unique constraint violation → 409.
   6. Return 201 with inserted row.
4. **Supabase** row-level security guarantees user can only insert their own `user_id`, but we still check manually.
5. **Audit / Metrics**: Optionally write to `audit_log` for analytics.

## 6. Security Considerations

1. **Authentication**: Required via Supabase session; enforce in middleware.
2. **Authorization**: User can only modify their own favorites (`userId === authUser.id`).
3. **Input Validation**: Zod schemas ensure UUID format; defend against path-parameter tampering.
4. **Duplicate insert**: Handled with DB unique key `(user_id, photo_id)` and conflict handling.
5. **RLS**: Make sure `favorites` table RLS allows inserts only by row owner.
6. **Rate Limiting** (optional): Mitigate abuse—e.g., 10 favorites / minute / IP.
7. **SQL Injection**: Supabase client uses parameterized queries.

## 7. Error Handling

| Scenario                        | HTTP | Message                              | Notes                                                        |
| ------------------------------- | ---- | ------------------------------------ | ------------------------------------------------------------ |
| No auth session                 | 401  | "Not authenticated"                  | Triggered by missing `locals.user`                           |
| UserId ≠ auth user              | 403  | "Adding to another user's favorites" |
| Photo not found or not approved | 404  | "Photo not found"                    |
| Already favorited               | 409  | "Photo already in favorites"         | Detect via `PostgREST` error code `23505` (unique_violation) |
| Database / unexpected           | 500  | "Internal Server Error"              | Log to server console + (optional) `audit_log`               |

## 8. Performance Considerations

- **Indexes**: ensure `favorites (user_id, photo_id)` is primary/unique; already present.
- **Photo existence query**: use primary key lookup – index on `photos.id`.
- **Minimal payload**: return only needed fields.
- **Batching**: n/a – single row.

## 9. Implementation Steps

1. **Create Endpoint File** `src/pages/api/users/[userId]/favorites/[photoId].ts`.
2. **Import Helpers**
   - `z` from `zod`
   - `AddFavoriteResponse`, `ApiError`
   - `createSupabaseServerClient` or use `Astro.locals.supabase`.
3. **Define Param Schema**

```ts
const ParamsSchema = z.object({
  userId: z.string().uuid(),
  photoId: z.string().uuid(),
});
```

4. **Export `POST` Handler**

```ts
export async function POST(context: APIContext): Promise<Response> {
  // 1. Validate params
  const parse = ParamsSchema.safeParse(context.params);
  if (!parse.success)
    return context.json<APIError>({ error: { code: "invalid_params", message: "Invalid IDs" } }, { status: 400 });
  const { userId, photoId } = parse.data;

  // 2. Auth check
  const { user } = context.locals;
  if (!user)
    return context.json<APIError>({ error: { code: "unauthorized", message: "Not authenticated" } }, { status: 401 });
  if (user.id !== userId)
    return context.json<APIError>(
      { error: { code: "forbidden", message: "Adding to another user's favorites" } },
      { status: 403 }
    );

  const supabase = context.locals.supabase as SupabaseClient;

  // 3. Verify photo exists & approved
  const { data: photo } = await supabase
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("status", "approved")
    .single();
  if (!photo)
    return context.json<APIError>({ error: { code: "not_found", message: "Photo not found" } }, { status: 404 });

  // 4. Insert favorite
  const insert: FavoriteInsert = { user_id: userId, photo_id: photoId };
  const { data: favorite, error } = await supabase.from("favorites").insert(insert).select("*").single();
  if (error) {
    if (error.code === "23505")
      return context.json<APIError>(
        { error: { code: "conflict", message: "Photo already in favorites" } },
        { status: 409 }
      );
    console.error("Add favorite error", error);
    return context.json<APIError>(
      { error: { code: "server_error", message: "Internal Server Error" } },
      { status: 500 }
    );
  }

  return context.json<AddFavoriteResponse>({ message: "Photo added to favorites", favorite }, { status: 201 });
}
```

5. **Unit Tests** (if test framework present):
   - Valid add favorite
   - Duplicate favorite → 409
   - Non-owner → 403
   - Missing auth → 401
6. **Update RLS Policy (SQL)**

```sql
-- Allow insert if authenticated user matches user_id
CREATE POLICY "Users can favorite photos" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

7. **API Documentation**: add to OpenAPI or MD docs.
8. **Changelog**: record new endpoint.

---

**File Location**: `.ai/add-to-favorites-implementation-plan.md`
