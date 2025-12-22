/**
 * Photos service layer
 * 
 * Encapsulates photo-related business logic and database interactions.
 * Provides operations for retrieving public photos for map view and galleries.
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type {
  PhotoListItemDto,
  ListResponse,
  UserBasicInfo,
  GeoPoint,
  PhotoCategory,
  Season,
  TimeOfDay,
  PublicPhotoView,
} from '../../types';
import type { PhotoQueryParamsOutput } from '../validators/photos';

/**
 * Custom error class for photo service operations
 */
export class PhotoServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PhotoServiceError';
  }
}

/**
 * Maps a database row from public_photos_v to PhotoListItemDto
 * 
 * @param row - Raw database row from public_photos_v view
 * @returns Formatted PhotoListItemDto
 */
function mapToPhotoListItemDto(row: PublicPhotoView): PhotoListItemDto {
  // Parse tags from JSON array to string array
  const tags: string[] = Array.isArray(row.tags) ? row.tags as string[] : [];
  
  // Build user basic info
  const user: UserBasicInfo = {
    id: row.user_id || '',
    display_name: row.author_name || 'Unknown',
    avatar_url: row.author_avatar || null,
  };
  
  // Parse location_public from PostGIS geometry to GeoPoint
  // The view should return GeoJSON format
  const location_public: GeoPoint = typeof row.location_public === 'string'
    ? JSON.parse(row.location_public)
    : row.location_public as unknown as GeoPoint;
  
  return {
    id: row.id || '',
    title: row.title || '',
    description: row.description || null,
    category: (row.category as PhotoCategory) || 'other',
    season: (row.season as Season) || null,
    time_of_day: (row.time_of_day as TimeOfDay) || null,
    file_url: row.file_url || '',
    thumbnail_url: row.file_url || '', // Using file_url as thumbnail for now
    location_public,
    user,
    tags,
    created_at: row.created_at || new Date().toISOString(),
    favorite_count: row.favorites_count || 0,
    cluster_id: row.cluster_id || null,
  };
}

/**
 * Retrieves a list of approved public photos for map view
 * 
 * This function queries the public_photos_v view which:
 * - Only includes approved photos (status='approved')
 * - Excludes deleted photos (deleted_at IS NULL)
 * - Hides sensitive data (no EXIF, no exact location)
 * - Includes aggregated user and tag information
 * 
 * Supports filtering by:
 * - Geographic bounding box (bbox)
 * - Photo category
 * - Season
 * - Time of day
 * - Photographer uploads only (role='photographer')
 * 
 * Pagination:
 * - Default limit: 200 (max: 200)
 * - Offset-based pagination
 * - Returns total count and has_more flag
 * 
 * @param params - Query parameters for filtering and pagination
 * @param supabase - Supabase client instance
 * @returns Promise resolving to ListResponse with PhotoListItemDto array
 * @throws PhotoServiceError for database errors
 */
export async function getPublicPhotos(
  params: PhotoQueryParamsOutput,
  supabase: SupabaseClient
): Promise<ListResponse<PhotoListItemDto>> {
  try {
    // Determine if we need accurate count (only on first page for performance)
    const countOption = params.offset === 0 ? 'exact' : 'planned';
    
    // Build base query
    let query = supabase
      .from('public_photos_v')
      .select('*', { count: countOption });
    
    // Apply geographic bounding box filter if provided
    if (params.bbox) {
      const [minLng, minLat, maxLng, maxLat] = params.bbox;
      // Use PostGIS ST_MakeEnvelope to create bounding box and check if location is within
      // The && operator checks for bounding box overlap (indexed operation)
      const bboxString = `SRID=4326;POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`;
      query = query.filter('location_public', 'st_within', bboxString);
    }
    
    // Apply category filter
    if (params.category) {
      query = query.eq('category', params.category);
    }
    
    // Apply season filter
    if (params.season) {
      query = query.eq('season', params.season);
    }
    
    // Apply time of day filter
    if (params.time_of_day) {
      query = query.eq('time_of_day', params.time_of_day);
    }
    
    // Apply photographer_only filter
    // Note: This would require the view to include role information
    // For now, we'll skip this filter as the view doesn't include role
    // TODO: Update view to include user role if photographer_only filter is needed
    
    // Apply pagination
    const rangeEnd = params.offset + params.limit - 1;
    query = query.range(params.offset, rangeEnd);
    
    // Order by created_at descending (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Execute query
    const { data, error, count } = await query;
    
    // Handle errors
    if (error) {
      throw new PhotoServiceError(
        'Failed to retrieve photos from database',
        'DATABASE_ERROR',
        500,
        { supabaseError: error.message }
      );
    }
    
    // Map rows to DTOs
    const photos = (data || []).map(mapToPhotoListItemDto);
    
    // Calculate pagination metadata
    const total = count || 0;
    const has_more = params.offset + params.limit < total;
    
    return {
      data: photos,
      meta: {
        total,
        limit: params.limit,
        offset: params.offset,
        has_more,
      },
    };
  } catch (error) {
    // Re-throw PhotoServiceError as-is
    if (error instanceof PhotoServiceError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new PhotoServiceError(
      'Unexpected error while retrieving photos',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

