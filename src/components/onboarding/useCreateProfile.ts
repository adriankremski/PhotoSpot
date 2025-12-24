/**
 * Custom hook for creating user profile via API
 */

import { useState } from 'react';
import type { ApiCreateProfileRequest, ApiCreateProfileResponse } from './types';

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
 */
export function useCreateProfile({
  userId,
  onSuccess,
  onError,
}: UseCreateProfileOptions): UseCreateProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const createProfile = async (data: ApiCreateProfileRequest) => {
    setIsLoading(true);
    setError(null);
    setFieldErrors(null);

    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle different error types
        if (response.status === 400) {
          // Validation errors
          if (responseData.error?.details?.issues) {
            const errors: Record<string, string> = {};
            responseData.error.details.issues.forEach((issue: { path: string[]; message: string }) => {
              const field = issue.path.join('.');
              errors[field] = issue.message;
            });
            setFieldErrors(errors);
            setError('Please fix the validation errors');
          } else {
            setError(responseData.error?.message || 'Validation failed');
          }
        } else if (response.status === 409) {
          // Profile already exists - treat as success
          if (onSuccess) {
            onSuccess(responseData as ApiCreateProfileResponse);
          }
          return;
        } else if (response.status === 401 || response.status === 403) {
          // Auth error - force logout
          setError('Authentication failed. Please log in again.');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          // Generic error
          setError(responseData.error?.message || 'Failed to create profile');
        }

        const err = new Error(responseData.error?.message || 'Failed to create profile');
        if (onError) {
          onError(err);
        }
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess(responseData as ApiCreateProfileResponse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
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

