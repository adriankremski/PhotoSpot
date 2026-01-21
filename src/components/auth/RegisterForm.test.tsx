/**
 * Integration tests for RegisterForm component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    href: "/",
  },
  writable: true,
});

// Mock Supabase client - use hoisted variable
const { mockSetSession } = vi.hoisted(() => ({
  mockSetSession: vi.fn(),
}));

vi.mock("@/db/supabase.client", () => ({
  supabaseClient: {
    auth: {
      setSession: mockSetSession,
    },
  },
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSession.mockResolvedValue({ data: {}, error: null });
  });

  describe("rendering", () => {
    it("should render all form fields", () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByText("I am a")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("should render role options", () => {
      render(<RegisterForm />);

      expect(screen.getByText("Photographer")).toBeInTheDocument();
      expect(screen.getByText("Enthusiast")).toBeInTheDocument();
    });

    it("should not show error banner initially", () => {
      render(<RegisterForm />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("form validation", () => {
    it("should show error for invalid email format", async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText("Email");
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });

      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      });
    });

    it("should show error for short password", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "pass1" } });

      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters long")).toBeInTheDocument();
      });
    });

    it("should show error for password without letters", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "12345678" } });

      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must contain at least one letter")).toBeInTheDocument();
      });
    });

    it("should show error for password without numbers", async () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "passwordonly" } });

      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Password must contain at least one number")).toBeInTheDocument();
      });
    });

    it("should clear field error when user types", async () => {
      render(<RegisterForm />);

      // Submit to trigger errors
      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid email address")).toBeInTheDocument();
      });

      // Type in email field
      const emailInput = screen.getByLabelText("Email");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      // Error should be cleared
      expect(screen.queryByText("Invalid email address")).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("should submit form with valid data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });

      render(<RegisterForm />);

      // Fill in the form
      const emailInput = screen.getByLabelText("Email");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.click(photographerCard!);

      // Submit the form
      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

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

    it("should show loading state during submission", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      render(<RegisterForm />);

      // Fill in valid data
      const emailInput = screen.getByLabelText("Email");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.click(photographerCard!);

      // Submit
      const submitButton = screen.getByRole("button", { name: /create account/i });
      fireEvent.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });
    });

    it("should disable form fields during submission", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      render(<RegisterForm />);

      // Fill in valid data
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Photographer").closest('[role="radio"]')!);

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Email")).toBeDisabled();
        expect(screen.getByPlaceholderText("Enter your password")).toBeDisabled();
      });

      // Resolve
      resolvePromise!({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });
    });
  });

  describe("error handling", () => {
    it("should display error banner for 409 conflict", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: { message: "User already exists" },
        }),
      });

      render(<RegisterForm />);

      // Fill and submit
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Photographer").closest('[role="radio"]')!);
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText("Email already registered. Please sign in instead.")).toBeInTheDocument();
      });
    });

    it("should display field-specific errors from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: "Validation failed",
            details: {
              email: "Email is already taken",
              password: "Password is too weak",
            },
          },
        }),
      });

      render(<RegisterForm />);

      // Fill and submit
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Photographer").closest('[role="radio"]')!);
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText("Email is already taken")).toBeInTheDocument();
        expect(screen.getByText("Password is too weak")).toBeInTheDocument();
      });
    });

    it("should display generic error banner for network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<RegisterForm />);

      // Fill and submit
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Photographer").closest('[role="radio"]')!);
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Unable to connect. Please check your internet connection and try again.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("user interactions", () => {
    it("should allow selecting photographer role", () => {
      render(<RegisterForm />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.click(photographerCard!);

      expect(photographerCard).toHaveAttribute("aria-checked", "true");
    });

    it("should allow selecting enthusiast role", () => {
      render(<RegisterForm />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.click(enthusiastCard!);

      expect(enthusiastCard).toHaveAttribute("aria-checked", "true");
    });

    it("should allow switching between roles", () => {
      render(<RegisterForm />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');

      // Select photographer
      fireEvent.click(photographerCard!);
      expect(photographerCard).toHaveAttribute("aria-checked", "true");

      // Switch to enthusiast
      fireEvent.click(enthusiastCard!);
      expect(enthusiastCard).toHaveAttribute("aria-checked", "true");
      expect(photographerCard).toHaveAttribute("aria-checked", "false");
    });

    it("should toggle password visibility", () => {
      render(<RegisterForm />);

      const passwordInput = screen.getByPlaceholderText("Enter your password");
      expect(passwordInput).toHaveAttribute("type", "password");

      // Show password
      const showButton = screen.getByLabelText("Show password");
      fireEvent.click(showButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      // Hide password
      const hideButton = screen.getByLabelText("Hide password");
      fireEvent.click(hideButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("accessibility", () => {
    it("should have accessible form structure", () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("should have aria-invalid on fields with errors", async () => {
      render(<RegisterForm />);

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByPlaceholderText("Enter your password")).toHaveAttribute("aria-invalid", "true");
      });
    });

    it("should set aria-busy during submission", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      render(<RegisterForm />);

      // Fill and submit
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
      fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByText("Photographer").closest('[role="radio"]')!);
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole("button", { name: /creating account/i });
        expect(submitButton).toHaveAttribute("aria-busy", "true");
      });

      // Resolve
      resolvePromise!({
        ok: true,
        json: async () => ({
          user: { id: "123", email: "test@example.com" },
          session: { access_token: "token", refresh_token: "refresh", expires_in: 3600 },
        }),
      });
    });
  });
});
