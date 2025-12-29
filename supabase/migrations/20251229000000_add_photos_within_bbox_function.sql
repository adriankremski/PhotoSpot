-- Add function to query photos within a bounding box
-- This function efficiently queries photos within a geographic bounding box using PostGIS

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS get_photos_within_bbox(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_category text,
  p_season text,
  p_time_of_day text,
  p_limit integer,
  p_offset integer
);

-- Create function to query photos within bounding box
CREATE OR REPLACE FUNCTION get_photos_within_bbox(
  p_min_lng double precision,
  p_min_lat double precision,
  p_max_lng double precision,
  p_max_lat double precision,
  p_category text DEFAULT NULL,
  p_season text DEFAULT NULL,
  p_time_of_day text DEFAULT NULL,
  p_limit integer DEFAULT 200,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category photo_category,
  season season,
  time_of_day time_of_day,
  file_url text,
  location_public geometry(Point,4326),
  cluster_id bigint,
  created_at timestamptz,
  author_name text,
  author_avatar text,
  favorites_count bigint,
  tags json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.user_id,
    v.title,
    v.description,
    v.category,
    v.season,
    v.time_of_day,
    v.file_url,
    v.location_public,
    v.cluster_id,
    v.created_at,
    v.author_name,
    v.author_avatar,
    v.favorites_count,
    v.tags
  FROM public_photos_v v
  WHERE
    -- Bounding box filter using ST_MakeEnvelope
    ST_Intersects(
      v.location_public::geometry,
      ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
    )
    -- Category filter
    AND (p_category IS NULL OR v.category::text = p_category)
    -- Season filter
    AND (p_season IS NULL OR v.season::text = p_season)
    -- Time of day filter
    AND (p_time_of_day IS NULL OR v.time_of_day::text = p_time_of_day)
  ORDER BY v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_photos_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  integer,
  integer
) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_photos_within_bbox IS 
'Retrieves approved photos within a geographic bounding box with optional filters. 
Uses PostGIS ST_Intersects for efficient spatial queries.';

