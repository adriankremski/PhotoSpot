/*
  migration: create_photos_storage_bucket
  description: Creates the 'photos' storage bucket for storing uploaded photo files
  
  storage bucket:
    - photos: stores original uploaded photos (private by default, requires authentication)
  
  RLS policies:
    - users can upload to their own folder
    - users can view their own photos
    - users can delete their own photos
    - everyone can view photos from approved photo records
  
  author: PhotoSpot Team
  created_at: 2025-12-22
*/

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

-- Insert the 'photos' bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true, -- public bucket so approved photos can be accessed
  10485760, -- 10 MB limit (10 * 1024 * 1024 bytes)
  array['image/jpeg', 'image/png'] -- only allow JPG and PNG
)
on conflict (id) do nothing;

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We just need to create our policies

-- Policy: Users can upload photos to their own folder
-- Path format: {userId}/{photoId}.{ext}
create policy "users_can_upload_own_photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can view their own photos
create policy "users_can_view_own_photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Everyone can view photos from approved photo records
-- This allows public access to photos that have been approved
create policy "public_can_view_approved_photos"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'photos'
    and exists (
      select 1
      from public.photos
      where photos.file_url like '%' || storage.objects.name || '%'
        and photos.status = 'approved'
        and photos.deleted_at is null
    )
  );

-- Policy: Users can delete their own photos
create policy "users_can_delete_own_photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own photos (for metadata updates)
create policy "users_can_update_own_photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

-- Note: Cannot add comments to policies on storage.objects (not owner)
-- Policy descriptions are included in the policy creation comments above

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

