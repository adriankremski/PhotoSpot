/**
 * DTO (Data Transfer Object) and Command Model Types for PhotoSpot API
 *
 * This file contains all type definitions for API requests and responses,
 * derived from the database models in database.types.ts
 */

import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from "./db/database.types";

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

export type Photo = Tables<"photos">;
export type PhotoInsert = TablesInsert<"photos">;
export type PhotoUpdate = TablesUpdate<"photos">;

export type UserProfile = Tables<"user_profiles">;
export type UserProfileInsert = TablesInsert<"user_profiles">;
export type UserProfileUpdate = TablesUpdate<"user_profiles">;

export type Favorite = Tables<"favorites">;
export type FavoriteInsert = TablesInsert<"favorites">;

export type PhotoReport = Tables<"photo_reports">;
export type PhotoReportInsert = TablesInsert<"photo_reports">;
export type PhotoReportUpdate = TablesUpdate<"photo_reports">;

export type Tag = Tables<"tags">;
export type PhotoTag = Tables<"photo_tags">;

export type LocationCache = Tables<"location_cache">;

export type PublicPhotoView = Tables<"public_photos_v">;

// ============================================================================
// Enum Type Aliases
// ============================================================================

export type PhotoCategory = Enums<"photo_category">;
export type PhotoStatus = Enums<"photo_status">;
export type ReportReason = Enums<"report_reason">;
export type ReportStatus = Enums<"report_status">;
export type Season = Enums<"season">;
export type TimeOfDay = Enums<"time_of_day">;
export type UserRole = Enums<"user_role">;

// ============================================================================
// Common Types
// ============================================================================

/**
 * GeoJSON Point representation for location data
 */
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Bounding box for map viewport queries: [minLng, minLat, maxLng, maxLat]
 */
export type BoundingBox = [number, number, number, number];

/**
 * Social media links structure for photographer profiles
 */
export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  [key: string]: string | undefined;
}

/**
 * Camera gear information
 */
export interface GearInfo {
  camera?: string;
  lens?: string;
  [key: string]: string | undefined;
}

/**
 * EXIF metadata extracted from photos
 */
export interface ExifData {
  aperture?: string;
  shutter_speed?: string;
  iso?: number;
  focal_length?: string;
  camera?: string;
  lens?: string;
  date_taken?: string;
  [key: string]: string | number | undefined;
}

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  has_more?: boolean;
}

/**
 * Standard API response wrapper for lists
 */
export interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Standard error response structure
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// AUTHENTICATION DTOs (Section 3)
// ============================================================================

/**
 * User registration request payload
 */
export interface RegisterUserCommand {
  email: string;
  password: string;
  role: UserRole;
}

/**
 * User login request payload
 */
export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Password reset request payload
 */
export interface PasswordResetCommand {
  email: string;
}

/**
 * Auth session response (from Supabase Auth)
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Authenticated user data
 */
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    role?: UserRole;
    [key: string]: unknown;
  };
}

/**
 * Complete auth response with user and session
 */
export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

// ============================================================================
// PROFILE DTOs (Section 4)
// ============================================================================

/**
 * Minimal user information for embedding in other responses
 */
export interface UserBasicInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role?: UserRole;
}

/**
 * Complete user profile response (GET /api/users/:userId/profile)
 * Includes all fields for photographers, limited fields for enthusiasts
 */
export interface UserProfileDto {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  // Photographer-only fields
  company_name?: string | null;
  website_url?: string | null;
  social_links?: SocialLinks | null;
  // Computed fields
  photo_count?: number;
  created_at: string;
}

/**
 * Create user profile request payload (POST /api/users/:userId/profile)
 * Used for initial profile setup after registration
 */
export interface CreateProfileCommand {
  display_name: string; // required
  avatar_url?: string;
  bio?: string;
  // Photographer-only fields
  company_name?: string;
  website_url?: string;
  social_links?: SocialLinks;
}

/**
 * Profile creation response
 */
export interface CreateProfileResponse {
  message: string;
  profile: UserProfileDto;
}

/**
 * Update user profile request payload (PATCH /api/users/:userId/profile)
 * All fields optional for partial updates
 */
export interface UpdateProfileCommand {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  company_name?: string;
  website_url?: string;
  social_links?: SocialLinks;
}

/**
 * Profile update response
 */
export interface UpdateProfileResponse {
  message: string;
  profile: UserProfileDto;
}

// ============================================================================
// PHOTO DTOs (Section 5)
// ============================================================================

/**
 * Photo list item for map view and galleries (GET /api/photos)
 * Excludes sensitive data like EXIF and exact location
 */
export interface PhotoListItemDto {
  id: string;
  title: string;
  description: string | null;
  category: PhotoCategory;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  file_url: string;
  thumbnail_url: string;
  location_public: GeoPoint;
  is_location_blurred?: boolean;
  user: UserBasicInfo;
  tags: string[];
  created_at: string;
  favorite_count: number;
  cluster_id?: number | null;
}

