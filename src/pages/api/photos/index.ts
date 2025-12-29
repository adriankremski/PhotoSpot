/**
 * Photo API endpoints
 * 
 * GET /api/photos
 * Retrieves a public list of approved photos optimized for map viewport.
 * Only non-sensitive fields are returned (public location, NO EXIF, NO exact location).
 * Supports filtering by bounding box, category, season, time of day, and pagination.
 * 
 * POST /api/photos
 * Creates a new photo with file upload and metadata.
 * Requires authentication and handles file upload, EXIF extraction, location blurring.
 * 
 * @see .ai/get-photos-implementation-plan.md for GET implementation plan
 * @see .ai/create-photo-implementation-plan.md for POST implementation plan
 */

import type { APIRoute } from 'astro';
import { ZodError } from 'zod';
import {
  photoQueryParamsSchema,
  createPhotoCommandSchema,
  fileValidationSchema,
} from '../../../lib/validators/photos';
import {
  getPublicPhotos,
  createPhoto,
  PhotoServiceError,
  type CreatePhotoInput,
} from '../../../lib/services/photos';
import {
  parseMultipartRequest,
  MultipartParseError,
} from '../../../lib/utils/multipart';
import type {
  ApiError,
  ListResponse,
  PhotoListItemDto,
  CreatePhotoResponse,
} from '../../../types';

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

/**
 * Handles photo upload requests
 * 
 * Request Body (multipart/form-data):
 * - file: File (required) - JPG/PNG image, max 10MB
 * - title: string (required) - Photo title, 1-200 chars
 * - description: string (optional) - Photo description, max 1000 chars
 * - category: PhotoCategory (required) - Photo category enum
 * - season: Season (optional) - Season enum
 * - time_of_day: TimeOfDay (optional) - Time of day enum
 * - latitude: number (required) - Latitude (-90 to 90)
 * - longitude: number (required) - Longitude (-180 to 180)
 * - blur_location: boolean (optional) - Whether to blur location
 * - blur_radius: number (optional) - Blur radius in meters (100-500)
 * - tags: string[] (optional) - Array of tag names, max 10 tags
 * - gear: GearInfo (optional) - Camera gear information
 * 
 * Success Response (201 Created):
 * - message: Success message
 * - photo: Lightweight photo data (id, title, status, file_url, created_at)
 * 
 * Error Responses:
 * - 400: Invalid input (validation failed or malformed request)
 * - 401: Unauthorized (not authenticated)
 * - 413: Payload too large (file > 10MB)
 * - 422: Unprocessable entity (invalid coordinates or EXIF parsing failed)
 * - 429: Too many requests (rate limit exceeded)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Check authentication
    const { user, supabase } = locals;
    
    if (!user) {
      const apiError: ApiError = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      };
      
      return new Response(JSON.stringify(apiError), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Step 2: Parse multipart form data
    let parsedFormData;
    try {
      parsedFormData = await parseMultipartRequest(request);
    } catch (error) {
      if (error instanceof MultipartParseError) {
        // Handle file size limit specially
        if (error.statusCode === 413) {
          const apiError: ApiError = {
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: error.message,
            },
          };
          
          return new Response(JSON.stringify(apiError), {
            status: 413,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        const apiError: ApiError = {
          error: {
            code: error.code,
            message: error.message,
          },
        };
        
        return new Response(JSON.stringify(apiError), {
          status: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      throw error;
    }

    // Step 3: Validate file
    try {
      fileValidationSchema.parse({
        size: parsedFormData.file.size,
        type: parsedFormData.file.type,
        name: parsedFormData.file.name,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError: ApiError = {
          error: {
            code: 'INVALID_FILE',
            message: 'File validation failed',
            details: {
              issues: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
        };
        
        // Return 413 for file size errors
        const isSizeError = error.errors.some(e => e.path.includes('size'));
        const statusCode = isSizeError ? 413 : 400;
        
        return new Response(JSON.stringify(apiError), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      throw error;
    }

    // Step 4: Validate command data (metadata)
    const { file, ...commandData } = parsedFormData;
    let validatedCommand;
    
    try {
      validatedCommand = createPhotoCommandSchema.parse(commandData);
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError: ApiError = {
          error: {
            code: 'INVALID_INPUT',
            message: 'Validation failed',
            details: {
              issues: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
          },
        };
        
        // Return 422 for coordinate validation errors
        const isCoordinateError = error.errors.some(e => 
          e.path.includes('latitude') || e.path.includes('longitude')
        );
        const statusCode = isCoordinateError ? 422 : 400;
        
        return new Response(JSON.stringify(apiError), {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      throw error;
    }

    // Step 5: Create photo via service layer
    const input: CreatePhotoInput = {
      ...validatedCommand,
      file,
    };

    const response: CreatePhotoResponse = await createPhoto(user.id, input, supabase);

    // Step 6: Return success response (201 Created)
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
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
      console.error('[POST /api/photos] PhotoServiceError:', {
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
    console.error('[POST /api/photos] Unexpected error:', error);
    
    const apiError: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while creating photo',
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

