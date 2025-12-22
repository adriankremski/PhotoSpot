/**
 * Photo validation schemas using Zod
 * 
 * These schemas validate photo-related requests including
 * query parameters for photo listings and map view filtering.
 */

import { z } from 'zod';
import {
  PAGINATION_DEFAULTS,
  FILE_UPLOAD_CONSTRAINTS,
  FIELD_CONSTRAINTS,
  LOCATION_BLUR,
} from '../../types';

/**
 * Photo category enum schema
 */
const photoCategorySchema = z.enum([
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
  'other',
], {
  errorMap: () => ({ message: 'Invalid photo category' }),
});

/**
 * Season enum schema
 */
const seasonSchema = z.enum([
  'spring',
  'summer',
  'autumn',
  'winter',
], {
  errorMap: () => ({ message: 'Invalid season' }),
});

/**
 * Time of day enum schema
 */
const timeOfDaySchema = z.enum([
  'golden_hour_morning',
  'morning',
  'midday',
  'afternoon',
  'golden_hour_evening',
  'blue_hour',
  'night',
], {
  errorMap: () => ({ message: 'Invalid time of day' }),
});

/**
 * Bounding box validation helper
 * Format: "minLng,minLat,maxLng,maxLat"
 * Validates:
 * - Exactly 4 comma-separated numbers
 * - Valid coordinate ranges (lng: -180 to 180, lat: -90 to 90)
 * - minLng < maxLng and minLat < maxLat
 */
const bboxSchema = z
  .string()
  .refine(
    (val) => {
      const parts = val.split(',').map(p => p.trim());
      if (parts.length !== 4) return false;
      
      const nums = parts.map(p => parseFloat(p));
      if (nums.some(n => isNaN(n))) return false;
      
      const [minLng, minLat, maxLng, maxLat] = nums;
      
      // Validate coordinate ranges
      if (minLng < -180 || minLng > 180) return false;
      if (maxLng < -180 || maxLng > 180) return false;
      if (minLat < -90 || minLat > 90) return false;
      if (maxLat < -90 || maxLat > 90) return false;
      
      // Validate min < max
      if (minLng >= maxLng) return false;
      if (minLat >= maxLat) return false;
      
      return true;
    },
    {
      message: 'Invalid bounding box format. Expected: "minLng,minLat,maxLng,maxLat" with valid coordinates',
    }
  )
  .transform((val) => {
    const nums = val.split(',').map(p => parseFloat(p.trim()));
    return nums as [number, number, number, number];
  });

/**
 * Photo query parameters validation schema
 * Used for GET /api/photos (map view and list endpoints)
 * 
 * Validates and transforms query parameters including:
 * - bbox: Optional bounding box for geographic filtering
 * - category: Optional photo category filter
 * - season: Optional season filter
 * - time_of_day: Optional time of day filter
 * - photographer_only: Optional boolean to filter photos by photographers only
 * - limit: Number of results (default: 200, max: 200)
 * - offset: Pagination offset (default: 0)
 */
export const photoQueryParamsSchema = z.object({
  bbox: bboxSchema.optional(),
  category: photoCategorySchema.optional(),
  season: seasonSchema.optional(),
  time_of_day: timeOfDaySchema.optional(),
  photographer_only: z
    .union([z.string(), z.boolean()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num)) return PAGINATION_DEFAULTS.PHOTOS_MAP_VIEW.DEFAULT;
      return num;
    })
    .pipe(
      z.number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(PAGINATION_DEFAULTS.PHOTOS_MAP_VIEW.MAX, `Limit must not exceed ${PAGINATION_DEFAULTS.PHOTOS_MAP_VIEW.MAX}`)
    )
    .default(PAGINATION_DEFAULTS.PHOTOS_MAP_VIEW.DEFAULT),
  offset: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num)) return 0;
      return num;
    })
    .pipe(
      z.number()
        .int()
        .min(0, 'Offset must be non-negative')
    )
    .default(0),
});

