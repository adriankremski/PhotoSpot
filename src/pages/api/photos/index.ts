/**
 * GET /api/photos
 * 
 * Retrieves a public list of approved photos optimized for map viewport.
 * Only non-sensitive fields are returned (public location, NO EXIF, NO exact location).
 * Supports filtering by bounding box, category, season, time of day, and pagination.
 * 
 * @see .ai/get-photos-implementation-plan.md for detailed implementation plan
 */

import type { APIRoute } from 'astro';
import { ZodError } from 'zod';
import { photoQueryParamsSchema } from '../../../lib/validators/photos';
import { getPublicPhotos, PhotoServiceError } from '../../../lib/services/photos';
import type { ApiError, ListResponse, PhotoListItemDto } from '../../../types';

export const prerender = false;

/**
 * Handles photo list requests for map view
 * 
 * Query Parameters:
 * - bbox: string (optional) - Bounding box as "minLng,minLat,maxLng,maxLat"
 * - category: string (optional) - Photo category filter
 * - season: string (optional) - Season filter
 * - time_of_day: string (optional) - Time of day filter
 * - photographer_only: boolean (optional) - Filter by photographer uploads
 * - limit: number (optional, default: 200, max: 200) - Number of results
 * - offset: number (optional, default: 0) - Pagination offset
 * 
 * Success Response (200):
 * - data: PhotoListItemDto[] - Array of photo items
 * - meta: PaginationMeta - Pagination information
 * 
 * Error Responses:
 * - 400: Invalid input (validation failed)
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Parse query parameters from URL
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    
    // Validate and transform query parameters with Zod schema
    const validatedParams = photoQueryParamsSchema.parse(queryParams);
    
    // Retrieve photos via service layer
    const response: ListResponse<PhotoListItemDto> = await getPublicPhotos(
      validatedParams,
      locals.supabase
    );
    
    // Return success response
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle Zod validation errors (400 Bad Request)
    if (error instanceof ZodError) {
      const apiError: ApiError = {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid query parameters',
          details: {
            issues: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        },
      };
      
      return new Response(JSON.stringify(apiError), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
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
      
      // Log error for monitoring
      console.error('[GET /api/photos] PhotoServiceError:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      
      return new Response(JSON.stringify(apiError), {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Handle unexpected errors (500 Internal Server Error)
    console.error('[GET /api/photos] Unexpected error:', error);
    
    const apiError: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
    };
    
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

