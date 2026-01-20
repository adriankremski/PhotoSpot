/**
 * Filter Helper Utilities
 *
 * Utility functions for managing photo filters and converting
 * them to API query parameters.
 */

import type { PhotoFilters, PhotoQueryParams, PhotoCategory, Season, TimeOfDay } from "@/types";
import { isPhotoCategory, isSeason, isTimeOfDay } from "@/types";

/**
 * Checks if all filters are empty/default
 *
 * @param filters - The PhotoFilters object to check
 * @returns true if all filters are empty (null or false)
 */
export function isFilterEmpty(filters: PhotoFilters): boolean {
  return (
    filters.category === null &&
    filters.season === null &&
    filters.time_of_day === null &&
    filters.photographer_only === false
  );
}

/**
 * Creates an empty/default filter state
 *
 * @returns PhotoFilters with all values set to null/false
 */
export function createEmptyFilters(): PhotoFilters {
  return {
    category: null,
    season: null,
    time_of_day: null,
    photographer_only: false,
  };
}

/**
 * Converts PhotoFilters to partial PhotoQueryParams
 * Filters out null/false values to avoid sending unnecessary query params
 *
 * @param filters - The PhotoFilters object
 * @returns Partial PhotoQueryParams with only non-null/true values
 */
export function filtersToQueryParams(filters: PhotoFilters): Partial<PhotoQueryParams> {
  const params: Partial<PhotoQueryParams> = {};

  if (filters.category !== null) {
    params.category = filters.category;
  }

  if (filters.season !== null) {
    params.season = filters.season;
  }

  if (filters.time_of_day !== null) {
    params.time_of_day = filters.time_of_day;
  }

  if (filters.photographer_only) {
    params.photographer_only = true;
  }

  return params;
}

/**
 * Validates and sanitizes filter values
 * Returns a new PhotoFilters object with only valid values
 *
 * @param filters - The PhotoFilters object to validate
 * @returns PhotoFilters with validated values
 */
export function validateFilters(filters: PhotoFilters): PhotoFilters {
  return {
    category: filters.category && isPhotoCategory(filters.category) ? filters.category : null,
    season: filters.season && isSeason(filters.season) ? filters.season : null,
    time_of_day: filters.time_of_day && isTimeOfDay(filters.time_of_day) ? filters.time_of_day : null,
    photographer_only: Boolean(filters.photographer_only),
  };
}

/**
 * Merges two filter objects, with the second taking precedence
 *
 * @param base - Base filter object
 * @param updates - Filter updates to apply
 * @returns New PhotoFilters object with merged values
 */
export function mergeFilters(base: PhotoFilters, updates: Partial<PhotoFilters>): PhotoFilters {
  return {
    category: updates.category !== undefined ? updates.category : base.category,
    season: updates.season !== undefined ? updates.season : base.season,
    time_of_day: updates.time_of_day !== undefined ? updates.time_of_day : base.time_of_day,
    photographer_only: updates.photographer_only !== undefined ? updates.photographer_only : base.photographer_only,
  };
}

/**
 * Parses query parameters from URL into PhotoFilters
 * Useful for initializing filters from URL state
 *
 * @param searchParams - URLSearchParams object
 * @returns PhotoFilters object parsed from query params
 */
export function parseFiltersFromQuery(searchParams: URLSearchParams): PhotoFilters {
  const category = searchParams.get("category");
  const season = searchParams.get("season");
  const timeOfDay = searchParams.get("time_of_day");
  const photographerOnly = searchParams.get("photographer_only");

  return validateFilters({
    category: category as PhotoCategory | null,
    season: season as Season | null,
    time_of_day: timeOfDay as TimeOfDay | null,
    photographer_only: photographerOnly === "true",
  });
}

/**
 * Converts PhotoFilters to URL search params string
 *
 * @param filters - The PhotoFilters object
 * @returns URL search params string (without leading ?)
 */
export function filtersToSearchParams(filters: PhotoFilters): string {
  const params = new URLSearchParams();

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.season) {
    params.set("season", filters.season);
  }

  if (filters.time_of_day) {
    params.set("time_of_day", filters.time_of_day);
  }

  if (filters.photographer_only) {
    params.set("photographer_only", "true");
  }

  return params.toString();
}

/**
 * Counts the number of active filters
 *
 * @param filters - The PhotoFilters object
 * @returns Number of active (non-null/true) filters
 */
export function countActiveFilters(filters: PhotoFilters): number {
  let count = 0;

  if (filters.category !== null) count++;
  if (filters.season !== null) count++;
  if (filters.time_of_day !== null) count++;
  if (filters.photographer_only) count++;

  return count;
}

/**
 * Gets a human-readable description of active filters
 *
 * @param filters - The PhotoFilters object
 * @returns String describing active filters
 */
export function getFilterDescription(filters: PhotoFilters): string {
  const parts: string[] = [];

  if (filters.category) {
    parts.push(filters.category);
  }

  if (filters.season) {
    parts.push(filters.season);
  }

  if (filters.time_of_day) {
    parts.push(filters.time_of_day.replace("_", " "));
  }

  if (filters.photographer_only) {
    parts.push("photographers only");
  }

  if (parts.length === 0) {
    return "No filters applied";
  }

  return `Filtered by: ${parts.join(", ")}`;
}