/**
 * Photo ID path parameter validation schema
 * Used for GET /api/photos/:photoId
 */
export const photoIdParamSchema = z.object({
  photoId: z.string().uuid('Invalid photo ID format'),
});

/**
 * GearInfo schema for camera gear information
 */
const gearInfoSchema = z.object({
  camera: z.string().optional(),
  lens: z.string().optional(),
}).passthrough(); // Allow additional fields

/**
 * Create photo command validation schema
 * Used for POST /api/photos (multipart/form-data)
 * 
 * Validates all fields for photo upload including:
 * - File validation (size, type)
 * - Required metadata (title, category, location)
 * - Optional metadata (description, season, time_of_day, tags, gear)
 * - Location blurring parameters (blur_location, blur_radius)
 */
export const createPhotoCommandSchema = z.object({
  // File is validated separately in multipart parser (binary data)
  // This schema validates the form fields
  
  title: z.string()
    .min(1, 'Title is required')
    .max(FIELD_CONSTRAINTS.PHOTO_TITLE_MAX, `Title must not exceed ${FIELD_CONSTRAINTS.PHOTO_TITLE_MAX} characters`)
    .trim(),
  
  description: z.string()
    .max(FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX, `Description must not exceed ${FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX} characters`)
    .trim()
    .optional(),
  
  category: photoCategorySchema,
  
  season: seasonSchema.optional(),
  
  time_of_day: timeOfDaySchema.optional(),
  
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  
  blur_location: z.boolean()
    .default(false),
  
  blur_radius: z.number()
    .int('Blur radius must be an integer')
    .min(LOCATION_BLUR.MIN_RADIUS_METERS, `Blur radius must be at least ${LOCATION_BLUR.MIN_RADIUS_METERS} meters`)
    .max(LOCATION_BLUR.MAX_RADIUS_METERS, `Blur radius must not exceed ${LOCATION_BLUR.MAX_RADIUS_METERS} meters`)
    .optional(),
  
  tags: z.array(z.string()
    .trim()
    .toLowerCase()
    .min(1, 'Tag cannot be empty')
    .max(FIELD_CONSTRAINTS.TAG_NAME_MAX, `Tag must not exceed ${FIELD_CONSTRAINTS.TAG_NAME_MAX} characters`)
  )
    .max(FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO, `Maximum ${FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO} tags allowed`)
    .default([]),
  
  gear: gearInfoSchema.optional(),
})
  .refine(
    (data) => {
      // If blur_location is true, blur_radius must be provided
      if (data.blur_location && !data.blur_radius) {
        return false;
      }
      return true;
    },
    {
      message: 'blur_radius is required when blur_location is true',
      path: ['blur_radius'],
    }
  );

/**
 * File validation schema
 * Validates uploaded file properties
 */
export const fileValidationSchema = z.object({
  size: z.number()
    .max(FILE_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES, `File size must not exceed ${FILE_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES / 1024 / 1024} MB`),
  
  type: z.string()
    .refine(
      (type) => FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES.includes(type as any),
      {
        message: `File type must be one of: ${FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES.join(', ')}`,
      }
    ),
  
  name: z.string()
    .refine(
      (name) => {
        const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
        return FILE_UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(ext as any);
      },
      {
        message: `File extension must be one of: ${FILE_UPLOAD_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`,
      }
    ),
});

/**
 * Type inference helpers
 */
export type PhotoQueryParamsInput = z.input<typeof photoQueryParamsSchema>;
export type PhotoQueryParamsOutput = z.output<typeof photoQueryParamsSchema>;
export type PhotoIdParam = z.infer<typeof photoIdParamSchema>;
export type CreatePhotoCommandInput = z.input<typeof createPhotoCommandSchema>;
export type CreatePhotoCommandOutput = z.output<typeof createPhotoCommandSchema>;
export type FileValidation = z.infer<typeof fileValidationSchema>;

