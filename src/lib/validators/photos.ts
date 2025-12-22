/**
 * Photo validation schemas using Zod
 * 
 * These schemas validate photo-related requests including
 * query parameters for photo listings and map view filtering.
 */

import { z } from 'zod';
import { PAGINATION_DEFAULTS } from '../../types';

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
 * Type inference helpers
 */
export type PhotoQueryParamsInput = z.input<typeof photoQueryParamsSchema>;
export type PhotoQueryParamsOutput = z.output<typeof photoQueryParamsSchema>;

