/*
  migration: initial_schema
  description: Creates the complete PhotoSpot database schema including tables, indexes, RLS policies, and triggers
  
  affected tables:
    - user_profiles (new)
    - photos (new)
    - tags (new)
    - photo_tags (new)
    - favorites (new)
    - photo_reports (new)
    - location_cache (new)
    - daily_metrics (new)
    - audit_log (new)
  
  special considerations:
    - uses postgis for geospatial data
    - implements row level security on all tables
    - includes soft-delete via deleted_at timestamps
    - rate limiting via triggers (5 photos per 24h)
    - location privacy via location_exact vs location_public
  
  author: PhotoSpot Team
  created_at: 2025-12-15
*/

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- enable postgis for geospatial functionality
create extension if not exists postgis;

-- enable pgcrypto for uuid generation
create extension if not exists pgcrypto;

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

-- user role: photographer (can upload photos) or enthusiast (can favorite/report)
create type user_role as enum ('photographer', 'enthusiast');

-- photo category for classification
create type photo_category as enum (
  'landscape',
  'portrait',
  'street',
  'architecture',
  'nature',
  'wildlife',
  'macro',
  'aerial',
  'astrophotography',
  'urban',
  'seascape',
  'other'
);

-- season when photo was taken
create type season as enum ('spring', 'summer', 'autumn', 'winter');

-- time of day when photo was taken
create type time_of_day as enum (
  'golden_hour_morning',
  'morning',
  'midday',
  'afternoon',
  'golden_hour_evening',
  'blue_hour',
  'night'
);

-- photo moderation status
create type photo_status as enum ('pending', 'approved', 'rejected');

-- report reason for content moderation
create type report_reason as enum (
  'inappropriate_content',
  'copyright_violation',
  'spam',
  'incorrect_location',
  'private_property',
  'other'
);

-- report status for moderation workflow
create type report_status as enum ('open', 'in_review', 'resolved', 'dismissed');

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1. user_profiles (extends supabase auth.users)
-- ----------------------------------------------------------------------------
-- stores extended user profile information
-- note: auth.users table is managed by supabase auth, this is a 1-1 extension
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  company_name text, -- photographers only
  website_url text,
  social_links jsonb, -- array of social media links
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete for gdpr compliance
);

comment on table user_profiles is 'Extended user profile information (1-1 with auth.users)';
comment on column user_profiles.user_id is 'References auth.users.id';
comment on column user_profiles.company_name is 'Business name for photographers';
comment on column user_profiles.social_links is 'JSON array of social media links';
comment on column user_profiles.deleted_at is 'Soft delete timestamp for GDPR compliance';

-- ----------------------------------------------------------------------------
-- 3.2. photos
-- ----------------------------------------------------------------------------
-- stores uploaded photos with geospatial data and metadata
create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category photo_category not null,
  season season,
  time_of_day time_of_day,
  file_url text not null, -- path in supabase storage
  file_size int4 not null check (file_size > 0 and file_size <= 10485760), -- max 10mb
  location_exact geometry(point, 4326) not null, -- exact gps coordinates (private)
  location_public geometry(point, 4326) not null, -- blurred location for public display
  cluster_id bigint, -- for map clustering
  exif jsonb, -- camera metadata (iso, aperture, shutter speed, etc)
  gear jsonb, -- camera body, lens, accessories
  status photo_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete
);

comment on table photos is 'User-uploaded photos with geospatial data and metadata';
comment on column photos.file_size is 'File size in bytes, max 10MB (10485760 bytes)';
comment on column photos.location_exact is 'Exact GPS coordinates (private, not exposed to public)';
comment on column photos.location_public is 'Blurred location (±100-500m) for public display';
comment on column photos.cluster_id is 'Pre-computed cluster identifier for map performance';
comment on column photos.exif is 'Camera EXIF data (ISO, aperture, shutter speed, focal length, etc)';
comment on column photos.gear is 'Photography gear used (camera body, lens, filters, etc)';
comment on column photos.status is 'Moderation status: pending, approved, or rejected';

-- ----------------------------------------------------------------------------
-- 3.3. tags
-- ----------------------------------------------------------------------------
-- global tag vocabulary for photo tagging
create table tags (
  id serial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

comment on table tags is 'Global tag vocabulary for categorizing photos';
comment on column tags.name is 'Tag name (unique, case-sensitive)';

-- ----------------------------------------------------------------------------
-- 3.4. photo_tags (many-to-many junction table)
-- ----------------------------------------------------------------------------
-- links photos to tags
create table photo_tags (
  photo_id uuid not null references photos(id) on delete cascade,
  tag_id int4 not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, tag_id)
);