/**
 * Complete photo details response (GET /api/photos/:photoId)
 * Includes owner-only fields when authenticated as owner
 */
export interface PhotoDetailDto {
  id: string;
  title: string;
  description: string | null;
  category: PhotoCategory;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  file_url: string;
  thumbnail_url?: string;
  location_public: GeoPoint;
  is_location_blurred?: boolean;
  gear: GearInfo | null;
  // Owner-only fields
  exif?: ExifData | null;
  location_exact?: GeoPoint;
  status?: PhotoStatus;
  // Relations
  user: UserBasicInfo;
  tags: string[];
  created_at: string;
  favorite_count: number;
  is_favorited?: boolean;
}

/**
 * Create photo request payload (POST /api/photos)
 * Used with multipart/form-data
 */
export interface CreatePhotoCommand {
  file: File | Blob;
  title: string;
  description?: string;
  category: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  latitude: number;
  longitude: number;
  blur_location?: boolean;
  blur_radius?: number; // 100-500 meters
  tags?: string[];
  gear?: GearInfo;
}

/**
 * Create photo response (201 Created)
 */
export interface CreatePhotoResponse {
  message: string;
  photo: {
    id: string;
    title: string;
    status: PhotoStatus;
    file_url: string;
    created_at: string;
  };
}

/**
 * Update photo request payload (PATCH /api/photos/:photoId)
 * All fields optional for partial updates
 */
export interface UpdatePhotoCommand {
  title?: string;
  description?: string;
  category?: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  tags?: string[];
  gear?: GearInfo;
}

/**
 * Update photo response
 */
export interface UpdatePhotoResponse {
  message: string;
  photo: PhotoDetailDto;
}

/**
 * Delete photo response
 */
export interface DeletePhotoResponse {
  message: string;
}

/**
 * User's photo list item (GET /api/users/:userId/photos)
 * Simplified view for gallery display
 */
export interface UserPhotoListItemDto {
  id: string;
  title: string;
  thumbnail_url: string;
  category: PhotoCategory;
  status?: PhotoStatus; // Only visible to owner/moderator
  created_at: string;
  favorite_count: number;
}

/**
 * Moderate photo request (PATCH /api/photos/:photoId/status)
 */
export interface ModeratePhotoCommand {
  status: "approved" | "rejected";
  reason?: string;
}

/**
 * Moderate photo response
 */
export interface ModeratePhotoResponse {
  message: string;
  photo: {
    id: string;
    status: PhotoStatus;
  };
}

/**
 * Query parameters for photo list endpoints
 */
export interface PhotoQueryParams {
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  category?: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  photographer_only?: boolean;
  tag?: string;
  limit?: number;
  offset?: number;
  status?: PhotoStatus; // Owner/moderator only
}

// ============================================================================
// FAVORITES DTOs (Section 6)
// ============================================================================

/**
 * Favorite list item (GET /api/users/:userId/favorites)
 */
export interface FavoriteListItemDto {
  photo_id: string;
  photo: {
    id: string;
    title: string;
    thumbnail_url: string;
    user: UserBasicInfo;
  };
  favorited_at: string;
}

/**
 * Add to favorites response (POST /api/users/:userId/favorites/:photoId)
 */
export interface AddFavoriteResponse {
  message: string;
  favorite: {
    user_id: string;
    photo_id: string;
    created_at: string;
  };
}

/**
 * Remove from favorites response
 */
export interface RemoveFavoriteResponse {
  message: string;
}

// ============================================================================
// REPORT DTOs (Section 7)
// ============================================================================

/**
 * Create report request payload (POST /api/reports)
 */
export interface CreateReportCommand {
  photo_id: string;
  reason: ReportReason;
  comment?: string;
}

/**
 * Create report response
 */
export interface CreateReportResponse {
  message: string;
  report: {
    id: string;
    photo_id: string;
    reason: ReportReason;
    status: ReportStatus;
    created_at: string;
  };
}

/**
 * Report list item for moderators (GET /api/reports)
 */
export interface ReportListItemDto {
  id: string;
  photo: {
    id: string;
    title: string;
    thumbnail_url: string;
  };
  reporter: UserBasicInfo;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by?: string | null;
}

/**
 * Update report status request (PATCH /api/reports/:reportId)
 */
export interface UpdateReportCommand {
  status: "resolved" | "dismissed" | "in_review";
  moderator_note?: string;
}

/**
 * Update report status response
 */
export interface UpdateReportResponse {
  message: string;
  report: {
    id: string;
    status: ReportStatus;
    resolved_at: string;
  };
}

/**
 * Query parameters for report list
 */
export interface ReportQueryParams {
  status?: ReportStatus;
  photo_id?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// TAG DTOs (Section 8)
// ============================================================================

/**
 * Tag with usage statistics (GET /api/tags)
 */
export interface TagDto {
  id: number;
  name: string;
  usage_count: number;
}

/**
 * Tags list response
 */
export interface TagsResponse {
  data: TagDto[];
}

// ============================================================================
// LOCATION DTOs (Section 9)
// ============================================================================

/**
 * Location search result item (GET /api/locations/search)
 */
export interface LocationSearchResultDto {
  query: string;
  display_name: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number];
  place_type?: string;
}

