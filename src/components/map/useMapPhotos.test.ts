/**
 * Unit Tests for useMapPhotos Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMapPhotos } from './useMapPhotos';
import type { ListResponse, PhotoListItemDto, PaginationMeta } from '@/types';

// Mock fetch
global.fetch = vi.fn();

const mockPhotos: PhotoListItemDto[] = [
  {
    id: 'photo1',
    title: 'Test Photo 1',
    description: 'Description',
    category: 'landscape',
    season: 'summer',
    time_of_day: 'golden_hour_morning',
    file_url: 'https://example.com/photo1.jpg',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    location_public: { type: 'Point', coordinates: [-122.4194, 37.7749] },
    user: {
      id: 'user1',
      display_name: 'Test User',
      avatar_url: null,
      role: 'photographer',
    },
    tags: ['nature', 'landscape'],
    created_at: '2024-01-01T00:00:00Z',
    favorite_count: 5,
  },
];

const mockResponse: ListResponse<PhotoListItemDto> = {
  data: mockPhotos,
  meta: {
    total: 1,
    limit: 200,
    offset: 0,
    has_more: false,
  },
};

describe('useMapPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    expect(result.current.photos).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch photos on mount', async () => {
    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.photos).toEqual(mockPhotos);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
      json: async () => ({
        error: {
          code: 'SERVER_ERROR',
          message: 'Server error occurred',
        },
      }),
    });

    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should update filters and refetch', async () => {
    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.photos).toEqual(mockPhotos);
    });

    // Change filters
    result.current.setFilters({
      category: 'portrait',
      season: null,
      time_of_day: null,
      photographer_only: false,
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should reset filters', async () => {
    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.photos).toEqual(mockPhotos);
    });

    result.current.setFilters({
      category: 'portrait',
      season: 'winter',
      time_of_day: 'night',
      photographer_only: true,
    });

    result.current.resetFilters();

    await waitFor(() => {
      expect(result.current.filters).toEqual({
        category: null,
        season: null,
        time_of_day: null,
        photographer_only: false,
      });
    });
  });

  it('should clear error', () => {
    const { result } = renderHook(() =>
      useMapPhotos({
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 10,
      })
    );

    result.current.clearError();

    expect(result.current.error).toBeNull();
  });
});

