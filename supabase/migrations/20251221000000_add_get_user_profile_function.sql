/*
  migration: add_get_user_profile_function
  description: Creates an RPC function to fetch user profile data including role from auth.users
  
  This function joins user_profiles with auth.users to get the role,
  and counts photos for the user, all in a single database query.
  
  author: PhotoSpot Team
  created_at: 2025-12-21
*/

-- Create function to get user profile with role
CREATE OR REPLACE FUNCTION get_user_profile_with_role(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  company_name TEXT,
  website_url TEXT,
  social_links JSONB,
  role user_role,
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  photo_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.display_name,
    up.avatar_url,
    up.bio,
    up.company_name,
    up.website_url,
    up.social_links,
    (au.raw_user_meta_data->>'role')::user_role AS role,
    up.created_at,
    up.deleted_at,
    COUNT(p.id)::BIGINT AS photo_count
  FROM user_profiles up
  INNER JOIN auth.users au ON au.id = up.user_id
  LEFT JOIN photos p ON p.user_id = up.user_id AND p.deleted_at IS NULL
  WHERE up.user_id = target_user_id
  GROUP BY up.user_id, up.display_name, up.avatar_url, up.bio, up.company_name, up.website_url, up.social_links, au.raw_user_meta_data, up.created_at, up.deleted_at;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_user_profile_with_role IS 'Fetches user profile data including role from auth.users and photo count';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profile_with_role(UUID) TO authenticated, anon;

