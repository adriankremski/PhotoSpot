/**
 * Mock Supabase client for testing
 * Provides test doubles for Supabase Auth operations
 */

import { vi } from "vitest";
import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Creates a mock Supabase client with configurable responses
 */
export function createMockSupabaseClient(overrides?: {
  signUpResponse?: { data: any; error: any };
  signInResponse?: { data: any; error: any };
  resetPasswordResponse?: { error: any };
}): SupabaseClient {
  const mockAuth = {
    signUp: vi.fn().mockResolvedValue(
      overrides?.signUpResponse || {
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            user_metadata: { role: "photographer" },
          },
          session: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_in: 3600,
          },
        },
        error: null,
      }
    ),
    signInWithPassword: vi.fn().mockResolvedValue(
      overrides?.signInResponse || {
        data: {
          user: {
            id: "test-user-id",
            email: "test@example.com",
            user_metadata: { role: "photographer" },
          },
          session: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_in: 3600,
          },
        },
        error: null,
      }
    ),
    resetPasswordForEmail: vi.fn().mockResolvedValue(overrides?.resetPasswordResponse || { error: null }),
    getUser: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  };

  return {
    auth: mockAuth,
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

/**
 * Mock Supabase error responses
 */
export const mockSupabaseErrors = {
  userAlreadyExists: {
    message: "User already registered",
    code: "user_already_exists",
    status: 400,
  },
  invalidEmail: {
    message: "Invalid email address",
    code: "invalid_email",
    status: 400,
  },
  weakPassword: {
    message: "Password is too weak",
    code: "weak_password",
    status: 400,
  },
  invalidCredentials: {
    message: "Invalid login credentials",
    code: "invalid_credentials",
    status: 400,
  },
  rateLimitExceeded: {
    message: "Rate limit exceeded",
    code: "rate_limit",
    status: 429,
  },
  genericError: {
    message: "An error occurred",
    code: "error",
    status: 500,
  },
};

/**
 * Creates a mock successful auth response
 */
export function createMockAuthResponse(overrides?: { userId?: string; email?: string; role?: string }) {
  return {
    data: {
      user: {
        id: overrides?.userId || "test-user-id",
        email: overrides?.email || "test@example.com",
        user_metadata: {
          role: overrides?.role || "photographer",
        },
      },
      session: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
      },
    },
    error: null,
  };
}

/**
 * Creates a mock error response
 */
export function createMockErrorResponse(error: { message: string; code?: string; status?: number }) {
  return {
    data: {
      user: null,
      session: null,
    },
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
    },
  };
}
