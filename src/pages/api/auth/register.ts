/**
 * POST /api/auth/register
 *
 * Creates a new user account using Supabase Auth.
 * Accepts email, password, and role (photographer or enthusiast).
 * Returns user object and session tokens on success.
 */

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { registerUserSchema } from "../../../lib/validators/auth";
import { registerUser, AuthServiceError } from "../../../lib/services/auth";
import type { RegisterUserCommand } from "../../../types";

/**
 * Handles user registration requests
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON in request body");
    });

    // Validate input with Zod
    const validatedData = registerUserSchema.parse(body);

    // Normalize input to RegisterUserCommand format
    // Handle both flat and nested role formats
    const role = validatedData.role || validatedData.options?.data?.role;
    if (!role) {
      throw new Error("Role is required");
    }
    const command: RegisterUserCommand = {
      email: validatedData.email,
      password: validatedData.password,
      role: role,
    };

    // Call service layer to register user
    const result = await registerUser(command, locals.supabase);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle authentication service errors
    if (error instanceof AuthServiceError) {
      // Log error for monitoring (but never log passwords)
      console.error(`[Auth Error] ${error.code}: ${error.message}`, {
        code: error.code,
        statusCode: error.statusCode,
        // Obfuscate details that might contain sensitive info
        details: error.details ? "***" : undefined,
      });

      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        {
          status: error.statusCode,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle JSON parse errors
    if (error instanceof Error && error.message === "Invalid JSON in request body") {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Handle unexpected errors
    console.error("[Registration Error] Unexpected error:", error);

    // Generate trace ID for debugging
    const traceId = crypto.randomUUID();
    console.error(`[Registration Error] Trace ID: ${traceId}`, error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        traceId,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

// Disable prerendering for this API route
export const prerender = false;
