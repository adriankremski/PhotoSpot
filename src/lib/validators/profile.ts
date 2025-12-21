/**
 * Profile validation schemas
 * 
 * Provides Zod schemas for validating user profile updates and related operations.
 * Enforces field length constraints, URL validations, and role-based field restrictions.
 */

import { z } from 'zod';
import { FIELD_CONSTRAINTS } from '../../types';

/**
 * Schema for individual social media links
 * Must be valid URLs
 */
const socialLinkSchema = z.string().url('Invalid URL format for social link').optional();

/**
 * Schema for social links object
 * Allows common social media platforms plus any custom links
 */
const socialLinksSchema = z.object({
  instagram: socialLinkSchema,
  facebook: socialLinkSchema,
  twitter: socialLinkSchema,
  linkedin: socialLinkSchema,
}).passthrough(); // Allow additional social links beyond the defined ones

/**
 * Base schema for profile updates (without role-based validation)
 * All fields are optional to support partial updates
 */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(
      FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX,
      `Display name must be at most ${FIELD_CONSTRAINTS.PROFILE_DISPLAY_NAME_MAX} characters`
    )
    .optional(),
  
  avatar_url: z
    .string()
    .url('Invalid URL format for avatar')
    .optional()
    .or(z.literal('')), // Allow empty string to clear avatar
  
  bio: z
    .string()
    .max(
      FIELD_CONSTRAINTS.PROFILE_BIO_MAX,
      `Bio must be at most ${FIELD_CONSTRAINTS.PROFILE_BIO_MAX} characters`
    )
    .optional()
    .or(z.literal('')), // Allow empty string to clear bio
  
  // Photographer-only fields (validation done at service layer)
  company_name: z
    .string()
    .trim()
    .max(
      FIELD_CONSTRAINTS.PROFILE_COMPANY_NAME_MAX,
      `Company name must be at most ${FIELD_CONSTRAINTS.PROFILE_COMPANY_NAME_MAX} characters`
    )
    .optional()
    .or(z.literal('')), // Allow empty string to clear company name
  
  website_url: z
    .string()
    .url('Invalid URL format for website')
    .optional()
    .or(z.literal('')), // Allow empty string to clear website
  
  social_links: socialLinksSchema.optional(),
}).strict(); // Reject any additional fields not defined in schema

/**
 * Type inference for validated update profile input
 */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Validates and filters profile update data based on user role
 * Removes photographer-only fields if the user is not a photographer
 * 
 * @param data - Raw profile update data
 * @param userRole - Role of the user making the update
 * @returns Validated and filtered profile update data
 * @throws ZodError if validation fails
 */
export function validateProfileUpdate(
  data: unknown,
  userRole: 'photographer' | 'enthusiast'
): UpdateProfileInput {
  // First validate against base schema
  const validated = updateProfileSchema.parse(data);
  
  // If user is not a photographer, remove photographer-only fields
  if (userRole !== 'photographer') {
    const { company_name, website_url, social_links, ...allowedFields } = validated;
    
    // Check if any photographer-only fields were provided
    const photographerFieldsProvided = 
      company_name !== undefined || 
      website_url !== undefined || 
      social_links !== undefined;
    
    if (photographerFieldsProvided) {
      throw new z.ZodError([
        {
          code: 'custom',
          path: ['role'],
          message: 'Only photographers can update company_name, website_url, and social_links',
        },
      ]);
    }
    
    return allowedFields;
  }
  
  return validated;
}

