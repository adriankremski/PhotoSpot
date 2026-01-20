/**
 * Zod validation schemas for profile setup form
 * Mirrors backend validation from src/lib/validators/profile.ts
 */

import { z } from "zod";
import { FIELD_CONSTRAINTS } from "@/types";

/**
 * URL validation helper
 */
const urlSchema = z
  .string()
  .url("Invalid URL format")
  .regex(/^https?:\/\//, "URL must start with http:// or https://");

/**
 * Social links validation
 */
const socialLinksSchema = z.record(z.string(), z.string().url("Invalid URL format")).optional().nullable();

/**
 * Base profile schema (common fields for all users)
 */
const baseProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(
      FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX,
      `Display name must be at most ${FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX} characters`
    ),
  avatar_url: z.string().url("Invalid avatar URL").optional().nullable().or(z.literal("")),
  bio: z
    .string()
    .max(FIELD_CONSTRAINTS.PROFILE_BIO_MAX, `Bio must be at most ${FIELD_CONSTRAINTS.PROFILE_BIO_MAX} characters`)
    .optional()
    .nullable()
    .or(z.literal("")),
});

/**
 * Photographer-specific fields
 */
const photographerFieldsSchema = z.object({
  company_name: z
    .string()
    .max(
      FIELD_CONSTRAINTS.PROFILE_COMPANY_NAME_MAX,
      `Company name must be at most ${FIELD_CONSTRAINTS.PROFILE_COMPANY_NAME_MAX} characters`
    )
    .optional()
    .nullable()
    .or(z.literal("")),
  website_url: urlSchema.optional().nullable().or(z.literal("")),
  social_links: socialLinksSchema,
});

/**
 * Complete profile schema for enthusiasts
 */
export const enthusiastProfileSchema = baseProfileSchema;

/**
 * Complete profile schema for photographers
 */
export const photographerProfileSchema = baseProfileSchema.merge(photographerFieldsSchema);

/**
 * Type inference from schemas
 */
export type EnthusiastProfileFormData = z.infer<typeof enthusiastProfileSchema>;
export type PhotographerProfileFormData = z.infer<typeof photographerProfileSchema>;

/**
 * Get appropriate schema based on user role
 */
export function getProfileSchema(role: "photographer" | "enthusiast") {
  return role === "photographer" ? photographerProfileSchema : enthusiastProfileSchema;
}
