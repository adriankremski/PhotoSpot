/**
 * Tests for RoleSelector component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoleSelector } from "./RoleSelector";

describe("RoleSelector", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render both role options", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText("Photographer")).toBeInTheDocument();
      expect(screen.getByText("Enthusiast")).toBeInTheDocument();
    });

    it("should render role descriptions", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText("Share your photography spots and build your portfolio")).toBeInTheDocument();
      expect(screen.getByText("Discover amazing photo locations from other photographers")).toBeInTheDocument();
    });

    it("should render label", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText("I am a")).toBeInTheDocument();
    });

    it("should display error message when provided", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} error="Please select a role" />);

      expect(screen.getByText("Please select a role")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("selection state", () => {
    it("should highlight selected photographer role", () => {
      render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      expect(photographerCard).toHaveAttribute("aria-checked", "true");
    });

    it("should highlight selected enthusiast role", () => {
      render(<RoleSelector value="enthusiast" onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      expect(enthusiastCard).toHaveAttribute("aria-checked", "true");
    });

    it("should not highlight any card when value is null", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');

      expect(photographerCard).toHaveAttribute("aria-checked", "false");
      expect(enthusiastCard).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("interactions", () => {
    it("should call onChange when photographer card is clicked", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.click(photographerCard!);

      expect(mockOnChange).toHaveBeenCalledWith("photographer");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("should call onChange when enthusiast card is clicked", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.click(enthusiastCard!);

      expect(mockOnChange).toHaveBeenCalledWith("enthusiast");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("should allow switching between roles", () => {
      const { rerender } = render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.click(enthusiastCard!);

      expect(mockOnChange).toHaveBeenCalledWith("enthusiast");

      rerender(<RoleSelector value="enthusiast" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.click(photographerCard!);

      expect(mockOnChange).toHaveBeenCalledWith("photographer");
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("keyboard navigation", () => {
    it("should navigate to next option with ArrowRight", () => {
      render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.keyDown(photographerCard!, { key: "ArrowRight" });

      expect(mockOnChange).toHaveBeenCalledWith("enthusiast");
    });

    it("should navigate to previous option with ArrowLeft", () => {
      render(<RoleSelector value="enthusiast" onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.keyDown(enthusiastCard!, { key: "ArrowLeft" });

      expect(mockOnChange).toHaveBeenCalledWith("photographer");
    });

    it("should navigate to next option with ArrowDown", () => {
      render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.keyDown(photographerCard!, { key: "ArrowDown" });

      expect(mockOnChange).toHaveBeenCalledWith("enthusiast");
    });

    it("should navigate to previous option with ArrowUp", () => {
      render(<RoleSelector value="enthusiast" onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.keyDown(enthusiastCard!, { key: "ArrowUp" });

      expect(mockOnChange).toHaveBeenCalledWith("photographer");
    });

    it("should wrap around when navigating past last option", () => {
      render(<RoleSelector value="enthusiast" onChange={mockOnChange} />);

      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');
      fireEvent.keyDown(enthusiastCard!, { key: "ArrowRight" });

      expect(mockOnChange).toHaveBeenCalledWith("photographer");
    });

    it("should wrap around when navigating before first option", () => {
      render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      fireEvent.keyDown(photographerCard!, { key: "ArrowLeft" });

      expect(mockOnChange).toHaveBeenCalledWith("enthusiast");
    });
  });

  describe("accessibility", () => {
    it("should have radiogroup role", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    });

    it("should have radio role for each option", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(2);
    });

    it("should have aria-labelledby on radiogroup", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const radiogroup = screen.getByRole("radiogroup");
      expect(radiogroup).toHaveAttribute("aria-labelledby", "role-selector-label");
    });

    it("should have aria-required on radiogroup", () => {
      render(<RoleSelector value={null} onChange={mockOnChange} />);

      const radiogroup = screen.getByRole("radiogroup");
      expect(radiogroup).toHaveAttribute("aria-required", "true");
    });

    it("should set correct tabindex for selected item", () => {
      render(<RoleSelector value="photographer" onChange={mockOnChange} />);

      const photographerCard = screen.getByText("Photographer").closest('[role="radio"]');
      const enthusiastCard = screen.getByText("Enthusiast").closest('[role="radio"]');

      expect(photographerCard).toHaveAttribute("tabindex", "0");
      expect(enthusiastCard).toHaveAttribute("tabindex", "-1");
    });
  });
});
