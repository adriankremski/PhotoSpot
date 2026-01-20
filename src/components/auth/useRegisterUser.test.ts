/**
 * Tests for useRegisterUser hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRegisterUser } from "./useRegisterUser";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocationAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    href: "/",
    assign: mockLocationAssign,
  },
  writable: true,
});

// Mock Supabase client
const mockSetSession = vi.fn();
vi.mock("@/db/supabase.client", () => ({
  supabaseClient: {
    auth: {
      setSession: mockSetSession,
    },
  },
}));

describe("useRegisterUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSession.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("initial state", () => {
    it("should initialize with empty values", () => {
      const { result } = renderHook(() => useRegisterUser());

      expect(result.current.values).toEqual({
        email: "",
        password: "",
        role: null,
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.loading).toBe(false);
      expect(result.current.registered).toBe(false);
    });
  });

  describe("handleChange", () => {
    it("should update email value", () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "test@example.com");
      });

      expect(result.current.values.email).toBe("test@example.com");
    });

    it("should update password value", () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("password", "password123");
      });

      expect(result.current.values.password).toBe("password123");
    });

    it("should update role value", () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("role", "photographer");
      });

      expect(result.current.values.role).toBe("photographer");
    });

    it("should clear field error when value changes", () => {
      const { result } = renderHook(() => useRegisterUser());

      // Set an error
      act(() => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      // Errors should be set due to validation
      expect(result.current.errors.email).toBeDefined();

      // Change email value
      act(() => {
        result.current.handleChange("email", "test@example.com");
      });

      // Email error should be cleared
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe("validation", () => {
    it("should reject invalid email format", async () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "invalid-email");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.email).toBe("Invalid email address");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reject password shorter than 8 characters", async () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "pass1");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.password).toBe("Password must be at least 8 characters long");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reject password without letters", async () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "12345678");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.password).toBe("Password must contain at least one letter");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reject password without numbers", async () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "passwordonly");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.password).toBe("Password must contain at least one number");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should reject missing role", async () => {
      const { result } = renderHook(() => useRegisterUser());

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.role).toBe("Please select a role");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should accept valid inputs", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe("API integration", () => {
    it("should call registration API with correct payload", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/register",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "test@example.com",
              password: "password123",
              role: "photographer",
            }),
          })
        );
      });
    });

    it("should set loading state during API call", async () => {
      const { result } = renderHook(() => useRegisterUser());

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      act(() => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({
            user: { id: "123", email: "test@example.com" },
            session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
          }),
        });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should store session and redirect on success", async () => {
      const { result } = renderHook(() => useRegisterUser());

      const mockSession = {
        access_token: "test-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: mockSession,
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: mockSession.access_token,
          refresh_token: mockSession.refresh_token,
        });
        expect(result.current.registered).toBe(true);
        expect(window.location.href).toBe("/onboarding");
      });
    });

    it("should handle 400 validation error", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Validation failed",
            details: {
              email: "Email is invalid",
              password: "Password is too weak",
            },
          },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors.email).toBe("Email is invalid");
        expect(result.current.errors.password).toBe("Password is too weak");
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle 409 conflict error (email already registered)", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            message: "User already exists",
          },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors.form).toBe("Email already registered. Please sign in instead.");
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle 429 rate limit error", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            message: "Too many requests",
          },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors.form).toBe("Too many registration attempts. Please try again later.");
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle network error", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors.form).toBe(
          "Unable to connect. Please check your internet connection and try again."
        );
        expect(result.current.loading).toBe(false);
      });
    });

    it("should handle generic server error", async () => {
      const { result } = renderHook(() => useRegisterUser());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: "Internal server error",
          },
        }),
      });

      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors.form).toBe("Internal server error");
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("form submission", () => {
    it("should prevent default form submission", async () => {
      const { result } = renderHook(() => useRegisterUser());

      const mockEvent = {
        preventDefault: vi.fn(),
      } as any;

      await act(async () => {
        result.current.handleSubmit(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it("should clear previous errors on new submission", async () => {
      const { result } = renderHook(() => useRegisterUser());

      // First submission with invalid data
      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      expect(result.current.errors.email).toBeDefined();

      // Fix the data
      act(() => {
        result.current.handleChange("email", "test@example.com");
        result.current.handleChange("password", "password123");
        result.current.handleChange("role", "photographer");
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });

      // Second submission with valid data
      await act(async () => {
        result.current.handleSubmit(new Event("submit") as any);
      });

      await waitFor(() => {
        expect(result.current.errors).toEqual({});
      });
    });
  });
});