comment on table photo_tags is 'Many-to-many relationship between photos and tags';

-- ----------------------------------------------------------------------------
-- 3.5. favorites
-- ----------------------------------------------------------------------------
-- tracks which photos users have favorited
create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid not null references photos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

comment on table favorites is 'User favorites for photos';

-- ----------------------------------------------------------------------------
-- 3.6. photo_reports
-- ----------------------------------------------------------------------------
-- content moderation reports from users
create table photo_reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references photos(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason report_reason not null,
  comment text, -- additional context from reporter
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz, -- when moderator resolved the report
  resolved_by uuid references auth.users(id) -- moderator who resolved
);

comment on table photo_reports is 'Content moderation reports submitted by users';
comment on column photo_reports.comment is 'Additional context provided by the reporter';
comment on column photo_reports.resolved_at is 'Timestamp when a moderator resolved this report';
comment on column photo_reports.resolved_by is 'User ID of moderator who resolved the report';

-- ----------------------------------------------------------------------------
-- 3.7. location_cache
-- ----------------------------------------------------------------------------
-- caches geocoding results from mapbox api
create table location_cache (
  query text primary key, -- normalized location query
  lat double precision not null,
  lon double precision not null,
  raw jsonb, -- original mapbox response
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table location_cache is 'Caches geocoding results from Mapbox API (TTL: 30 days)';
comment on column location_cache.query is 'Normalized location query string';
comment on column location_cache.raw is 'Original JSON response from Mapbox API';
comment on column location_cache.updated_at is 'Used for TTL-based cache invalidation (30 days)';

-- ----------------------------------------------------------------------------
-- 3.8. daily_metrics
-- ----------------------------------------------------------------------------
-- aggregated daily metrics for analytics dashboard
create table daily_metrics (
  date date primary key,
  registered_users int4 default 0,
  new_photos int4 default 0,
  approved_photos int4 default 0,
  rejected_photos int4 default 0,
  reports int4 default 0,
  active_users int4 default 0,
  created_at timestamptz not null default now()
);

comment on table daily_metrics is 'Aggregated daily metrics for analytics dashboard';
comment on column daily_metrics.active_users is 'Number of users who performed any action on this date';

-- ----------------------------------------------------------------------------
-- 3.9. audit_log
-- ----------------------------------------------------------------------------
-- comprehensive audit trail for compliance (alternative to pg_audit)
create table audit_log (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  table_name text not null,
  action text not null, -- insert, update, delete
  row_data jsonb, -- snapshot of affected row
  changed_fields jsonb, -- for updates: old vs new values
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table audit_log is 'Comprehensive audit trail for compliance and security';
comment on column audit_log.action is 'Database action: insert, update, or delete';
comment on column audit_log.row_data is 'Complete snapshot of the affected row';
comment on column audit_log.changed_fields is 'For updates: shows old and new values';

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

-- geospatial index for approved photos (most common query)
-- partial index only for approved photos improves performance
create index idx_photos_location_public_approved 
  on photos using gist(location_public)
  where status = 'approved';

comment on index idx_photos_location_public_approved is 'Geospatial index for map queries (approved photos only)';

-- composite index for common filter combinations
create index idx_photos_filters 
  on photos(category, season, time_of_day)
  where status = 'approved' and deleted_at is null;

comment on index idx_photos_filters is 'Supports filtering by category, season, and time of day';

-- index for map clustering
create index idx_photos_cluster_id 
  on photos(cluster_id)
  where status = 'approved' and deleted_at is null;

comment on index idx_photos_cluster_id is 'Pre-computed clusters for efficient map rendering';

-- index for photo by user queries
create index idx_photos_user_id 
  on photos(user_id, created_at desc)
  where deleted_at is null;

comment on index idx_photos_user_id is 'Fast lookup of photos by user';

-- index for photo status (moderation queue)
create index idx_photos_status 
  on photos(status, created_at desc)
  where deleted_at is null;

comment on index idx_photos_status is 'Moderation queue queries (pending photos)';

-- index for tag filtering
create index idx_photo_tags_tag_id 
  on photo_tags(tag_id);

comment on index idx_photo_tags_tag_id is 'Fast filtering of photos by tag';

-- index for user favorites lookup
create index idx_favorites_user_id 
  on favorites(user_id, created_at desc);

comment on index idx_favorites_user_id is 'Fast lookup of user favorites';

-- index for moderation queue
create index idx_photo_reports_status 
  on photo_reports(status, created_at desc);

comment on index idx_photo_reports_status is 'Moderation panel queries (open reports first)';

-- brin index for cache ttl cleanup
create index idx_location_cache_updated_at 
  on location_cache using brin(updated_at);

comment on index idx_location_cache_updated_at is 'Efficient TTL-based cleanup (30 day expiration)';

-- index for audit log queries
create index idx_audit_log_user_id 
  on audit_log(user_id, created_at desc);

create index idx_audit_log_table_action 
  on audit_log(table_name, action, created_at desc);

comment on index idx_audit_log_user_id is 'Lookup audit trail by user';
comment on index idx_audit_log_table_action is 'Lookup audit trail by table and action';

-- ============================================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1. Photo upload rate limiting (5 photos per 24 hours)
-- ----------------------------------------------------------------------------
create or replace function check_photo_upload_limit()
returns trigger as $$
declare
  upload_count int;
begin
  -- count photos uploaded by this user in the last 24 hours
  select count(*)
  into upload_count
  from photos
  where user_id = new.user_id
    and created_at > now() - interval '24 hours'
    and deleted_at is null;
  
  -- enforce limit of 5 photos per 24 hours
  if upload_count >= 5 then
    raise exception 'Upload limit exceeded: maximum 5 photos per 24 hours';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

comment on function check_photo_upload_limit is 'Enforces rate limit of 5 photo uploads per 24 hours per user';

create trigger before_insert_photos_limit
  before insert on photos
  for each row
  execute function check_photo_upload_limit();

-- ----------------------------------------------------------------------------
-- 5.2. Blur location for privacy
-- ----------------------------------------------------------------------------
create or replace function blur_location()
returns trigger as $$
declare
  -- random offset between 100-500 meters
  offset_meters float := 100 + random() * 400;
  -- random angle in radians
  angle float := random() * 2 * pi();
  -- earth radius in meters
  earth_radius float := 6371000;
begin
  -- if location_public is not explicitly set, blur the exact location
  if new.location_public is null then
    -- calculate offset in degrees (approximate)
    new.location_public := st_translate(
      new.location_exact,
      (offset_meters * cos(angle)) / (earth_radius * cos(radians(st_y(new.location_exact))) * pi() / 180),
      (offset_meters * sin(angle)) / (earth_radius * pi() / 180)
    );
  end if;
  
  return new;
end;
$$ language plpgsql;

comment on function blur_location is 'Automatically blurs exact location by ±100-500m for privacy';

create trigger before_insert_photos_blur_location
  before insert on photos
  for each row
  execute function blur_location();

-- ----------------------------------------------------------------------------
-- 5.3. Update timestamp triggers
-- ----------------------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at is 'Automatically updates updated_at timestamp on row modification';

create trigger update_user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_updated_at();

create trigger update_photos_updated_at
  before update on photos
  for each row
  execute function update_updated_at();

create trigger update_location_cache_updated_at
  before update on location_cache
  for each row
  execute function update_updated_at();

-- ----------------------------------------------------------------------------
-- 5.4. Cascade soft delete to related records
-- ----------------------------------------------------------------------------
create or replace function cascade_soft_delete_photo()
returns trigger as $$
begin
  -- when a photo is soft-deleted, also soft-delete related reports
  if new.deleted_at is not null and old.deleted_at is null then
    update photo_reports
    set resolved_at = new.deleted_at,
        status = 'resolved'
    where photo_id = new.id
      and status in ('open', 'in_review');
  end if;
  
  return new;
end;
$$ language plpgsql;

comment on function cascade_soft_delete_photo is 'Auto-resolves reports when parent photo is soft-deleted';

create trigger cascade_soft_delete_photo_trigger
  after update on photos
  for each row
  when (new.deleted_at is not null and old.deleted_at is null)
  execute function cascade_soft_delete_photo();

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1. public_photos_v - safe public view of photos
-- ----------------------------------------------------------------------------
-- exposes only approved photos with limited columns (no exif, no exact location)
create or replace view public_photos_v as
select
  p.id,
  p.user_id,
  p.title,
  p.description,
  p.category,
  p.season,
  p.time_of_day,
  p.file_url,
  p.location_public, -- only public (blurred) location
  p.cluster_id,
  p.created_at,
  -- join with user profile for display
  up.display_name as author_name,
  up.avatar_url as author_avatar,
  -- aggregate favorites count
  (select count(*) from favorites f where f.photo_id = p.id) as favorites_count,
  -- aggregate tags
  (
    select json_agg(json_build_object('id', t.id, 'name', t.name))
    from photo_tags pt
    join tags t on t.id = pt.tag_id
    where pt.photo_id = p.id
  ) as tags
from photos p
left join user_profiles up on up.user_id = p.user_id
where p.status = 'approved'
  and p.deleted_at is null
  and up.deleted_at is null;

comment on view public_photos_v is 'Safe public view of approved photos (excludes EXIF and exact location)';

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1. user_profiles
-- ----------------------------------------------------------------------------
alter table user_profiles enable row level security;

-- anon users can view all public profiles
create policy "anon_can_view_profiles"
  on user_profiles
  for select
  to anon
  using (deleted_at is null);

-- authenticated users can view all profiles
create policy "authenticated_can_view_profiles"
  on user_profiles
  for select
  to authenticated
  using (deleted_at is null);

-- users can update their own profile
create policy "users_can_update_own_profile"
  on user_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- users can insert their own profile (on registration)
create policy "users_can_insert_own_profile"
  on user_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- users can soft-delete their own profile
create policy "users_can_delete_own_profile"
  on user_profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy "anon_can_view_profiles" on user_profiles is 'Anonymous users can view all public profiles';
comment on policy "authenticated_can_view_profiles" on user_profiles is 'Authenticated users can view all profiles';
comment on policy "users_can_update_own_profile" on user_profiles is 'Users can only update their own profile';
comment on policy "users_can_insert_own_profile" on user_profiles is 'Users can create their own profile on registration';
comment on policy "users_can_delete_own_profile" on user_profiles is 'Users can delete their own profile';

-- ----------------------------------------------------------------------------
-- 7.2. photos
-- ----------------------------------------------------------------------------
alter table photos enable row level security;

-- anon users can view approved photos
create policy "anon_can_view_approved_photos"
  on photos
  for select
  to anon
  using (status = 'approved' and deleted_at is null);

-- authenticated users can view approved photos
create policy "authenticated_can_view_approved_photos"
  on photos
  for select
  to authenticated
  using (status = 'approved' and deleted_at is null);

-- authors can view their own photos (any status)
create policy "authors_can_view_own_photos"
  on photos
  for select
  to authenticated
  using (user_id = auth.uid());

-- authenticated users can insert photos
create policy "authenticated_can_insert_photos"
  on photos
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- authors can update their own photos
create policy "authors_can_update_own_photos"
  on photos
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- authors can delete their own photos
create policy "authors_can_delete_own_photos"
  on photos
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy "anon_can_view_approved_photos" on photos is 'Anonymous users can only view approved photos';
comment on policy "authenticated_can_view_approved_photos" on photos is 'Authenticated users can view approved photos';
comment on policy "authors_can_view_own_photos" on photos is 'Photo authors can view their own photos (any status)';
comment on policy "authenticated_can_insert_photos" on photos is 'Authenticated users can upload photos';
comment on policy "authors_can_update_own_photos" on photos is 'Photo authors can update their own photos';
comment on policy "authors_can_delete_own_photos" on photos is 'Photo authors can delete their own photos';

-- ----------------------------------------------------------------------------
-- 7.3. tags
-- ----------------------------------------------------------------------------
alter table tags enable row level security;

-- everyone can view tags
create policy "anon_can_view_tags"
  on tags
  for select
  to anon
  using (true);

create policy "authenticated_can_view_tags"
  on tags
  for select
  to authenticated
  using (true);

-- only authenticated users can create tags (when tagging their photos)
create policy "authenticated_can_insert_tags"
  on tags
  for insert
  to authenticated
  with check (true);

comment on policy "anon_can_view_tags" on tags is 'Anonymous users can view all tags';
comment on policy "authenticated_can_view_tags" on tags is 'Authenticated users can view all tags';
comment on policy "authenticated_can_insert_tags" on tags is 'Authenticated users can create new tags';

-- ----------------------------------------------------------------------------
-- 7.4. photo_tags
-- ----------------------------------------------------------------------------
alter table photo_tags enable row level security;

-- anon users can view tags for approved photos
create policy "anon_can_view_photo_tags"
  on photo_tags
  for select
  to anon
  using (
    exists (
      select 1 from photos
      where photos.id = photo_tags.photo_id
        and photos.status = 'approved'
        and photos.deleted_at is null
    )
  );

-- authenticated users can view tags for approved photos
create policy "authenticated_can_view_photo_tags"
  on photo_tags
  for select
  to authenticated
  using (
    exists (
      select 1 from photos
      where photos.id = photo_tags.photo_id
        and photos.status = 'approved'
        and photos.deleted_at is null
    )
  );

-- photo authors can view tags on their own photos
create policy "authors_can_view_own_photo_tags"
  on photo_tags
  for select
  to authenticated
  using (
    exists (
      select 1 from photos
      where photos.id = photo_tags.photo_id
        and photos.user_id = auth.uid()
    )
  );

-- photo authors can tag their own photos
create policy "authors_can_insert_photo_tags"
  on photo_tags
  for insert
  to authenticated
  with check (
    exists (
      select 1 from photos
      where photos.id = photo_tags.photo_id
        and photos.user_id = auth.uid()
    )
  );

-- photo authors can remove tags from their own photos
create policy "authors_can_delete_photo_tags"
  on photo_tags
  for delete
  to authenticated
  using (
    exists (
      select 1 from photos
      where photos.id = photo_tags.photo_id
        and photos.user_id = auth.uid()
    )
  );

comment on policy "anon_can_view_photo_tags" on photo_tags is 'Anonymous users can view tags on approved photos';
comment on policy "authenticated_can_view_photo_tags" on photo_tags is 'Authenticated users can view tags on approved photos';
comment on policy "authors_can_view_own_photo_tags" on photo_tags is 'Photo authors can view tags on their own photos';
comment on policy "authors_can_insert_photo_tags" on photo_tags is 'Photo authors can tag their own photos';
comment on policy "authors_can_delete_photo_tags" on photo_tags is 'Photo authors can remove tags from their own photos';

-- ----------------------------------------------------------------------------
-- 7.5. favorites
-- ----------------------------------------------------------------------------
alter table favorites enable row level security;

-- users can view their own favorites
create policy "users_can_view_own_favorites"
  on favorites
  for select
  to authenticated
  using (user_id = auth.uid());

-- users can favorite photos
create policy "users_can_insert_favorites"
  on favorites
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from photos
      where photos.id = favorites.photo_id
        and photos.status = 'approved'
        and photos.deleted_at is null
    )
  );

