/**
 * Tests for PasswordInput component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render password label", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render password input field", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("type", "password");
    });

    it("should render visibility toggle button", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText("Show password");
      expect(toggleButton).toBeInTheDocument();
    });

    it("should render error message when provided", () => {
      render(<PasswordInput value="" onChange={mockOnChange} error="Password is required" />);

      expect(screen.getByText("Password is required")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
      render(<PasswordInput value="" onChange={mockOnChange} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText("Custom placeholder")).toBeInTheDocument();
    });
  });

  describe("input value", () => {
    it("should display the current value", () => {
      render(<PasswordInput value="test123" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter your password") as HTMLInputElement;
      expect(input.value).toBe("test123");
    });

    it("should call onChange when input value changes", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter your password");
      fireEvent.change(input, { target: { value: "newpassword123" } });

      expect(mockOnChange).toHaveBeenCalledWith("newpassword123");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("visibility toggle", () => {
    it("should start with password hidden", () => {
      render(<PasswordInput value="secret123" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("type", "password");
    });

    it("should show password when toggle is clicked", () => {
      render(<PasswordInput value="secret123" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText("Show password");
      fireEvent.click(toggleButton);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("type", "text");
      expect(screen.getByLabelText("Hide password")).toBeInTheDocument();
    });

    it("should hide password when toggle is clicked twice", () => {
      render(<PasswordInput value="secret123" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText("Show password");

      // Show password
      fireEvent.click(toggleButton);
      expect(screen.getByPlaceholderText("Enter your password")).toHaveAttribute("type", "text");

      // Hide password
      const hideButton = screen.getByLabelText("Hide password");
      fireEvent.click(hideButton);
      expect(screen.getByPlaceholderText("Enter your password")).toHaveAttribute("type", "password");
    });
  });

  describe("disabled state", () => {
    it("should disable input when disabled prop is true", () => {
      render(<PasswordInput value="" onChange={mockOnChange} disabled />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toBeDisabled();
    });

    it("should disable toggle button when disabled prop is true", () => {
      render(<PasswordInput value="" onChange={mockOnChange} disabled />);

      const toggleButton = screen.getByLabelText("Show password");
      expect(toggleButton).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("should add error styling when error is present", () => {
      render(<PasswordInput value="" onChange={mockOnChange} error="Error message" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveClass("border-destructive");
    });

    it("should set aria-invalid when error is present", () => {
      render(<PasswordInput value="" onChange={mockOnChange} error="Error message" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should associate error message with input using aria-describedby", () => {
      render(<PasswordInput value="" onChange={mockOnChange} id="test-password" error="Error" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("aria-describedby", "test-password-error");

      const errorMessage = screen.getByText("Error");
      expect(errorMessage).toHaveAttribute("id", "test-password-error");
    });
  });

  describe("accessibility", () => {
    it("should have correct autocomplete attribute", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
    });

    it("should allow custom autocomplete attribute", () => {
      render(<PasswordInput value="" onChange={mockOnChange} autoComplete="current-password" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("autocomplete", "current-password");
    });

    it("should have proper button accessibility", () => {
      render(<PasswordInput value="" onChange={mockOnChange} />);

      const toggleButton = screen.getByLabelText("Show password");
      expect(toggleButton).toHaveAttribute("type", "button");
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    });
  });

  describe("custom props", () => {
    it("should accept custom id", () => {
      render(<PasswordInput value="" onChange={mockOnChange} id="custom-id" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("id", "custom-id");
    });

    it("should accept custom name", () => {
      render(<PasswordInput value="" onChange={mockOnChange} name="custom-name" />);

      const input = screen.getByPlaceholderText("Enter your password");
      expect(input).toHaveAttribute("name", "custom-name");
    });
  });
});
