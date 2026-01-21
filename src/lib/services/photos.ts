/**
 * Photos service layer
 *
 * Encapsulates photo-related business logic and database interactions.
 * Provides operations for retrieving public photos for map view and galleries.
 */

import * as exifr from "exifr";
import type { SupabaseClient } from "../../db/supabase.client";
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
  CreatePhotoResponse,
} from "../../types";
import { PHOTO_UPLOAD_LIMIT as UPLOAD_LIMIT } from "../../types";
import type { PhotoQueryParamsOutput, CreatePhotoCommandOutput } from "../validators/photos";
import { randomOffsetPoint, createGeoPoint } from "../utils/geo";
import type { ParsedFile } from "../utils/multipart";

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
    this.name = "PhotoServiceError";
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
  const tags: string[] = Array.isArray(row.tags) ? (row.tags as string[]) : [];

  // Build user basic info
  const user: UserBasicInfo = {
    id: row.user_id || "",
    display_name: row.author_name || "Unknown",
    avatar_url: row.author_avatar || null,
  };

  // Parse location_public from PostGIS geometry to GeoPoint
  // The view should return GeoJSON format
  const location_public: GeoPoint =
    typeof row.location_public === "string"
      ? JSON.parse(row.location_public)
      : (row.location_public as unknown as GeoPoint);

  return {
    id: row.id || "",
    title: row.title || "",
    description: row.description || null,
    category: (row.category as PhotoCategory) || "other",
    season: (row.season as Season) || null,
    time_of_day: (row.time_of_day as TimeOfDay) || null,
    file_url: row.file_url || "",
    thumbnail_url: row.file_url || "", // Using file_url as thumbnail for now
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
    const countOption = params.offset === 0 ? "exact" : "planned";

    // Build base query
    let query = supabase.from("public_photos_v").select("*", { count: countOption });

    // If bbox is provided, use the database function for spatial queries
    if (params.bbox) {
      const [minLng, minLat, maxLng, maxLat] = params.bbox;

      // Use RPC to call PostGIS function for efficient spatial queries
      // @ts-expect-error - Custom database function not in generated types
      const result = await supabase.rpc("get_photos_within_bbox", {
        p_min_lng: minLng,
        p_min_lat: minLat,
        p_max_lng: maxLng,
        p_max_lat: maxLat,
        p_category: params.category || null,
        p_season: params.season || null,
        p_time_of_day: params.time_of_day || null,
        p_limit: params.limit,
        p_offset: params.offset,
      });

      console.log("getPublicPhotos result", result);
      if (result.error) {
        throw new PhotoServiceError("Failed to retrieve photos from database", "DATABASE_ERROR", 500, {
          supabaseError: result.error.message,
        });
      }

      // Map rows to DTOs
      const photos = (Array.isArray(result.data) ? result.data : []).map(mapToPhotoListItemDto);

      // Note: RPC functions don't return count, so we estimate
      const total = photos.length;
      const has_more = photos.length === params.limit;

      return {
        data: photos,
        meta: {
          total,
          limit: params.limit,
          offset: params.offset,
          has_more,
        },
      };
    }

    // Apply category filter
    if (params.category) {
      query = query.eq("category", params.category);
    }

    // Apply season filter
    if (params.season) {
      query = query.eq("season", params.season);
    }

    // Apply time of day filter
    if (params.time_of_day) {
      query = query.eq("time_of_day", params.time_of_day);
    }

    // Apply photographer_only filter
    // Note: This would require the view to include role information
    // For now, we'll skip this filter as the view doesn't include role
    // TODO: Update view to include user role if photographer_only filter is needed

    // Apply pagination
    const rangeEnd = params.offset + params.limit - 1;
    query = query.range(params.offset, rangeEnd);

    // Order by created_at descending (newest first)
    query = query.order("created_at", { ascending: false });

    // Execute query
    const { data, error, count } = await query;

    // Handle errors
    if (error) {
      throw new PhotoServiceError("Failed to retrieve photos from database", "DATABASE_ERROR", 500, {
        supabaseError: error.message,
      });
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
    throw new PhotoServiceError("Unexpected error while retrieving photos", "INTERNAL_ERROR", 500, {
      originalError: error instanceof Error ? error.message : String(error),
    });
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
      .from("photos")
      .select(
        `
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
      `
      )
      .eq("id", photoId)
      .is("deleted_at", null)
      .single();

    // Handle query errors
    if (error) {
      // Photo not found or soft-deleted
      if (error.code === "PGRST116") {
        throw new PhotoServiceError("Photo not found", "PHOTO_NOT_FOUND", 404);
      }

      throw new PhotoServiceError("Failed to retrieve photo from database", "DATABASE_ERROR", 500, {
        supabaseError: error.message,
      });
    }

    // Photo not found (shouldn't happen with .single() but defensive)
    if (!photo) {
      throw new PhotoServiceError("Photo not found", "PHOTO_NOT_FOUND", 404);
    }

    // Determine if requester is the owner
    const isOwner = requester && requester.id === photo.user_id;

    // Determine if requester is a moderator (future enhancement)
    // For now, no moderator role exists in the current schema
    // const isModerator = requester && requester.role === 'moderator';
    const isModerator = false;

    // Check authorization for non-approved photos
    // Only owner or moderator can view non-approved photos
    if (photo.status !== "approved" && !isOwner && !isModerator) {
      throw new PhotoServiceError("You do not have permission to view this photo", "FORBIDDEN", 403);
    }

    // Get favorite count for this photo
    const { count: favoriteCount } = await supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("photo_id", photoId);

    // Check if current user has favorited this photo
    let isFavorited = false;
    if (requester) {
      const { data: favorite } = await supabase
        .from("favorites")
        .select("photo_id")
        .eq("photo_id", photoId)
        .eq("user_id", requester.id)
        .single();

      isFavorited = !!favorite;
    }

    // Extract tags from nested structure
    const tags: string[] = Array.isArray(photo.photo_tags)
      ? photo.photo_tags
          .map((pt: { tags?: { name?: string } | null }) => pt.tags?.name)
          .filter((name): name is string => Boolean(name))
      : [];

    // Build user basic info
    const userProfile = Array.isArray(photo.user_profiles) ? photo.user_profiles[0] : photo.user_profiles;

    const user: UserBasicInfo = {
      id: userProfile?.user_id || photo.user_id,
      display_name: userProfile?.display_name || "Unknown",
      avatar_url: userProfile?.avatar_url || null,
      role: userProfile?.role as UserRole | undefined,
    };

    // Parse location_public from PostGIS to GeoPoint
    const location_public: GeoPoint =
      typeof photo.location_public === "string"
        ? JSON.parse(photo.location_public)
        : (photo.location_public as unknown as GeoPoint);

    // Parse location_exact if present
    let location_exact: GeoPoint | undefined;
    if (photo.location_exact) {
      location_exact =
        typeof photo.location_exact === "string"
          ? JSON.parse(photo.location_exact)
          : (photo.location_exact as unknown as GeoPoint);
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
    throw new PhotoServiceError("Unexpected error while retrieving photo", "INTERNAL_ERROR", 500, {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Input data for creating a photo
 */
export interface CreatePhotoInput extends CreatePhotoCommandOutput {
  file: ParsedFile;
}

/**
 * Creates a new photo with upload and metadata processing
 *
 * Implementation steps:
 * 1. Check rate limit (5 photos per 24 hours)
 * 2. Upload file to Supabase Storage
 * 3. Extract EXIF metadata
 * 4. Process location (blur if requested)
 * 5. Insert photo record
 * 6. Handle tags (upsert and link)
 * 7. Return lightweight response
 *
 * @param userId - ID of authenticated user uploading the photo
 * @param input - Photo data and file
 * @param supabase - Supabase client instance
 * @returns Promise resolving to CreatePhotoResponse
 * @throws PhotoServiceError for various failure scenarios
 */
export async function createPhoto(
  userId: string,
  input: CreatePhotoInput,
  supabase: SupabaseClient
): Promise<CreatePhotoResponse> {
  try {
    // Step 1: Check rate limit (defensive check, DB trigger is primary)
    const twentyFourHoursAgo = new Date(Date.now() - UPLOAD_LIMIT.WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const { count: recentPhotoCount, error: countError } = await supabase
      .from("photos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", twentyFourHoursAgo);

    if (countError) {
      throw new PhotoServiceError("Failed to check upload rate limit", "DATABASE_ERROR", 500, {
        supabaseError: countError.message,
      });
    }

    if (recentPhotoCount && recentPhotoCount >= UPLOAD_LIMIT.MAX_PHOTOS) {
      throw new PhotoServiceError(
        `Upload limit exceeded. Maximum ${UPLOAD_LIMIT.MAX_PHOTOS} photos per ${UPLOAD_LIMIT.WINDOW_HOURS} hours.`,
        "RATE_LIMIT_EXCEEDED",
        429
      );
    }

    // Step 2: Upload file to Supabase Storage
    // Generate unique filename: {userId}/{uuid}.{ext}
    const photoId = crypto.randomUUID();
    const fileExt = input.file.name.split(".").pop() || "jpg";
    const storagePath = `${userId}/${photoId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("photos").upload(storagePath, input.file.buffer, {
      contentType: input.file.type,
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadError) {
      throw new PhotoServiceError("Failed to upload file to storage", "STORAGE_ERROR", 500, {
        supabaseError: uploadError.message,
      });
    }

    // Get public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(storagePath);

    // Step 3: Extract EXIF metadata
    let exifData: ExifData | null = null;
    try {
      const rawExif = await exifr.parse(input.file.buffer, {
        pick: ["FNumber", "ExposureTime", "ISO", "FocalLength", "LensModel", "Model", "DateTimeOriginal"],
      });

      if (rawExif) {
        exifData = {
          aperture: rawExif.FNumber ? `f/${rawExif.FNumber}` : undefined,
          shutter_speed: rawExif.ExposureTime ? `1/${Math.round(1 / rawExif.ExposureTime)}` : undefined,
          iso: rawExif.ISO,
          focal_length: rawExif.FocalLength ? `${rawExif.FocalLength}mm` : undefined,
          lens: rawExif.LensModel,
          camera: rawExif.Model,
          date_taken: rawExif.DateTimeOriginal?.toISOString(),
        };
      }
    } catch (exifError) {
      // EXIF extraction is non-critical, log but continue
      console.warn("[createPhoto] EXIF extraction failed:", exifError);
    }

    // Step 4: Process location (blur if requested)
    const location_exact = createGeoPoint(input.latitude, input.longitude);
    let location_public: GeoPoint;

    if (input.blur_location && input.blur_radius) {
      // Apply random offset within blur radius
      const blurred = randomOffsetPoint(input.latitude, input.longitude, input.blur_radius);
      location_public = createGeoPoint(blurred.lat, blurred.lon);
    } else {
      // Use exact location as public location
      location_public = location_exact;
    }

    // Step 5: Insert photo record
    const { data: photo, error: insertError } = await supabase
      .from("photos")
      .insert({
        id: photoId,
        user_id: userId,
        title: input.title,
        description: input.description || null,
        category: input.category as PhotoCategory,
        season: (input.season as Season | undefined) || null,
        time_of_day: (input.time_of_day as TimeOfDay | undefined) || null,
        file_url: publicUrl,
        file_size: input.file.size,
        location_exact: JSON.stringify(location_exact) as unknown as string,
        location_public: JSON.stringify(location_public) as unknown as string,
        gear: (input.gear || null) as unknown as string | null,
        exif: exifData as unknown as string | null,
        status: "pending",
      })
      .select("id, title, status, file_url, created_at")
      .single();

    if (insertError) {
      // Attempt cleanup: delete uploaded file
      await supabase.storage.from("photos").remove([storagePath]);

      // Check for specific database errors
      if (insertError.message.includes("photos_limit")) {
        throw new PhotoServiceError(
          `Upload limit exceeded. Maximum ${UPLOAD_LIMIT.MAX_PHOTOS} photos per ${UPLOAD_LIMIT.WINDOW_HOURS} hours.`,
          "RATE_LIMIT_EXCEEDED",
          429
        );
      }

      throw new PhotoServiceError("Failed to create photo record", "DATABASE_ERROR", 500, {
        supabaseError: insertError.message,
      });
    }

    if (!photo) {
      // Cleanup uploaded file
      await supabase.storage.from("photos").remove([storagePath]);

      throw new PhotoServiceError("Photo record was not created", "DATABASE_ERROR", 500);
    }

    // Step 6: Handle tags (upsert and link)
    if (input.tags && input.tags.length > 0) {
      try {
        // Upsert tags (insert if not exists)
        const { error: tagsError } = await supabase.from("tags").upsert(
          input.tags.map((name) => ({ name })),
          { onConflict: "name", ignoreDuplicates: true }
        );

        if (tagsError) {
          console.error("[createPhoto] Failed to upsert tags:", tagsError);
          // Non-critical, continue
        }

        // Fetch tag IDs
        const { data: tagRecords, error: fetchTagsError } = await supabase
          .from("tags")
          .select("id, name")
          .in("name", input.tags);

        if (fetchTagsError) {
          console.error("[createPhoto] Failed to fetch tag IDs:", fetchTagsError);
          // Non-critical, continue
        }

        // Link tags to photo
        if (tagRecords && tagRecords.length > 0) {
          const { error: linkError } = await supabase.from("photo_tags").insert(
            tagRecords.map((tag) => ({
              photo_id: photoId,
              tag_id: tag.id,
            }))
          );

          if (linkError) {
            console.error("[createPhoto] Failed to link tags:", linkError);
            // Non-critical, continue
          }
        }
      } catch (tagError) {
        // Tags are non-critical, log and continue
        console.error("[createPhoto] Tag processing error:", tagError);
      }
    }

    // Step 7: Return lightweight response
    return {
      message: "Photo uploaded successfully",
      photo: {
        id: photo.id,
        title: photo.title,
        status: photo.status as PhotoStatus,
        file_url: photo.file_url,
        created_at: photo.created_at,
      },
    };
  } catch (error) {
    // Re-throw PhotoServiceError as-is
    if (error instanceof PhotoServiceError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new PhotoServiceError("Unexpected error while creating photo", "INTERNAL_ERROR", 500, {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
