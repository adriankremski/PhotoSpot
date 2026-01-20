/**
 * Tests for POST /api/auth/login endpoint
 *
 * Covers:
 * - Successful login
 * - Invalid input validation
 * - Invalid credentials
 * - Rate limiting
 * - Unexpected errors
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./login";
import type { APIContext } from "astro";
import type { AuthResponse } from "../../../types";

// Mock the validators and services
vi.mock("../../../lib/validators/auth", () => ({
  loginSchema: {
    parse: vi.fn(),
  },
}));

vi.mock("../../../lib/services/auth", () => ({
  loginUser: vi.fn(),
  AuthServiceError: class AuthServiceError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = "AuthServiceError";
    }
  },
}));

import { loginSchema } from "../../../lib/validators/auth";
import { loginUser, AuthServiceError } from "../../../lib/services/auth";
import { ZodError } from "zod";

describe("POST /api/auth/login", () => {
  let mockRequest: Request;
  let mockContext: Partial<APIContext>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockContext = {
      locals: {
        supabase: {} as any,
      },
    };
  });

  describe("Successful login", () => {
    it("should return 200 with user and session data on valid credentials", async () => {
      const mockAuthResponse: AuthResponse = {
        user: {
          id: "user-123",
          email: "test@example.com",
          user_metadata: {
            role: "photographer",
          },
        },
        session: {
          access_token: "access-token-xyz",
          refresh_token: "refresh-token-abc",
          expires_in: 3600,
        },
      };

      // Mock request
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      // Mock validation success
      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "password123",
      });

      // Mock service success
      vi.mocked(loginUser).mockResolvedValue(mockAuthResponse);

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockAuthResponse);
      expect(loginUser).toHaveBeenCalledWith("test@example.com", "password123", mockContext.locals!.supabase);
    });
  });

  describe("Input validation errors", () => {
    it("should return 400 when email is invalid", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
        }),
      });

      // Mock Zod validation error
      const zodError = new ZodError([
        {
          code: "invalid_string",
          path: ["email"],
          message: "Invalid email address",
          validation: "email",
        },
      ]);

      vi.mocked(loginSchema.parse).mockImplementation(() => {
        throw zodError;
      });

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toBe("Invalid request payload");
      expect(data.error.details).toBeDefined();
      expect(loginUser).not.toHaveBeenCalled();
    });

    it("should return 400 when password is missing", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "",
        }),
      });

      const zodError = new ZodError([
        {
          code: "too_small",
          path: ["password"],
          message: "Password is required",
          minimum: 1,
          type: "string",
          inclusive: true,
        },
      ]);

      vi.mocked(loginSchema.parse).mockImplementation(() => {
        throw zodError;
      });

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(loginUser).not.toHaveBeenCalled();
    });
  });

  describe("Authentication errors", () => {
    it("should return 401 when credentials are invalid", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "wrongpassword",
      });

      // Mock service throwing invalid credentials error
      const authError = new AuthServiceError("Invalid email or password", "INVALID_CREDENTIALS", 401);

      vi.mocked(loginUser).mockRejectedValue(authError);

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error.code).toBe("INVALID_CREDENTIALS");
      expect(data.error.message).toBe("Invalid email or password");
    });

    it("should return 429 when rate limit is exceeded", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "password123",
      });

      // Mock rate limit error
      const rateLimitError = new AuthServiceError(
        "Too many login attempts. Please try again later",
        "RATE_LIMIT_EXCEEDED",
        429
      );

      vi.mocked(loginUser).mockRejectedValue(rateLimitError);

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(429);
      expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(data.error.message).toContain("Too many");
    });
  });

  describe("Unexpected errors", () => {
    it("should return 500 on unexpected error", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "password123",
      });

      // Mock unexpected error
      vi.mocked(loginUser).mockRejectedValue(new Error("Database connection failed"));

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(data.error.message).toBe("An unexpected error occurred");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should return 500 when JSON parsing fails", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Response format", () => {
    it("should always return JSON with proper Content-Type header", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const mockAuthResponse: AuthResponse = {
        user: {
          id: "user-123",
          email: "test@example.com",
          user_metadata: {},
        },
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
        },
      };

      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "password123",
      });

      vi.mocked(loginUser).mockResolvedValue(mockAuthResponse);

      // Execute
      const response = await POST(mockContext as APIContext);

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/json");

      // Verify response is valid JSON
      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  describe("Security considerations", () => {
    it("should not expose sensitive information in error responses", async () => {
      mockRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      vi.mocked(loginSchema.parse).mockReturnValue({
        email: "test@example.com",
        password: "wrongpassword",
      });

      const authError = new AuthServiceError("Invalid email or password", "INVALID_CREDENTIALS", 401);

      vi.mocked(loginUser).mockRejectedValue(authError);

      // Execute
      const response = await POST(mockContext as APIContext);
      const data = await response.json();

      // Assert - error message should not reveal if email exists
      expect(data.error.message).not.toContain("email not found");
      expect(data.error.message).not.toContain("user does not exist");
      expect(data.error.message).toBe("Invalid email or password");
    });
  });
});
