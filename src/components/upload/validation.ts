/**
 * Validation Schemas for Photo Upload Wizard
 *
 * Uses Zod for runtime validation of each wizard step.
 */

import { z } from "zod";
import {
  FILE_UPLOAD_CONSTRAINTS,
  FIELD_CONSTRAINTS,
  LOCATION_BLUR,
  isPhotoCategory,
  isSeason,
  isTimeOfDay,
  isValidCoordinates,
} from "@/types";
import type { PhotoCategory, Season, TimeOfDay } from "@/types";

// ============================================================================
// Step 1: File Validation Schema
// ============================================================================

export const fileSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= FILE_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES,
      `File size must not exceed ${FILE_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES / 1024 / 1024}MB`
    )
    .refine(
      (file) => (FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES as readonly string[]).includes(file.type),
      `File type must be one of: ${FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES.join(", ")}`
    ),
});

// ============================================================================
// Step 2: Metadata Validation Schema
// ============================================================================

export const metadataSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(FIELD_CONSTRAINTS.PHOTO_TITLE_MAX, `Title must not exceed ${FIELD_CONSTRAINTS.PHOTO_TITLE_MAX} characters`)
    .trim(),
  description: z
    .string()
    .max(
      FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX,
      `Description must not exceed ${FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX} characters`
    )
    .optional(),
  category: z
    .string()
    .refine((val) => val !== "" && isPhotoCategory(val), "Category is required")
    .transform((val) => val as PhotoCategory),
  season: z
    .string()
    .refine((val) => val === "" || isSeason(val), "Invalid season")
    .transform((val) => (val === "" ? undefined : (val as Season)))
    .optional(),
  time_of_day: z
    .string()
    .refine((val) => val === "" || isTimeOfDay(val), "Invalid time of day")
    .transform((val) => (val === "" ? undefined : (val as TimeOfDay)))
    .optional(),
  tags: z
    .array(
      z.string().max(FIELD_CONSTRAINTS.TAG_NAME_MAX, `Tag must not exceed ${FIELD_CONSTRAINTS.TAG_NAME_MAX} characters`)
    )
    .max(FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO, `Maximum ${FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO} tags allowed`)
    .default([]),
  gear: z
    .object({
      camera: z.string().optional(),
      lens: z.string().optional(),
    })
    .default({}),
});

// ============================================================================
// Step 3: Location Validation Schema
// ============================================================================

// Base location schema without refinements (for accessing .shape)
const locationSchemaBase = z.object({
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  blur_location: z.boolean().default(false),
  blur_radius: z
    .number()
    .min(LOCATION_BLUR.MIN_RADIUS_METERS)
    .max(LOCATION_BLUR.MAX_RADIUS_METERS)
    .default(LOCATION_BLUR.DEFAULT_RADIUS_METERS),
});

// Location schema with validation refinements
export const locationSchema = locationSchemaBase
  .refine((data) => isValidCoordinates(data.latitude, data.longitude), {
    message: "Invalid coordinates",
  })
  .refine(
    (data) => {
      if (data.blur_location) {
        return (
          data.blur_radius >= LOCATION_BLUR.MIN_RADIUS_METERS && data.blur_radius <= LOCATION_BLUR.MAX_RADIUS_METERS
        );
      }
      return true;
    },
    {
      message: `Blur radius must be between ${LOCATION_BLUR.MIN_RADIUS_METERS} and ${LOCATION_BLUR.MAX_RADIUS_METERS} meters`,
      path: ["blur_radius"],
    }
  );

// ============================================================================
// Complete Upload Command Schema
// ============================================================================

export const uploadCommandSchema = z.object({
  file: fileSchema.shape.file,
  title: metadataSchema.shape.title,
  description: metadataSchema.shape.description.optional(),
  category: metadataSchema.shape.category,
  season: metadataSchema.shape.season.optional(),
  time_of_day: metadataSchema.shape.time_of_day.optional(),
  latitude: locationSchemaBase.shape.latitude,
  longitude: locationSchemaBase.shape.longitude,
  blur_location: locationSchemaBase.shape.blur_location.optional(),
  blur_radius: locationSchemaBase.shape.blur_radius.optional(),
  tags: metadataSchema.shape.tags,
  gear: metadataSchema.shape.gear,
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate file step
 */
export function validateFile(file: File | null): { success: boolean; error?: string } {
  if (!file) {
    return { success: false, error: "Please select a file" };
  }

  try {
    fileSchema.parse({ file });
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || "Invalid file" };
    }
    return { success: false, error: "File validation failed" };
  }
}

/**
 * Validate metadata step
 */
export function validateMetadata(metadata: unknown): { success: boolean; errors?: Record<string, string> } {
  try {
    metadataSchema.parse(metadata);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        errors[field] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: "Validation failed" } };
  }
}

/**
 * Validate location step
 */
export function validateLocation(location: unknown): { success: boolean; errors?: Record<string, string> } {
  try {
    locationSchema.parse(location);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path.join(".");
        errors[field] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: "Validation failed" } };
  }
}