-- users can unfavorite photos
create policy "users_can_delete_favorites"
  on favorites
  for delete
  to authenticated
  using (user_id = auth.uid());

comment on policy "users_can_view_own_favorites" on favorites is 'Users can view their own favorites';
comment on policy "users_can_insert_favorites" on favorites is 'Users can favorite approved photos';
comment on policy "users_can_delete_favorites" on favorites is 'Users can unfavorite photos';

-- ----------------------------------------------------------------------------
-- 7.6. photo_reports
-- ----------------------------------------------------------------------------
alter table photo_reports enable row level security;

-- reporters can view their own reports
create policy "reporters_can_view_own_reports"
  on photo_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

-- authenticated users can submit reports
create policy "authenticated_can_insert_reports"
  on photo_reports
  for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1 from photos
      where photos.id = photo_reports.photo_id
        and photos.deleted_at is null
    )
  );

comment on policy "reporters_can_view_own_reports" on photo_reports is 'Users can view reports they submitted';
comment on policy "authenticated_can_insert_reports" on photo_reports is 'Authenticated users can report photos';

-- note: moderator policies would be added later with a moderator role

-- ----------------------------------------------------------------------------
-- 7.7. location_cache (service role only)
-- ----------------------------------------------------------------------------
alter table location_cache enable row level security;

