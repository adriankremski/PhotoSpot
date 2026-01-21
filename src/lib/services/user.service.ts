/**
 * User service layer
 *
 * Encapsulates all user-related business logic and database interactions.
 * Provides a clean interface for user operations with proper error handling.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { UserProfileDto, UserRole, SocialLinks } from "../../types";

/**
 * Response type from get_user_profile_with_role RPC function
 */
interface UserProfileRpcResponse {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  company_name: string | null;
  website_url: string | null;
  social_links: SocialLinks | null;
  role: UserRole;
  created_at: string;
  deleted_at: string | null;
  photo_count: number;
}

/**
 * Custom error types for user service operations
 */
export class UserServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

/**
 * Retrieves a user's profile with appropriate field visibility based on viewer relationship
 *
 * Field visibility rules:
 * - Owner (authenticated user viewing their own profile): all fields
 * - Others viewing photographer profile: all fields (photographer-only fields included)
 * - Others viewing enthusiast profile: basic fields only (display_name, avatar_url, bio, role, created_at)
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user profile to retrieve
 * @param currentUserId - UUID of the authenticated user (null if not authenticated)
 * @returns Promise resolving to UserProfileDto or null if user not found
 * @throws UserServiceError for database failures
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
  currentUserId?: string | null
): Promise<UserProfileDto | null> {
  try {
    // Call RPC function to get user profile with role and photo count
    // This function joins user_profiles with auth.users to get role
    // Type assertion needed because the RPC function is not yet in generated types
    const { data, error } = await (
      supabase.rpc as (
        functionName: string,
        params: Record<string, unknown>
      ) => { single: () => Promise<{ data: UserProfileRpcResponse | null; error: Error | null }> }
    )("get_user_profile_with_role", {
      target_user_id: userId,
    }).single();

    if (error) {
      // Handle not found gracefully (PGRST116 = no rows returned)
      if (error.code === "PGRST116") {
        return null;
      }

      throw new UserServiceError("Failed to fetch user profile", "DATABASE_ERROR", 500, {
        originalError: error.message,
      });
    }

    // Check if user data was returned and user is not soft-deleted
    if (!data || data.deleted_at !== null) {
      return null;
    }

    // Determine viewer relationship
    const isOwner = currentUserId === userId;
    const isPhotographer = data.role === "photographer";

    // Build the base profile DTO with fields everyone can see
    const baseProfile: UserProfileDto = {
      user_id: data.user_id,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      role: data.role,
      created_at: data.created_at,
      photo_count: Number(data.photo_count) || 0,
    };

    // Apply field visibility rules
    // Owner sees all fields, or anyone viewing a photographer profile sees all fields
    if (isOwner || isPhotographer) {
      return {
        ...baseProfile,
        company_name: data.company_name,
        website_url: data.website_url,
        social_links: data.social_links,
      };
    }

    // For enthusiast profiles viewed by others, return only base fields
    return baseProfile;
  } catch (error) {
    // Re-throw UserServiceError as-is
    if (error instanceof UserServiceError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new UserServiceError("An unexpected error occurred while fetching user profile", "INTERNAL_ERROR", 500, {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