/**
 * Location search response
 */
export interface LocationSearchResponse {
  data: LocationSearchResultDto[];
  meta: {
    cached: boolean;
  };
}

/**
 * Query parameters for location search
 */
export interface LocationSearchParams {
  q: string; // Query string
  limit?: number; // Max 10
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * File upload validation constraints
 */
export const FILE_UPLOAD_CONSTRAINTS = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_TYPES: ["image/jpeg", "image/png"],
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png"],
} as const;

/**
 * Photo upload rate limit
 */
export const PHOTO_UPLOAD_LIMIT = {
  MAX_PHOTOS: 5,
  WINDOW_HOURS: 24,
} as const;

/**
 * Field length constraints
 */
export const FIELD_CONSTRAINTS = {
  PHOTO_TITLE_MAX: 200,
  PHOTO_DESCRIPTION_MAX: 1000,
  PROFILE_DISPLAY_NAME_MAX: 100,
  PROFILE_BIO_MAX: 500,
  PROFILE_COMPANY_NAME_MAX: 100,
  REPORT_COMMENT_MAX: 500,
  TAG_NAME_MAX: 30,
  MAX_TAGS_PER_PHOTO: 10,
} as const;

/**
 * Location blur constraints
 */
export const LOCATION_BLUR = {
  MIN_RADIUS_METERS: 100,
  MAX_RADIUS_METERS: 500,
  DEFAULT_RADIUS_METERS: 200,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  PHOTOS_MAP_VIEW: { DEFAULT: 200, MAX: 200 },
  PHOTOS_USER: { DEFAULT: 20, MAX: 100 },
  FAVORITES: { DEFAULT: 20, MAX: 100 },
  REPORTS: { DEFAULT: 50, MAX: 100 },
  LOCATION_SEARCH: { DEFAULT: 5, MAX: 10 },
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid PhotoCategory
 */
export function isPhotoCategory(value: unknown): value is PhotoCategory {
  const validCategories: PhotoCategory[] = [
    "landscape",
    "portrait",
    "street",
    "architecture",
    "nature",
    "wildlife",
    "macro",
    "aerial",
    "astrophotography",
    "urban",
    "seascape",
    "other",
  ];
  return typeof value === "string" && validCategories.includes(value as PhotoCategory);
}

/**
 * Type guard to check if a value is a valid Season
 */
export function isSeason(value: unknown): value is Season {
  const validSeasons: Season[] = ["spring", "summer", "autumn", "winter"];
  return typeof value === "string" && validSeasons.includes(value as Season);
}

/**
 * Type guard to check if a value is a valid TimeOfDay
 */
export function isTimeOfDay(value: unknown): value is TimeOfDay {
  const validTimes: TimeOfDay[] = [
    "golden_hour_morning",
    "morning",
    "midday",
    "afternoon",
    "golden_hour_evening",
    "blue_hour",
    "night",
  ];
  return typeof value === "string" && validTimes.includes(value as TimeOfDay);
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  const validRoles: UserRole[] = ["photographer", "enthusiast"];
  return typeof value === "string" && validRoles.includes(value as UserRole);
}

/**
 * Type guard to check if a value is a valid ReportReason
 */
export function isReportReason(value: unknown): value is ReportReason {
  const validReasons: ReportReason[] = [
    "inappropriate_content",
    "copyright_violation",
    "spam",
    "incorrect_location",
    "private_property",
    "other",
  ];
  return typeof value === "string" && validReasons.includes(value as ReportReason);
}

/**
 * Type guard to check if coordinates are valid
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Type guard to check if a GeoPoint is valid
 */
export function isValidGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Partial<GeoPoint>;
  return (
    point.type === "Point" &&
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    typeof point.coordinates[0] === "number" &&
    typeof point.coordinates[1] === "number" &&
    isValidCoordinates(point.coordinates[1], point.coordinates[0])
  );
}

// ============================================================================
// MAP VIEW MODEL TYPES
// ============================================================================

/**
 * Represents the current map viewport state
 */
export interface MapViewport {
  latitude: number; // Center latitude
  longitude: number; // Center longitude
  zoom: number; // Zoom level (0-22)
  pitch?: number; // Optional 3D tilt
  bearing?: number; // Optional rotation
}

/**
 * Map bounds derived from viewport
 */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Current filter state for photo queries
 */
export interface PhotoFilters {
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  photographer_only: boolean;
}

/**
 * Complete state for MapSection component
 */
export interface MapViewState {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  viewport: MapViewport;
  filters: PhotoFilters;
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
}

/**
 * Simplified pin data for map rendering
 */
export interface PhotoPin {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  isPhotographer: boolean; // For gold vs blue pin color
  clusterId?: number | null;
}
