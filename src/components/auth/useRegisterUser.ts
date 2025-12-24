/**
 * Custom hook for user registration
 * Handles form state, validation, API calls, and session management
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import type { RegisterUserCommand, AuthResponse, UserRole } from '@/types';
import { supabaseClient } from '@/db/supabase.client';

/**
 * Registration form internal state
 */
export interface RegisterFormValues {
  email: string;
  password: string;
  role: UserRole | null;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  role?: string;
  form?: string; // API-level error summary
}

/**
 * Hook return value
 */
export interface RegisterViewModel {
  values: RegisterFormValues;
  errors: RegisterFormErrors;
  loading: boolean;
  registered: boolean;
  handleChange: (field: keyof RegisterFormValues, value: string | UserRole | null) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

/**
 * Client-side validation schema
 */
const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['photographer', 'enthusiast'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
});

/**
 * Custom hook for registration logic
 */
export function useRegisterUser(): RegisterViewModel {
  const [values, setValues] = useState<RegisterFormValues>({
    email: '',
    password: '',
    role: null,
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  /**
   * Handle field value changes
   */
  const handleChange = useCallback(
    (field: keyof RegisterFormValues, value: string | UserRole | null) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      // Clear field error on change
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
    []
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous errors
      setErrors({});

      // Validate form data
      const validation = registerFormSchema.safeParse(values);

      if (!validation.success) {
        // Map Zod errors to form errors
        const fieldErrors: RegisterFormErrors = {};
        validation.error.errors.forEach((err) => {
          const field = err.path[0] as keyof RegisterFormErrors;
          if (field) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      // Prepare API request
      setLoading(true);

      try {
        const payload: RegisterUserCommand = {
          email: values.email,
          password: values.password,
          role: values.role as UserRole,
        };

        // Call registration API
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle error responses
          if (response.status === 400) {
            // Validation error
            if (data.error?.details) {
              // Map API field errors
              const apiErrors: RegisterFormErrors = {};
              Object.entries(data.error.details).forEach(([field, message]) => {
                if (field === 'email' || field === 'password' || field === 'role') {
                  apiErrors[field] = String(message);
                }
              });
              setErrors(apiErrors);
            } else {
              setErrors({ form: data.error?.message || 'Invalid input. Please check your details.' });
            }
          } else if (response.status === 409) {
            // Conflict - email already registered
            setErrors({ form: 'Email already registered. Please sign in instead.' });
          } else if (response.status === 429) {
            // Rate limit
            setErrors({ form: 'Too many registration attempts. Please try again later.' });
          } else {
            // Generic error
            setErrors({ form: data.error?.message || 'Registration failed. Please try again.' });
          }
          setLoading(false);
          return;
        }

        // Success - store session
        const authResponse = data as AuthResponse;
        
        // Set session in Supabase client
        await supabaseClient.auth.setSession({
          access_token: authResponse.session.access_token,
          refresh_token: authResponse.session.refresh_token,
        });

        setRegistered(true);
        setLoading(false);

        // Redirect to onboarding
        window.location.href = '/onboarding';
      } catch (error) {
        // Network or unexpected error
        console.error('Registration error:', error);
        setErrors({ form: 'Unable to connect. Please check your internet connection and try again.' });
        setLoading(false);
      }
    },
    [values]
  );

  return {
    values,
    errors,
    loading,
    registered,
    handleChange,
    handleSubmit,
  };
}

