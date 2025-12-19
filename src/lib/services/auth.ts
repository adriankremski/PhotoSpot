/**
 * Authentication service layer
 * 
 * Encapsulates all authentication-related business logic and Supabase Auth interactions.
 * Provides a clean interface for auth operations with proper error handling.
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type { RegisterUserCommand, AuthResponse, UserRole } from '../../types';

/**
 * Custom error types for authentication operations
 */
export class AuthServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/**
 * Registers a new user with Supabase Auth
 * 
 * @param payload - User registration data (email, password, role)
 * @param supabase - Supabase client instance
 * @returns Promise resolving to user and session data
 * @throws AuthServiceError for various failure scenarios
 */
export async function registerUser(
  payload: RegisterUserCommand,
  supabase: SupabaseClient
): Promise<AuthResponse> {
  try {
    // Call Supabase Auth signUp
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: payload.role,
        },
      },
    });

    // Handle Supabase errors
    if (error) {
      return handleSupabaseAuthError(error);
    }

    // Validate response data
    if (!data.user || !data.session) {
      throw new AuthServiceError(
        'Registration succeeded but user or session data is missing',
        'INCOMPLETE_RESPONSE',
        500
      );
    }

    // Map Supabase response to our AuthResponse type
    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        user_metadata: {
          role: (data.user.user_metadata?.role as UserRole) || payload.role,
        },
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
      },
    };
  } catch (error) {
    // Re-throw AuthServiceError as-is
    if (error instanceof AuthServiceError) {
      throw error;
    }

    // Wrap unexpected errors
    throw new AuthServiceError(
      'An unexpected error occurred during registration',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Maps Supabase Auth errors to our custom error format
 * 
 * @param error - Supabase Auth error object
 * @throws AuthServiceError with appropriate status code and message
 */
function handleSupabaseAuthError(error: { message: string; status?: number; code?: string }): never {
  // User already exists
  if (error.message?.includes('already registered') || error.code === 'user_already_exists') {
    throw new AuthServiceError(
      'Email already registered',
      'EMAIL_ALREADY_EXISTS',
      409
    );
  }

  // Invalid email format (shouldn't happen after Zod validation, but defensive)
  if (error.message?.includes('invalid email') || error.code === 'invalid_email') {
    throw new AuthServiceError(
      'Invalid email address',
      'INVALID_EMAIL',
      400
    );
  }

  // Weak password (Supabase has its own password policy)
  if (error.message?.includes('password') && error.message?.includes('weak')) {
    throw new AuthServiceError(
      'Password does not meet security requirements',
      'weak_password',
      400
    );
  }

  // Rate limit exceeded
  if (error.status === 429 || error.message?.includes('rate limit')) {
    throw new AuthServiceError(
      'Too many registration attempts. Please try again later',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }

  // Generic Supabase error
  throw new AuthServiceError(
    error.message || 'Authentication service error',
    error.code || 'AUTH_ERROR',
    error.status || 500
  );
}

/**
 * Logs in an existing user
 * 
 * @param email - User's email address
 * @param password - User's password
 * @param supabase - Supabase client instance
 * @returns Promise resolving to user and session data
 * @throws AuthServiceError for various failure scenarios
 */
export async function loginUser(
  email: string,
  password: string,
  supabase: SupabaseClient
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Invalid credentials
      if (error.message?.includes('Invalid login credentials')) {
        throw new AuthServiceError(
          'Invalid email or password',
          'INVALID_CREDENTIALS',
          401
        );
      }

      throw new AuthServiceError(
        error.message || 'Login failed',
        error.code || 'LOGIN_ERROR',
        error.status || 500
      );
    }

    if (!data.user || !data.session) {
      throw new AuthServiceError(
        'Login succeeded but user or session data is missing',
        'INCOMPLETE_RESPONSE',
        500
      );
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        user_metadata: data.user.user_metadata,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in || 3600,
      },
    };
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError(
      'An unexpected error occurred during login',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Initiates password reset flow
 * 
 * @param email - User's email address
 * @param supabase - Supabase client instance
 * @returns Promise resolving when reset email is sent
 * @throws AuthServiceError on failure
 */
export async function requestPasswordReset(
  email: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new AuthServiceError(
        error.message || 'Failed to send password reset email',
        error.code || 'PASSWORD_RESET_ERROR',
        error.status || 500
      );
    }
  } catch (error) {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    throw new AuthServiceError(
      'An unexpected error occurred during password reset',
      'INTERNAL_ERROR',
      500,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

