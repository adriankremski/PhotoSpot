/**
 * POST /api/auth/login
 *
 * Authenticates an existing user using email and password.
 * Returns user profile stub and session tokens on success.
 *
 * @see .ai/login-implementation-plan.md for detailed implementation plan
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { loginSchema } from "../../../lib/validators/auth";
import { loginUser, AuthServiceError } from "../../../lib/services/auth";
import type { ApiError, AuthResponse } from "../../../types";

export const prerender = false;

/**
 * Handles user login requests
 *
 * Request Body:
 * - email: string (valid email format)
 * - password: string (min 1 character)
 *
 * Success Response (200):
 * - user: { id, email, user_metadata }
 * - session: { access_token, refresh_token, expires_in }
 *
 * Error Responses:
 * - 400: Invalid input (Zod validation failed)
 * - 401: Invalid credentials (wrong email/password)
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const payload = await request.json();

    // Validate input with Zod schema
    const { email, password } = loginSchema.parse(payload);

    // Authenticate user via service layer
    const data: AuthResponse = await loginUser(email, password, locals.supabase);

    // Return success response
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const errorResponse: ApiError = {
        error: {
          code: "INVALID_INPUT",
          message: "Invalid request payload",
          details: err.flatten(),
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle authentication service errors
    if (err instanceof AuthServiceError) {
      const errorResponse: ApiError = {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: err.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Handle unexpected errors
    console.error("[login] Unexpected error:", err);

    const errorResponse: ApiError = {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
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
