/**
 * Profile service layer
 * 
 * Encapsulates profile-related business logic and database interactions.
 * Provides operations for creating and updating user profiles with proper validation and error handling.
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type { CreateProfileCommand, UpdateProfileCommand, UserProfileDto, UserRole, SocialLinks, UserProfileInsert } from '../../types';
import { getUserProfile } from './user.service';

/**
 * Custom error class for profile service operations
 */
export class ProfileServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProfileServiceError';
  }
}

/**
 * Creates a new user profile
 * 
 * Business rules:
 * - Profile must not already exist for this user (409 Conflict if it does)
 * - display_name is required
 * - User role is fetched from auth.users metadata and cannot be set by user
 * - Photographer-only fields (company_name, website_url, social_links) can only be set by photographers
 * - Empty strings are converted to nulls for optional fields
 * - Returns the complete created profile with role and photo_count (0 for new profiles)
 * 
 * @param userId - UUID of the user whose profile is being created
 * @param payload - Profile creation data
 * @param supabase - Supabase client instance
 * @returns Promise resolving to the created UserProfileDto
 * @throws ProfileServiceError for validation failures, conflicts, or database errors
 */
export async function createUserProfile(
  userId: string,
  payload: CreateProfileCommand,
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient
): Promise<UserProfileDto> {
  console.log('createUserProfile', userId, payload);
  try {
    // Step 1: Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      throw new ProfileServiceError(
        'Failed to check for existing profile',
        'DATABASE_ERROR',
        500,
        { originalError: checkError.message }
      );
    }
    
    if (existingProfile) {
      throw new ProfileServiceError(
        'Profile already exists for this user',
        'CONFLICT',
        409
      );
    }
    
    // Step 2: Retrieve user role from auth.users metadata
    // We need to use the admin API to get user metadata
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    console.log('userId', userId);
    console.log('userData', userData);
    console.log('userError', userError);
    
    if (userError || !userData?.user) {
      throw new ProfileServiceError(
        'Failed to retrieve user information',
        'USER_NOT_FOUND',
        400,
        { originalError: userError?.message }
      );
    }
    
    const userRole = (userData.user.user_metadata?.role as UserRole) || 'enthusiast';
    
    if (!userRole) {
      throw new ProfileServiceError(
        'User role not found in metadata',
        'INVALID_USER_DATA',
        400
      );
    }
    
    // Step 3: Validate photographer-only fields against role
    if (userRole !== 'photographer') {
      const hasPhotographerFields = 
        payload.company_name !== undefined ||
        payload.website_url !== undefined ||
        payload.social_links !== undefined;
      
      if (hasPhotographerFields) {
        throw new ProfileServiceError(
          'Only photographers can set company_name, website_url, and social_links',
          'FORBIDDEN',
          403
        );
      }
    }
    
    // Step 4: Build insert object with proper field handling
    const insertData: UserProfileInsert = {
      user_id: userId,
      display_name: payload.display_name,
      avatar_url: payload.avatar_url && payload.avatar_url !== '' ? payload.avatar_url : null,
      bio: payload.bio && payload.bio !== '' ? payload.bio : null,
    };
    console.log('insertData', insertData);
    // Add photographer-only fields if user is a photographer
    if (userRole === 'photographer') {
      insertData.company_name = payload.company_name && payload.company_name !== '' ? payload.company_name : null;
      insertData.website_url = payload.website_url && payload.website_url !== '' ? payload.website_url : null;
      
      // Clean up social links - remove undefined and empty values
      if (payload.social_links) {
        const cleanedLinks: SocialLinks = {};
        for (const [key, value] of Object.entries(payload.social_links)) {
          if (value !== undefined && value !== '') {
            cleanedLinks[key] = value;
          }
        }
        insertData.social_links = Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null;
      } else {
        insertData.social_links = null;
      }
    }
    
    // Step 5: Insert the new profile
    const { data: createdProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) {
      // Handle duplicate key constraint (should not happen due to existence check, but defense in depth)
      if (insertError.code === '23505') {
        throw new ProfileServiceError(
          'Profile already exists for this user',
          'CONFLICT',
          409
        );
      }
      
      // Handle foreign key violation (user doesn't exist in auth.users)
      if (insertError.code === '23503') {
        throw new ProfileServiceError(
          'User does not exist',
          'USER_NOT_FOUND',
          400,
          { originalError: insertError.message }
        );
      }
      
      // Generic database error
      throw new ProfileServiceError(
        'Failed to create user profile',
        'DATABASE_ERROR',
        500,
        { originalError: insertError.message }
      );
    }
    
    if (!createdProfile) {
      throw new ProfileServiceError(
        'Profile creation succeeded but no data was returned',
        'DATABASE_ERROR',
        500
      );
    }
    
    // Step 6: Fetch the complete profile with role and photo_count using existing service
    const completeProfile = await getUserProfile(supabase, userId, userId);
    
    if (!completeProfile) {
      throw new ProfileServiceError(
        'Profile was created but could not be retrieved',
        'DATABASE_ERROR',
        500
      );
    }
    
    return completeProfile;
  } catch (error) {
    // Re-throw ProfileServiceError as-is
    if (error instanceof ProfileServiceError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new ProfileServiceError(
      'An unexpected error occurred while creating user profile',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Updates a user's profile with the provided data
 * 
 * Business rules:
 * - Only the profile owner can update their own profile
 * - Photographer-only fields (company_name, website_url, social_links) can only be set by photographers
 * - All fields are optional (partial updates supported)
 * - Empty strings are treated as nulls for optional fields
 * - Returns the complete updated profile
 * 
 * @param userId - UUID of the user whose profile is being updated
 * @param payload - Partial profile update data
 * @param supabase - Supabase client instance
 * @param userRole - Role of the user (for field filtering)
 * @returns Promise resolving to the updated UserProfileDto
 * @throws ProfileServiceError for validation failures, not found, or database errors
 */
export async function updateUserProfile(
  userId: string,
  payload: UpdateProfileCommand,
  supabase: SupabaseClient,
  userRole: UserRole
): Promise<UserProfileDto> {
  try {
    // Build the update object, only including provided fields
    const updates: Record<string, unknown> = {};
    
    // Process each field individually
    if (payload.display_name !== undefined) {
      updates.display_name = payload.display_name;
    }
    
    if (payload.avatar_url !== undefined) {
      // Convert empty string to null
      updates.avatar_url = payload.avatar_url === '' ? null : payload.avatar_url;
    }
    
    if (payload.bio !== undefined) {
      // Convert empty string to null
      updates.bio = payload.bio === '' ? null : payload.bio;
    }
    
    // Photographer-only fields
    // These should only be included if the user is a photographer
    // The validator already checks this, but we double-check here for defense in depth
    if (userRole === 'photographer') {
      if (payload.company_name !== undefined) {
        updates.company_name = payload.company_name === '' ? null : payload.company_name;
      }
      
      if (payload.website_url !== undefined) {
        updates.website_url = payload.website_url === '' ? null : payload.website_url;
      }
      
      if (payload.social_links !== undefined) {
        // Clean up social links - remove undefined values
        const cleanedLinks: SocialLinks = {};
        for (const [key, value] of Object.entries(payload.social_links)) {
          if (value !== undefined && value !== '') {
            cleanedLinks[key] = value;
          }
        }
        
        updates.social_links = Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null;
      }
    } else {
      // Sanity check: ensure no photographer-only fields are being updated by non-photographers
      if (
        payload.company_name !== undefined ||
        payload.website_url !== undefined ||
        payload.social_links !== undefined
      ) {
        throw new ProfileServiceError(
          'Only photographers can update company_name, website_url, and social_links',
          'FORBIDDEN',
          403
        );
      }
    }
    
    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      throw new ProfileServiceError(
        'No valid fields provided for update',
        'INVALID_INPUT',
        400
      );
    }
    
    // Set updated_at timestamp
    updates.updated_at = new Date().toISOString();
    
    // Perform the update
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      // Handle not found (no rows affected)
      if (error.code === 'PGRST116') {
        throw new ProfileServiceError(
          'User profile not found',
          'NOT_FOUND',
          404
        );
      }
      
      // Handle constraint violations
      if (error.code === '23505') {
        throw new ProfileServiceError(
          'Profile update failed due to duplicate constraint',
          'DUPLICATE',
          400,
          { originalError: error.message }
        );
      }
      
      // Generic database error
      throw new ProfileServiceError(
        'Failed to update user profile',
        'DATABASE_ERROR',
        500,
        { originalError: error.message }
      );
    }
    
    if (!data) {
      throw new ProfileServiceError(
        'Profile update succeeded but no data was returned',
        'DATABASE_ERROR',
        500
      );
    }
    
    // Fetch the complete profile with role and photo_count using the existing service
    const updatedProfile = await getUserProfile(supabase, userId, userId);
    
    if (!updatedProfile) {
      throw new ProfileServiceError(
        'Profile was updated but could not be retrieved',
        'DATABASE_ERROR',
        500
      );
    }
    
    return updatedProfile;
  } catch (error) {
    // Re-throw ProfileServiceError as-is
    if (error instanceof ProfileServiceError) {
      throw error;
    }
    
    // Wrap unexpected errors
    throw new ProfileServiceError(
      'An unexpected error occurred while updating user profile',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

