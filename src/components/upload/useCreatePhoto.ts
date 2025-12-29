/**
 * Custom hook for creating photos via API
 * 
 * Handles multipart/form-data upload to POST /api/photos endpoint
 */

import { useState, useCallback } from 'react';
import type { CreatePhotoResponse, ApiError } from '@/types';

interface UseCreatePhotoOptions {
  onSuccess?: (response: CreatePhotoResponse) => void;
  onError?: (error: Error) => void;
}

interface UseCreatePhotoReturn {
  createPhoto: (formData: FormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string> | null;
}

/**
 * Hook to create (upload) a photo
 * 
 * Error handling aligned with PhotoServiceError responses:
 * - 400: Validation errors (invalid fields)
 * - 401: Authentication required
 * - 413: Payload too large (file exceeds 10MB)
 * - 422: Invalid coordinates or other unprocessable data
 * - 429: Rate limit exceeded (5 photos per 24h)
 * - 500: Server errors
 */
export function useCreatePhoto({
  onSuccess,
  onError,
}: UseCreatePhotoOptions): UseCreatePhotoReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);

  const createPhoto = useCallback(
    async (formData: FormData) => {
      setIsLoading(true);
      setError(null);
      setFieldErrors(null);

      try {
        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - browser will set it with boundary for multipart
        });

        const responseData = (await response.json()) as CreatePhotoResponse | ApiError;

        // Handle success response (201 Created)
        if (response.ok) {
          if (onSuccess) {
            onSuccess(responseData as CreatePhotoResponse);
          }
          return;
        }

        // Handle error responses
        const errorResponse = responseData as ApiError;
        const errorMessage = errorResponse.error?.message || 'Failed to upload photo';
        const errorCode = errorResponse.error?.code;

        switch (response.status) {
          case 400:
            // Validation errors
            if (errorResponse.error?.details?.issues) {
              const issues = errorResponse.error.details.issues as Array<{
                path: string;
                message: string;
              }>;
              const errors: Record<string, string> = {};
              issues.forEach((issue) => {
                errors[issue.path] = issue.message;
              });
              setFieldErrors(errors);
              setError('Please fix the validation errors');
            } else {
              setError(errorMessage);
            }
            break;

          case 401:
            // Authentication required
            setError('Authentication required. Please log in.');
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            break;

          case 413:
            // File too large
            setError('File size exceeds 10 MB limit. Please choose a smaller file.');
            break;

          case 422:
            // Invalid coordinates or unprocessable entity
            setError(errorMessage || 'Invalid location coordinates. Please select a valid location.');
            break;

          case 429:
            // Rate limit exceeded
            setError(
              errorMessage || 
              'Daily upload limit reached. You can upload up to 5 photos per day. Please try again tomorrow.'
            );
            break;

          case 500:
            // Server errors
            setError('A server error occurred. Please try again later.');
            break;

          default:
            // Unexpected status code
            setError(errorMessage);
            break;
        }

        // Call error callback
        if (onError) {
          const err = new Error(errorMessage);
          (err as Error & { code?: string; statusCode?: number }).code = errorCode;
          (err as Error & { code?: string; statusCode?: number }).statusCode = response.status;
          onError(err);
        }
      } catch (err) {
        // Network or parsing errors
        const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
        setError(errorMessage);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    createPhoto,
    isLoading,
    error,
    fieldErrors,
  };
}

