/**
 * Component Tests for FilterPanel
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import type { PhotoFilters } from '@/types';

describe('FilterPanel', () => {
  const mockFilters: PhotoFilters = {
    category: null,
    season: null,
    time_of_day: null,
    photographer_only: false,
  };

  const mockOnFiltersChange = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filter controls', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Season')).toBeInTheDocument();
    expect(screen.getByLabelText('Time of Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Photographers Only')).toBeInTheDocument();
  });

  it('should show active filter count', () => {
    const activeFilters: PhotoFilters = {
      category: 'landscape',
      season: 'summer',
      time_of_day: null,
      photographer_only: false,
    };

    render(
      <FilterPanel
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should apply filters when Apply button clicked', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    // Change category
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'landscape' } });

    // Click Apply
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      category: 'landscape',
      season: null,
      time_of_day: null,
      photographer_only: false,
    });
  });

  it('should reset filters when Reset button clicked', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(resetButton);

    expect(mockOnReset).toHaveBeenCalled();
  });

  it('should toggle expand/collapse', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /collapse filters/i });
    expect(screen.getByLabelText('Category')).toBeVisible();

    fireEvent.click(toggleButton);

    // After collapse, controls should not be visible
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
  });

  it('should disable controls when loading', () => {
    render(
      <FilterPanel
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onReset={mockOnReset}
        isLoading={true}
      />
    );

    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(categorySelect).toBeDisabled();

    const applyButton = screen.getByText('Loading...');
    expect(applyButton).toBeDisabled();
  });
});

