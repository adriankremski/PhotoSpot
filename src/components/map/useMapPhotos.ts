/**
 * Custom Hook: useMapPhotos
 *
 * Encapsulates all logic for fetching photos, managing filters,
 * pagination, and viewport-based queries for the map view.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  PhotoListItemDto,
  PaginationMeta,
  PhotoFilters,
  PhotoQueryParams,
  BoundingBox,
  ListResponse,
  ApiError,
  MapViewport,
} from "@/types";
import { PAGINATION_DEFAULTS } from "@/types";
import { boundsToString, validateBoundingBox, WORLD_BOUNDS } from "@/lib/utils/mapHelpers";
import { filtersToQueryParams, validateFilters } from "@/lib/utils/filterHelpers";

const DEFAULT_LIMIT = PAGINATION_DEFAULTS.PHOTOS_MAP_VIEW.DEFAULT;

interface UseMapPhotosReturn {
  photos: PhotoListItemDto[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  filters: PhotoFilters;
  setFilters: (filters: PhotoFilters) => void;
  resetFilters: () => void;
  loadMore: () => void;
  refetchWithBounds: (bounds: BoundingBox) => void;
  clearError: () => void;
}

/**
 * Fetches photos from the API based on query parameters
 */
async function fetchPhotos(params: PhotoQueryParams): Promise<ListResponse<PhotoListItemDto>> {
  // Build query string, filtering out undefined values
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  const response = await fetch(`/api/photos?${queryString}`);

  if (!response.ok) {
    if (response.headers.get("content-type")?.includes("application/json")) {
      const error: ApiError = await response.json();
      throw new Error(error.error.message);
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Custom hook for managing photo data, filters, and pagination in map view
 */
export function useMapPhotos(initialViewport: MapViewport): UseMapPhotosReturn {
  // State
  const [photos, setPhotos] = useState<PhotoListItemDto[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    limit: DEFAULT_LIMIT,
    offset: 0,
    has_more: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PhotoFilters>({
    category: null,
    season: null,
    time_of_day: null,
    photographer_only: false,
  });
  const [currentBounds, setCurrentBounds] = useState<BoundingBox | null>(null);
  const [offset, setOffset] = useState(0);

  // Refs for debouncing
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Core fetch function that queries the API
   */
  const fetchPhotosData = useCallback(
    async (bounds: BoundingBox, currentFilters: PhotoFilters, currentOffset: number) => {
      // Validate bounds before making API call
      if (!validateBoundingBox(bounds)) {
        console.error("Invalid bounding box:", bounds);
        setError("Invalid map bounds. Using fallback.");
        bounds = WORLD_BOUNDS;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Build query params
        const queryParams: PhotoQueryParams = {
          bbox: boundsToString(bounds),
          ...filtersToQueryParams(currentFilters),
          limit: DEFAULT_LIMIT,
          offset: currentOffset,
        };

        const result = await fetchPhotos(queryParams);

        // Update state with results
        if (currentOffset === 0) {
          // New query - replace photos
          setPhotos(result.data);
        } else {
          // Pagination - append photos
          setPhotos((prev) => [...prev, ...result.data]);
        }

        setPagination(result.meta);
        setCurrentBounds(bounds);
        setOffset(currentOffset);
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            // Request was aborted, ignore
            return;
          }
          setError(err.message);
          console.error("Error fetching photos:", err);
        } else {
          setError("An unexpected error occurred");
          console.error("Unknown error:", err);
        }
        // Keep existing photos on error
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  /**
   * Updates filters and triggers refetch with offset 0
   */
  const setFilters = useCallback(
    (newFilters: PhotoFilters) => {
      const validatedFilters = validateFilters(newFilters);
      setFiltersState(validatedFilters);
      setOffset(0);

      // Refetch with new filters if we have bounds
      if (currentBounds) {
        fetchPhotosData(currentBounds, validatedFilters, 0);
      }
    },
    [currentBounds, fetchPhotosData]
  );

  /**
   * Resets all filters to default and refetches
   */
  const resetFilters = useCallback(() => {
    const emptyFilters: PhotoFilters = {
      category: null,
      season: null,
      time_of_day: null,
      photographer_only: false,
    };
    setFiltersState(emptyFilters);
    setOffset(0);

    if (currentBounds) {
      fetchPhotosData(currentBounds, emptyFilters, 0);
    }
  }, [currentBounds, fetchPhotosData]);

  /**
   * Loads the next page of photos (pagination)
   */
  const loadMore = useCallback(() => {
    if (!pagination.has_more || isLoading || !currentBounds) {
      return;
    }

    const nextOffset = offset + DEFAULT_LIMIT;
    fetchPhotosData(currentBounds, filters, nextOffset);
  }, [pagination.has_more, isLoading, currentBounds, offset, filters, fetchPhotosData]);

  /**
   * Refetches photos with new bounds (debounced)
   */
  const refetchWithBounds = useCallback(
    (bounds: BoundingBox) => {
      // Clear existing debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Debounce the fetch by 500ms
      debounceTimeoutRef.current = setTimeout(() => {
        setOffset(0);
        fetchPhotosData(bounds, filters, 0);
      }, 500);
    },
    [filters, fetchPhotosData]
  );

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    // Calculate initial bounds from viewport
    // For simplicity, we'll use a reasonable default bounds
    // In a real implementation, you'd calculate this from the map's getBounds()
    const initialBounds: BoundingBox = [
      initialViewport.longitude - 5,
      initialViewport.latitude - 5,
      initialViewport.longitude + 5,
      initialViewport.latitude + 5,
    ];

    fetchPhotosData(initialBounds, filters, 0);

    // Cleanup: cancel any pending requests on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    photos,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    loadMore,
    refetchWithBounds,
    clearError,
  };
}
