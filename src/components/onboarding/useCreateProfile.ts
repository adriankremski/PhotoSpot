/**
 * Custom hook for creating user profile via API
 *
 * Calls the POST /api/users/:userId/profile endpoint which uses the
 * createUserProfile service method from profile.ts
 */

import { useState } from "react";
import type { ApiCreateProfileRequest, ApiCreateProfileResponse } from "./types";
import type { ApiError } from "@/types";

interface UseCreateProfileOptions {
  userId: string;
  onSuccess?: (response: ApiCreateProfileResponse) => void;
  onError?: (error: Error) => void;
}

interface UseCreateProfileReturn {
  createProfile: (data: ApiCreateProfileRequest) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string> | null;
}

/**
 * Hook to create user profile
 *
 * Error handling aligned with ProfileServiceError responses:
 * - 400: Validation errors (from Zod or service layer)
 * - 401: Authentication required
 * - 403: Authorization failed (e.g., non-photographer trying to set photographer fields)
 * - 409: Profile already exists (treated as success)
 * - 500: Server errors
 */
export function useCreateProfile({ userId, onSuccess, onError }: UseCreateProfileOptions): UseCreateProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const createProfile = async (data: ApiCreateProfileRequest) => {
    setIsLoading(true);
    setError(null);
    setFieldErrors(null);

    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = (await response.json()) as ApiCreateProfileResponse | ApiError;

      // Handle success response (201 Created)
      if (response.ok) {
        if (onSuccess) {
          onSuccess(responseData as ApiCreateProfileResponse);
        }
        return;
      }

      // Handle error responses
      const errorResponse = responseData as ApiError;
      const errorMessage = errorResponse.error?.message || "Failed to create profile";
      const errorCode = errorResponse.error?.code;

      switch (response.status) {
        case 400:
          // Validation errors - check for Zod validation issues
          console.log("Validation errors", errorResponse.error?.details?.issues);
          if (errorResponse.error?.details?.issues) {
            const issues = errorResponse.error.details.issues as {
              path: string;
              message: string;
            }[];
            const errors: Record<string, string> = {};
            issues.forEach((issue) => {
              errors[issue.path] = issue.message;
            });
            setFieldErrors(errors);
            setError("Please fix the validation errors");
          } else {
            // Service-level validation error (e.g., USER_NOT_FOUND, INVALID_USER_DATA)
            setError(errorMessage);
          }
          break;

        case 401:
          // Authentication required - redirect to login
          setError("Authentication required. Please log in.");
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
          break;

        case 403:
          // Authorization failed (e.g., FORBIDDEN error from photographer-only fields check)
          setError(errorMessage);
          break;

        case 409:
          // Profile already exists (CONFLICT)
          // The service returns the existing profile, treat as success
          if (onSuccess && "profile" in responseData) {
            onSuccess(responseData as ApiCreateProfileResponse);
          }
          return;

        case 500:
          // Server errors (DATABASE_ERROR, INTERNAL_ERROR)
          setError("A server error occurred. Please try again later.");
          break;

        default:
          // Unexpected status code
          setError(errorMessage);
          break;
      }

      // Call error callback with structured error
      if (onError) {
        const err = new Error(errorMessage);
        (err as Error & { code?: string; statusCode?: number }).code = errorCode;
        (err as Error & { code?: string; statusCode?: number }).statusCode = response.status;
        onError(err);
      }
    } catch (err) {
      // Network or parsing errors
      const errorMessage = err instanceof Error ? err.message : "Network error occurred";
      setError(errorMessage);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createProfile,
    isLoading,
    error,
    fieldErrors,
  };
}
