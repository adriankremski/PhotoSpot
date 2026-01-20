/**
 * PATCH /api/auth/update-metadata
 * Updates user metadata (e.g., onboarding completion status)
 */

import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const updateMetadataSchema = z.object({
  onboardingCompleted: z.boolean().optional(),
});

export const PATCH: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    const session = locals.session;
    const user = locals.user;

    if (!session || !user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateMetadataSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validation.error,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { onboardingCompleted } = validation.data;

    // Update user metadata
    const supabase = locals.supabase;
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        onboardingCompleted,
      },
    });

    if (error) {
      console.error("Error updating user metadata:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "UPDATE_FAILED",
            message: "Failed to update user metadata",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "User metadata updated successfully",
        user: {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in update-metadata endpoint:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
