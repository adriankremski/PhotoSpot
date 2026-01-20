/**
 * User Profile API Endpoints
 *
 * POST /api/users/:userId/profile
 * Creates a new user profile for the authenticated user.
 * Called after user registration to set up initial profile information.
 *
 * GET /api/users/:userId/profile
 * Retrieves the public profile of a PhotoSpot user.
 * Returns extended fields when the authenticated user requests their own profile.
 * Field visibility depends on user role and viewer relationship.
 *
 * PATCH /api/users/:userId/profile
 * Updates the authenticated user's profile information.
 * Only the profile owner can update their own profile.
 * Photographer-only fields are restricted to users with photographer role.
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { userIdParamSchema } from "../../../../lib/validators/params";
import { getUserProfile, UserServiceError } from "../../../../lib/services/user.service";
import { validateProfileCreate, validateProfileUpdate } from "../../../../lib/validators/profile";
import { createUserProfile, updateUserProfile, ProfileServiceError } from "../../../../lib/services/profile";
import type {
  UserProfileDto,
  ApiError,
  CreateProfileResponse,
  UpdateProfileResponse,
  UserRole,
} from "../../../../types";

/**
 * Handles POST requests to create a user profile
 */
export const POST: APIRoute = async ({ params, locals, request }) => {
  try {
    // Validate userId parameter with Zod
    const validatedParams = userIdParamSchema.parse(params);
    const { userId } = validatedParams;

    // Authenticate user - POST requires authentication
    const {
      data: { user: currentUser },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !currentUser) {
      const errorResponse: ApiError = {
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Authorization check: user can only create their own profile
    if (currentUser.id !== userId) {
      const errorResponse: ApiError = {
        error: {
          code: "forbidden",
          message: "You can only create your own profile",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Get user's role from metadata
    const userRole = (currentUser.user_metadata?.role as UserRole) || "enthusiast";

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error("Invalid JSON in request body", parseError);
      const errorResponse: ApiError = {
        error: {
          code: "invalid_json",
          message: "Invalid JSON in request body",
        },
      };

      console.error("Error response", errorResponse);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Validate creation payload with role-based filtering
    const validatedPayload = validateProfileCreate(requestBody, userRole);

    // Call service layer to create profile
    const createdProfile = await createUserProfile(userId, validatedPayload, locals.supabase, locals.supabaseAdmin);

    // Return success response
    const successResponse: CreateProfileResponse = {
      message: "Profile created successfully",
      profile: createdProfile,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: {
          code: "validation_error",
          message: "Invalid request data",
          details: {
            issues: error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
            })),
          },
        },
      };

      console.error("Validation errors", errorResponse);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle profile service errors
    if (error instanceof ProfileServiceError) {
      console.error(`[Create Profile Error] ${error.code}: ${error.message}`, {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      });

      const errorResponse: ApiError = {
        error: {
          code: error.code.toLowerCase(),
          message: error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle unexpected errors
    console.error("[Create Profile Error] Unexpected error:", error);

    // Generate trace ID for debugging
    const traceId = crypto.randomUUID();
    console.error(`[Create Profile Error] Trace ID: ${traceId}`, error);

    const errorResponse: ApiError = {
      error: {
        code: "internal_error",
        message: "Internal server error",
        details: {
          traceId,
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

/**
 * Handles GET requests for user profiles
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Validate userId parameter with Zod
    const validatedParams = userIdParamSchema.parse(params);
    const { userId } = validatedParams;

    // Get current authenticated user (if any)
    const {
      data: { user: currentUser },
      error: authError,
    } = await locals.supabase.auth.getUser();

    // Note: authError is expected when not authenticated, so we don't throw here
    const currentUserId = currentUser?.id ?? null;

    // Call service layer to fetch user profile
    const profile = await getUserProfile(locals.supabase, userId, currentUserId);

    // Handle user not found
    if (!profile) {
      const errorResponse: ApiError = {
        error: {
          code: "not_found",
          message: "User not found",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Return success response with profile data
    return new Response(JSON.stringify(profile satisfies UserProfileDto), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle Zod validation errors (invalid UUID format)
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: {
          code: "invalid_parameter",
          message: "Invalid user ID format",
          details: {
            issues: error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
            })),
          },
        },
      };

      console.error("Invalid parameter error response", errorResponse);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle user service errors
    if (error instanceof UserServiceError) {
      console.error(`[User Profile Error] ${error.code}: ${error.message}`, {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      });

      const errorResponse: ApiError = {
        error: {
          code: error.code.toLowerCase(),
          message: error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle unexpected errors
    console.error("[User Profile Error] Unexpected error:", error);

    // Generate trace ID for debugging
    const traceId = crypto.randomUUID();
    console.error(`[User Profile Error] Trace ID: ${traceId}`, error);

    const errorResponse: ApiError = {
      error: {
        code: "internal_error",
        message: "Internal server error",
        details: {
          traceId,
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

/**
 * Handles PATCH requests to update user profile
 */
export const PATCH: APIRoute = async ({ params, locals, request }) => {
  try {
    // Validate userId parameter with Zod
    const validatedParams = userIdParamSchema.parse(params);
    const { userId } = validatedParams;

    // Authenticate user - PATCH requires authentication
    const {
      data: { user: currentUser },
      error: authError,
    } = await locals.supabase.auth.getUser();

    if (authError || !currentUser) {
      const errorResponse: ApiError = {
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Authorization check: user can only update their own profile
    if (currentUser.id !== userId) {
      const errorResponse: ApiError = {
        error: {
          code: "forbidden",
          message: "You can only update your own profile",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Get user's role from metadata
    const userRole = (currentUser.user_metadata?.role as UserRole) || "enthusiast";

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      const errorResponse: ApiError = {
        error: {
          code: "invalid_json",
          message: "Invalid JSON in request body",
        },
      };

      console.error("Invalid JSON error response", errorResponse);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Validate update payload with role-based filtering
    const validatedPayload = validateProfileUpdate(requestBody, userRole);

    // Call service layer to update profile
    const updatedProfile = await updateUserProfile(userId, validatedPayload, locals.supabase, userRole);

    // Return success response
    const successResponse: UpdateProfileResponse = {
      message: "Profile updated successfully",
      profile: updatedProfile,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const errorResponse: ApiError = {
        error: {
          code: "validation_error",
          message: "Invalid request data",
          details: {
            issues: error.errors.map((err) => ({
              path: err.path.join("."),
              message: err.message,
            })),
          },
        },
      };

      console.error("Validation errors #2", errorResponse);
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle profile service errors
    if (error instanceof ProfileServiceError) {
      console.error(`[Update Profile Error] ${error.code}: ${error.message}`, {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      });

      const errorResponse: ApiError = {
        error: {
          code: error.code.toLowerCase(),
          message: error.message,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle unexpected errors
    console.error("[Update Profile Error] Unexpected error:", error);

    // Generate trace ID for debugging
    const traceId = crypto.randomUUID();
    console.error(`[Update Profile Error] Trace ID: ${traceId}`, error);

    const errorResponse: ApiError = {
      error: {
        code: "internal_error",
        message: "Internal server error",
        details: {
          traceId,
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

// Disable prerendering for this API route
export const prerender = false;
