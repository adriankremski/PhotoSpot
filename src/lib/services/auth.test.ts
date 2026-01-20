/**
 * Tests for authentication service layer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerUser, loginUser, requestPasswordReset, AuthServiceError } from "./auth";
import {
  createMockSupabaseClient,
  createMockAuthResponse,
  createMockErrorResponse,
  mockSupabaseErrors,
} from "../../test/mocks/supabase";
import type { RegisterUserCommand } from "../../types";

describe("registerUser", () => {
  const validPayload: RegisterUserCommand = {
    email: "test@example.com",
    password: "password123",
    role: "photographer",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful registration", () => {
    it("should register a photographer successfully", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockAuthResponse({
          email: "photographer@example.com",
          role: "photographer",
        }),
      });

      const result = await registerUser(
        { ...validPayload, email: "photographer@example.com", role: "photographer" },
        mockClient
      );

      expect(result).toEqual({
        user: {
          id: "test-user-id",
          email: "photographer@example.com",
          user_metadata: {
            role: "photographer",
          },
        },
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
        },
      });

      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: "photographer@example.com",
        password: "password123",
        options: {
          data: {
            role: "photographer",
          },
        },
      });
    });

    it("should register an enthusiast successfully", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockAuthResponse({
          email: "enthusiast@example.com",
          role: "enthusiast",
        }),
      });

      const result = await registerUser(
        { ...validPayload, email: "enthusiast@example.com", role: "enthusiast" },
        mockClient
      );

      expect(result.user.user_metadata.role).toBe("enthusiast");
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: "enthusiast@example.com",
        password: "password123",
        options: {
          data: {
            role: "enthusiast",
          },
        },
      });
    });

    it("should return valid session tokens", async () => {
      const mockClient = createMockSupabaseClient();
      const result = await registerUser(validPayload, mockClient);

      expect(result.session).toHaveProperty("access_token");
      expect(result.session).toHaveProperty("refresh_token");
      expect(result.session).toHaveProperty("expires_in");
      expect(result.session.access_token).toBe("mock-access-token");
      expect(result.session.refresh_token).toBe("mock-refresh-token");
      expect(result.session.expires_in).toBe(3600);
    });
  });

  describe("error handling", () => {
    it("should throw 409 error when email already exists", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.userAlreadyExists),
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "EMAIL_ALREADY_EXISTS",
        statusCode: 409,
        message: "Email already registered",
      });
    });

    it("should throw 400 error for invalid email", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.invalidEmail),
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "INVALID_EMAIL",
        statusCode: 400,
      });
    });

    it("should throw 400 error for weak password", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.weakPassword),
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "weak_password",
        statusCode: 400,
      });
    });

    it("should throw 429 error when rate limit exceeded", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.rateLimitExceeded),
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "RATE_LIMIT_EXCEEDED",
        statusCode: 429,
      });
    });

    it("should throw 500 error when user data is missing", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: {
          data: {
            user: null,
            session: {
              access_token: "token",
              refresh_token: "refresh",
              expires_in: 3600,
            },
          },
          error: null,
        },
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "INCOMPLETE_RESPONSE",
        statusCode: 500,
      });
    });

    it("should throw 500 error when session data is missing", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: {
          data: {
            user: {
              id: "test-id",
              email: "test@example.com",
              user_metadata: { role: "photographer" },
            },
            session: null,
          },
          error: null,
        },
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "INCOMPLETE_RESPONSE",
        statusCode: 500,
      });
    });

    it("should handle generic Supabase errors", async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.genericError),
      });

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
    });

    it("should wrap unexpected errors", async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.auth.signUp = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(registerUser(validPayload, mockClient)).rejects.toThrow(AuthServiceError);
      await expect(registerUser(validPayload, mockClient)).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful login", () => {
    it("should login user successfully", async () => {
      const mockClient = createMockSupabaseClient({
        signInResponse: createMockAuthResponse({
          email: "test@example.com",
          role: "photographer",
        }),
      });

      const result = await loginUser("test@example.com", "password123", mockClient);

      expect(result).toEqual({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          user_metadata: {
            role: "photographer",
          },
        },
        session: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
        },
      });

      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should return valid session tokens", async () => {
      const mockClient = createMockSupabaseClient();
      const result = await loginUser("test@example.com", "password123", mockClient);

      expect(result.session).toHaveProperty("access_token");
      expect(result.session).toHaveProperty("refresh_token");
      expect(result.session).toHaveProperty("expires_in");
    });
  });

  describe("error handling", () => {
    it("should throw 401 error for invalid credentials", async () => {
      const mockClient = createMockSupabaseClient({
        signInResponse: createMockErrorResponse({
          message: "Invalid login credentials",
          code: "invalid_credentials",
          status: 400,
        }),
      });

      await expect(loginUser("test@example.com", "wrongpassword", mockClient)).rejects.toThrow(AuthServiceError);
      await expect(loginUser("test@example.com", "wrongpassword", mockClient)).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
        message: "Invalid email or password",
      });
    });

    it("should throw 500 error when user data is missing", async () => {
      const mockClient = createMockSupabaseClient({
        signInResponse: {
          data: {
            user: null,
            session: {
              access_token: "token",
              refresh_token: "refresh",
              expires_in: 3600,
            },
          },
          error: null,
        },
      });

      await expect(loginUser("test@example.com", "password123", mockClient)).rejects.toThrow(AuthServiceError);
      await expect(loginUser("test@example.com", "password123", mockClient)).rejects.toMatchObject({
        code: "INCOMPLETE_RESPONSE",
        statusCode: 500,
      });
    });

    it("should wrap unexpected errors", async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.auth.signInWithPassword = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(loginUser("test@example.com", "password123", mockClient)).rejects.toThrow(AuthServiceError);
      await expect(loginUser("test@example.com", "password123", mockClient)).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });
  });
});

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful password reset", () => {
    it("should send password reset email successfully", async () => {
      const mockClient = createMockSupabaseClient({
        resetPasswordResponse: { error: null },
      });

      await expect(requestPasswordReset("test@example.com", mockClient)).resolves.toBeUndefined();

      expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith("test@example.com");
    });
  });

  describe("error handling", () => {
    it("should throw error when reset fails", async () => {
      const mockClient = createMockSupabaseClient({
        resetPasswordResponse: {
          error: {
            message: "Failed to send email",
            code: "email_error",
            status: 500,
          },
        },
      });

      await expect(requestPasswordReset("test@example.com", mockClient)).rejects.toThrow(AuthServiceError);
      await expect(requestPasswordReset("test@example.com", mockClient)).rejects.toMatchObject({
        code: "email_error",
        statusCode: 500,
      });
    });

    it("should wrap unexpected errors", async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.auth.resetPasswordForEmail = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(requestPasswordReset("test@example.com", mockClient)).rejects.toThrow(AuthServiceError);
      await expect(requestPasswordReset("test@example.com", mockClient)).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });
  });
});
