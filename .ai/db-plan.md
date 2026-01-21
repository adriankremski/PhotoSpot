# PhotoSpot – Database Schema (PostgreSQL + PostGIS)

---

## 1. Tables

### 1.1. `users` – This table is managed by Supabase Auth

| Column          | Type          | Constraints                             | Description                        |
| --------------- | ------------- | --------------------------------------- | ---------------------------------- |
| `id`            | `uuid`        | `PRIMARY KEY DEFAULT gen_random_uuid()` | User ID                            |
| `email`         | `text`        | `NOT NULL UNIQUE`                       | Unique email                       |
| `password_hash` | `text`        | `NOT NULL`                              | Password hash (argon2)             |
| `role`          | `user_role`   | `NOT NULL DEFAULT 'enthusiast'`         | Enum: `photographer`, `enthusiast` |
| `created_at`    | `timestamptz` | `NOT NULL DEFAULT now()`                | Registration date                  |
| `deleted_at`    | `timestamptz` |                                         | Soft-delete timestamp              |

### 1.2. `user_profiles` (1-1 with `users`)

| Column         | Type          | Constraints                                          | Description                   |
| -------------- | ------------- | ---------------------------------------------------- | ----------------------------- |
| `user_id`      | `uuid`        | `PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` | = `users.id`                  |
| `display_name` | `text`        | `NOT NULL`                                           | Display name                  |
| `avatar_url`   | `text`        |                                                      | Avatar URL (Supabase Storage) |
| `company_name` | `text`        |                                                      | Photographers only            |
| `website_url`  | `text`        |                                                      |                               |
| `social_links` | `jsonb`       |                                                      | Array / social media links    |
| `bio`          | `text`        |                                                      |                               |
| `deleted_at`   | `timestamptz` |                                                      |                               |

### 1.3. `photos`

| Column            | Type                    | Constraints                                       | Description                       |
| ----------------- | ----------------------- | ------------------------------------------------- | --------------------------------- |
| `id`              | `uuid`                  | `PRIMARY KEY DEFAULT gen_random_uuid()`           |                                   |
| `user_id`         | `uuid`                  | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | Author                            |
| `title`           | `text`                  | `NOT NULL`                                        |                                   |
| `description`     | `text`                  |                                                   |                                   |
| `category`        | `photo_category`        | `NOT NULL`                                        | Enum                              |
| `season`          | `season`                |                                                   | Enum                              |
| `time_of_day`     | `time_of_day`           |                                                   | Enum                              |
| `file_url`        | `text`                  | `NOT NULL`                                        | Path in Supabase Storage          |
| `file_size`       | `int4`                  | `NOT NULL CHECK (file_size <= 10485760)`          | Bytes (≤10 MB)                    |
| `location_exact`  | `geometry(Point, 4326)` | `NOT NULL`                                        | Exact location                    |
| `location_public` | `geometry(Point, 4326)` | `NOT NULL`                                        | Blurred / public location         |
| `cluster_id`      | `bigint`                |                                                   | Pre-clustering identifier         |
| `exif`            | `jsonb`                 |                                                   | Camera metadata                   |
| `gear`            | `jsonb`                 |                                                   | Gear info                         |
| `status`          | `photo_status`          | `NOT NULL DEFAULT 'pending'`                      | `pending`\|`approved`\|`rejected` |
| `created_at`      | `timestamptz`           | `NOT NULL DEFAULT now()`                          |                                   |
| `deleted_at`      | `timestamptz`           |                                                   |                                   |

### 1.4. `tags`

| Column | Type     | Constraints       |
| ------ | -------- | ----------------- |
| `id`   | `serial` | `PRIMARY KEY`     |
| `name` | `text`   | `NOT NULL UNIQUE` |

### 1.5. `photo_tags` (M-N)

| Column      | Type                   | Constraints                               |
| ----------- | ---------------------- | ----------------------------------------- |
| `photo_id`  | `uuid`                 | `REFERENCES photos(id) ON DELETE CASCADE` |
| `tag_id`    | `int4`                 | `REFERENCES tags(id) ON DELETE CASCADE`   |
| PRIMARY KEY | (`photo_id`, `tag_id`) |                                           |

### 1.6. `favorites`

| Column       | Type                    | Constraints                               |
| ------------ | ----------------------- | ----------------------------------------- |
| `user_id`    | `uuid`                  | `REFERENCES users(id) ON DELETE CASCADE`  |
| `photo_id`   | `uuid`                  | `REFERENCES photos(id) ON DELETE CASCADE` |
| `created_at` | `timestamptz`           | `DEFAULT now()`                           |
| PRIMARY KEY  | (`user_id`, `photo_id`) |                                           |

