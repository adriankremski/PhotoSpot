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
  PhotoDetailDto,
  PhotoStatus,
  UserRole,
  ExifData,
  GearInfo,
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

/**
 * Requester information for authorization checks
 */
export interface Requester {
  id: string;
  role?: UserRole;
}

/**
 * Retrieves a single photo by ID with role-based visibility
 * 
 * This function implements three-tier access control:
 * 1. **Public visitors** (no requester) - Only approved photos, no sensitive fields
 * 2. **Photo owner** - All photos regardless of status, all fields
 * 3. **Moderators** - Same as owner (future enhancement)
 * 
 * Sensitive fields (only visible to owner/moderator):
 * - exif: Camera EXIF metadata
 * - location_exact: Precise GPS coordinates
 * - status: Moderation status
 * 
 * @param photoId - UUID of the photo to retrieve
 * @param requester - Optional authenticated user info for authorization
 * @param supabase - Supabase client instance
 * @returns Promise resolving to PhotoDetailDto
 * @throws PhotoServiceError for various failure scenarios
 */
export async function getPhotoById(
  photoId: string,
  requester: Requester | null,
  supabase: SupabaseClient
): Promise<PhotoDetailDto> {
  try {
    // Build query to fetch photo with related data
    // Join with user_profiles for author info
    // Aggregate favorites count
    // Fetch tags via photo_tags join
    const { data: photo, error } = await supabase
      .from('photos')
      .select(`
        *,
        user_profiles!photos_user_id_fkey (
          user_id,
          display_name,
          avatar_url,
          role
        ),
        photo_tags!inner (
          tags!inner (
            name
          )
        )
      `)
      .eq('id', photoId)
      .is('deleted_at', null)
      .single();

    // Handle query errors
    if (error) {
      // Photo not found or soft-deleted
      if (error.code === 'PGRST116') {
        throw new PhotoServiceError(
          'Photo not found',
          'PHOTO_NOT_FOUND',
          404
        );
      }
      
      throw new PhotoServiceError(
        'Failed to retrieve photo from database',
        'DATABASE_ERROR',
        500,
        { supabaseError: error.message }
      );
    }

    // Photo not found (shouldn't happen with .single() but defensive)
    if (!photo) {
      throw new PhotoServiceError(
        'Photo not found',
        'PHOTO_NOT_FOUND',
        404
      );
    }

    // Determine if requester is the owner
    const isOwner = requester && requester.id === photo.user_id;
    
    // Determine if requester is a moderator (future enhancement)
    // For now, no moderator role exists in the current schema
    // const isModerator = requester && requester.role === 'moderator';
    const isModerator = false;

    // Check authorization for non-approved photos
    // Only owner or moderator can view non-approved photos
    if (photo.status !== 'approved' && !isOwner && !isModerator) {
      throw new PhotoServiceError(
        'You do not have permission to view this photo',
        'FORBIDDEN',
        403
      );
    }

    // Get favorite count for this photo
    const { count: favoriteCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId);

    // Check if current user has favorited this photo
    let isFavorited = false;
    if (requester) {
      const { data: favorite } = await supabase
        .from('favorites')
        .select('photo_id')
        .eq('photo_id', photoId)
        .eq('user_id', requester.id)
        .single();
      
      isFavorited = !!favorite;
    }

    // Extract tags from nested structure
    const tags: string[] = Array.isArray(photo.photo_tags)
      ? photo.photo_tags.map((pt: any) => pt.tags?.name).filter(Boolean)
      : [];

    // Build user basic info
    const userProfile = Array.isArray(photo.user_profiles) 
      ? photo.user_profiles[0] 
      : photo.user_profiles;
      
    const user: UserBasicInfo = {
      id: userProfile?.user_id || photo.user_id,
      display_name: userProfile?.display_name || 'Unknown',
      avatar_url: userProfile?.avatar_url || null,
      role: userProfile?.role as UserRole | undefined,
    };

    // Parse location_public from PostGIS to GeoPoint
    const location_public: GeoPoint = typeof photo.location_public === 'string'
      ? JSON.parse(photo.location_public)
      : photo.location_public as unknown as GeoPoint;

    // Parse location_exact if present
    let location_exact: GeoPoint | undefined;
    if (photo.location_exact) {
      location_exact = typeof photo.location_exact === 'string'
        ? JSON.parse(photo.location_exact)
        : photo.location_exact as unknown as GeoPoint;
    }

    // Parse gear info
    const gear: GearInfo | null = photo.gear as GearInfo | null;

    // Parse EXIF data
    const exif: ExifData | null = photo.exif as ExifData | null;

    // Determine if location is blurred
    // Location is considered blurred if location_exact exists and differs from location_public
    const is_location_blurred = location_exact 
      ? JSON.stringify(location_exact) !== JSON.stringify(location_public)
      : false;

    // Build base DTO (fields visible to everyone)
    const dto: PhotoDetailDto = {
      id: photo.id,
      title: photo.title,
      description: photo.description,
      category: photo.category as PhotoCategory,
      season: photo.season as Season | null,
      time_of_day: photo.time_of_day as TimeOfDay | null,
      file_url: photo.file_url,
      thumbnail_url: photo.file_url, // Using file_url as thumbnail for now
      location_public,
      is_location_blurred,
      gear,
      user,
      tags,
      created_at: photo.created_at,
      favorite_count: favoriteCount || 0,
      is_favorited: isFavorited,
    };

    // Add sensitive fields only for owner/moderator
    if (isOwner || isModerator) {
      dto.exif = exif;
      dto.location_exact = location_exact;
      dto.status = photo.status as PhotoStatus;
    }

    return dto;
  } catch (error) {
    // Re-throw PhotoServiceError as-is
    if (error instanceof PhotoServiceError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new PhotoServiceError(
      'Unexpected error while retrieving photo',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