-- no public access - only service role can read/write
-- this prevents users from seeing cached location data or polluting the cache

comment on table location_cache is 'Internal cache - no public RLS policies (service role only)';

-- ----------------------------------------------------------------------------
-- 7.8. daily_metrics (read-only for authenticated users)
-- ----------------------------------------------------------------------------
alter table daily_metrics enable row level security;

-- authenticated users can view metrics
create policy "authenticated_can_view_metrics"
  on daily_metrics
  for select
  to authenticated
  using (true);

comment on policy "authenticated_can_view_metrics" on daily_metrics is 'Authenticated users can view aggregated metrics';

-- note: insert/update policies would be for service role or background jobs

-- ----------------------------------------------------------------------------
-- 7.9. audit_log (no public access)
-- ----------------------------------------------------------------------------
alter table audit_log enable row level security;

-- no public policies - audit log is for admin/compliance only
-- service role has full access by default

comment on table audit_log is 'Admin-only audit trail (service role only)';

-- ============================================================================
-- 8. GRANTS
-- ============================================================================

-- grant usage on schemas
grant usage on schema public to anon, authenticated;

-- grant access to all tables for authenticated users (RLS still applies)
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- grant select on safe tables for anon users (RLS still applies)
grant select on user_profiles, photos, tags, photo_tags to anon;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