### 1.7. `photo_reports`

| Column        | Type            | Constraints                                        |
| ------------- | --------------- | -------------------------------------------------- |
| `id`          | `uuid`          | `PRIMARY KEY DEFAULT gen_random_uuid()`            |
| `photo_id`    | `uuid`          | `NOT NULL REFERENCES photos(id) ON DELETE CASCADE` |
| `reporter_id` | `uuid`          | `NOT NULL REFERENCES users(id) ON DELETE CASCADE`  |
| `reason`      | `report_reason` | `NOT NULL`                                         |
| `status`      | `report_status` | `NOT NULL DEFAULT 'open'`                          |
| `comment`     | `text`          |                                                    |
| `created_at`  | `timestamptz`   | `DEFAULT now()`                                    |
| `resolved_at` | `timestamptz`   |                                                    |

### 1.8. `location_cache`

| Column       | Type               | Constraints     | Description              |
| ------------ | ------------------ | --------------- | ------------------------ |
| `query`      | `text`             | `PRIMARY KEY`   | Normalized query         |
| `lat`        | `double precision` | `NOT NULL`      |                          |
| `lon`        | `double precision` | `NOT NULL`      |                          |
| `raw`        | `jsonb`            |                 | Original Mapbox response |
| `updated_at` | `timestamptz`      | `DEFAULT now()` | TTL 30 days              |

### 1.9. `daily_metrics`

| Column             | Type   | Constraints   |
| ------------------ | ------ | ------------- |
| `date`             | `date` | `PRIMARY KEY` |
| `registered_users` | `int4` |               |
| `new_photos`       | `int4` |               |
| `reports`          | `int4` |               |
| …                  |        |               |

### 1.10. `audit_log` _(if we do not use `pg_audit`)_

| Column       | Type          | Constraints     |
| ------------ | ------------- | --------------- | -------------------- |
| `id`         | `bigserial`   | `PRIMARY KEY`   |
| `user_id`    | `uuid`        |                 |
| `table_name` | `text`        |                 |
| `action`     | `text`        |                 | insert/update/delete |
| `row_data`   | `jsonb`       |                 |
| `created_at` | `timestamptz` | `DEFAULT now()` |

---

## 2. Relationships

- `users` 1-1 `user_profiles` (`user_profiles.user_id` → `users.id`)
- `users` 1-N `photos`
- `photos` M-N `tags` via `photo_tags`
- `users` M-N `photos` via `favorites`
- `photos` 1-N `photo_reports`, `users` 1-N `photo_reports`

---

## 3. Indexes

| Table            | Column / Expression               | Type    | Notes                               |
| ---------------- | --------------------------------- | ------- | ----------------------------------- |
| `photos`         | `location_public`                 | `GIST`  | _partial_ WHERE `status='approved'` |
| `photos`         | `(category, season, time_of_day)` | `BTREE` | For filters                         |
| `photos`         | `cluster_id`                      | `BTREE` | Pre-clustering                      |
| `photo_tags`     | `tag_id`                          | `BTREE` | Fast tag filters                    |
| `favorites`      | `user_id`                         | `BTREE` |                                     |
| `photo_reports`  | `status`                          | `BTREE` | Moderation panel                    |
| `location_cache` | `updated_at`                      | `BRIN`  | TTL pruning                         |

---

## 4. RLS Rules (summary)

1. **`users`**  
   • SELECT/UPDATE on own row (`id = auth.uid()`)  
   • Admin / `service_role` – full access

2. **`photos`**  
   • SELECT: everyone sees `status='approved'`  
   • Author sees/edits own photos (any status)  
   • INSERT: only when logged in; trigger limits `5 photos / 24 h`  
   • DELETE/UPDATE: author or moderator

3. **`favorites`**, **`photo_tags`** – access only for owner/author.

4. **`photo_reports`**  
   • INSERT: any logged-in user  
   • SELECT: reporter sees own, moderator sees all  
   • UPDATE: moderator only

5. **View `public_photos_v`** – projection of public columns for role `anon` (no EXIF, `location_exact`).

---

## 5. Additional Notes

- **UUIDs** generated via `gen_random_uuid()` (requires `pgcrypto` extension).
- All tables include `created_at` and `deleted_at` (soft-delete) to comply with GDPR.
- **Triggers**:
  1. `before_insert_photos_limit()` – enforces limit of 5 photos per 24 h.
  2. Automatic copy `location_exact` → blurred `location_public` (±100-500 m) when "blur" selected.
  3. `cascade_soft_delete()` – sets `deleted_at` in dependent records.
- Future plan: partition `photos` by `created_at` (monthly) once >5 M records; background job to compute `cluster_id` and aggregate `daily_metrics`.
