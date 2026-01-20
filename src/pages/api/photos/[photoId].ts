/**
 * GET /api/photos/:photoId
 *
 * Retrieves complete details for a single photo by its UUID.
 * Implements role-based access control with three distinct audience types:
 *
 * 1. Public visitors - Only approved photos, no sensitive fields
 * 2. Photo owner - All photos regardless of status, all fields included
 * 3. Moderators - Same visibility as owner (future enhancement)
 *
 * Sensitive fields (exif, location_exact, status) are only returned
 * to the photo owner or moderators.
 *
 * @see .ai/get-single-photo-implementation-plan.md for detailed implementation plan
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { photoIdParamSchema } from "../../../lib/validators/photos";
import { getPhotoById, PhotoServiceError, type Requester } from "../../../lib/services/photos";
import type { ApiError, PhotoDetailDto } from "../../../types";

export const prerender = false;

/**
 * Handles single photo detail requests
 *
 * Path Parameters:
 * - photoId: string (UUID) - ID of the photo to retrieve
 *
 * Authentication:
 * - Optional - If authenticated, user may see additional fields
 * - Authorization header with Bearer token is automatically handled by Supabase
 *
 * Success Response (200):
 * - PhotoDetailDto with conditional fields based on user role
 *
 * Error Responses:
 * - 400: Invalid photo ID format
 * - 401: Invalid or expired authentication token
 * - 403: User lacks permission to view this photo
 * - 404: Photo not found or deleted
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Validate photoId path parameter
    const { photoId } = photoIdParamSchema.parse(params);

    // Attempt to get authenticated user from Supabase
    // This will be null if no valid token is provided (public access)
    const {
      data: { user },
      error: authError,
    } = await locals.supabase.auth.getUser();

    // Handle authentication errors (invalid/expired token)
    // Note: We only throw 401 if a token was provided but is invalid
    // If no token is provided, user will be null and that's fine (public access)
    if (authError && authError.message !== "Auth session missing!") {
      const apiError: ApiError = {
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired authentication token",
          details: {
            authError: authError.message,
          },
        },
      };

      return new Response(JSON.stringify(apiError), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Build requester object for authorization checks
    const requester: Requester | null = user
      ? {
          id: user.id,
          role: user.user_metadata?.role,
        }
      : null;

    // Retrieve photo via service layer
    const photo: PhotoDetailDto = await getPhotoById(photoId, requester, locals.supabase);

    // Return success response
    // Note: Undefined fields are automatically omitted by JSON.stringify
    return new Response(JSON.stringify(photo), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache control: public approved photos can be cached briefly
        // Owner/moderator views should not be cached
        "Cache-Control": requester ? "private, no-cache" : "public, max-age=60",
      },
    });
  } catch (error) {
    // Handle Zod validation errors (400 Bad Request)
    if (error instanceof ZodError) {
      const apiError: ApiError = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid photo ID format",
          details: {
            issues: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
        },
      };

      return new Response(JSON.stringify(apiError), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle service layer errors
    if (error instanceof PhotoServiceError) {
      const apiError: ApiError = {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };

      // Log error for monitoring (except 404 which is normal)
      if (error.statusCode !== 404) {
        console.error("[GET /api/photos/:photoId] PhotoServiceError:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }

      return new Response(JSON.stringify(apiError), {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle unexpected errors (500 Internal Server Error)
    console.error("[GET /api/photos/:photoId] Unexpected error:", error);

    const apiError: ApiError = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    };

    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
