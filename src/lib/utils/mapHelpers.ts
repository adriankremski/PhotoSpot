/**
 * Map Helper Utilities
 *
 * Utility functions for map operations, coordinate validation,
 * and photo-to-pin transformations.
 */

import type { BoundingBox, PhotoListItemDto, PhotoPin, MapBounds } from "@/types";

/**
 * Converts a BoundingBox to a comma-separated string format
 * Format: "minLng,minLat,maxLng,maxLat"
 *
 * @param bounds - The bounding box [minLng, minLat, maxLng, maxLat]
 * @returns String representation of the bounding box
 */
export function boundsToString(bounds: BoundingBox): string {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return `${minLng},${minLat},${maxLng},${maxLat}`;
}

/**
 * Validates a bounding box to ensure it has valid coordinates
 *
 * @param bounds - The bounding box to validate
 * @returns true if the bounding box is valid, false otherwise
 */
export function validateBoundingBox(bounds: BoundingBox): boolean {
  const [minLng, minLat, maxLng, maxLat] = bounds;

  // Check if all values are numbers
  if (
    typeof minLng !== "number" ||
    typeof minLat !== "number" ||
    typeof maxLng !== "number" ||
    typeof maxLat !== "number"
  ) {
    return false;
  }

  // Check if coordinates are within valid ranges
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    return false;
  }

  if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) {
    return false;
  }

  // Check if min values are less than max values
  if (minLng >= maxLng || minLat >= maxLat) {
    return false;
  }

  return true;
}

/**
 * Converts MapBounds object to BoundingBox tuple
 *
 * @param bounds - MapBounds object with north, south, east, west
 * @returns BoundingBox tuple [minLng, minLat, maxLng, maxLat]
 */
export function mapBoundsToBoundingBox(bounds: MapBounds): BoundingBox {
  return [bounds.west, bounds.south, bounds.east, bounds.north];
}

/**
 * Converts a BoundingBox tuple to MapBounds object
 *
 * @param bounds - BoundingBox tuple [minLng, minLat, maxLng, maxLat]
 * @returns MapBounds object
 */
export function boundingBoxToMapBounds(bounds: BoundingBox): MapBounds {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return {
    west: minLng,
    south: minLat,
    east: maxLng,
    north: maxLat,
  };
}

/**
 * Transforms a PhotoListItemDto to a PhotoPin for map rendering
 * Filters out photos with invalid coordinates
 *
 * @param photo - The photo to transform
 * @returns PhotoPin object or null if coordinates are invalid
 */
export function photoToPin(photo: PhotoListItemDto): PhotoPin | null {
  // Validate that location_public exists and has valid coordinates
  if (!photo.location_public || !photo.location_public.coordinates) {
    console.warn(`Photo ${photo.id} has invalid location data`);
    return null;
  }

  const [lng, lat] = photo.location_public.coordinates;

  // Validate coordinate ranges
  if (typeof lng !== "number" || typeof lat !== "number" || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn(`Photo ${photo.id} has invalid coordinates: [${lng}, ${lat}]`);
    return null;
  }

  return {
    id: photo.id,
    coordinates: [lng, lat],
    isPhotographer: photo.user.role === "photographer",
    clusterId: photo.cluster_id,
  };
}

/**
 * Transforms an array of photos to pins, filtering out invalid ones
 *
 * @param photos - Array of photos to transform
 * @returns Array of valid PhotoPin objects
 */
export function photosToPins(photos: PhotoListItemDto[]): PhotoPin[] {
  return photos.map(photoToPin).filter((pin): pin is PhotoPin => pin !== null);
}

/**
 * Calculates the center point of a bounding box
 *
 * @param bounds - The bounding box
 * @returns Tuple of [longitude, latitude] representing the center
 */
export function getBoundingBoxCenter(bounds: BoundingBox): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

/**
 * Default world bounds for fallback
 */
export const WORLD_BOUNDS: BoundingBox = [-180, -85, 180, 85];

/**
 * Default viewport centered on Europe
 */
export const DEFAULT_VIEWPORT = {
  latitude: 50.0,
  longitude: 10.0,
  zoom: 4,
};

/**
 * Checks if two bounding boxes are approximately equal
 * Used to prevent unnecessary API calls when viewport changes slightly
 *
 * @param bounds1 - First bounding box
 * @param bounds2 - Second bounding box
 * @param tolerance - Maximum difference for equality (default 0.001)
 * @returns true if bounding boxes are approximately equal
 */
export function areBoundsEqual(bounds1: BoundingBox, bounds2: BoundingBox, tolerance = 0.001): boolean {
  return (
    Math.abs(bounds1[0] - bounds2[0]) < tolerance &&
    Math.abs(bounds1[1] - bounds2[1]) < tolerance &&
    Math.abs(bounds1[2] - bounds2[2]) < tolerance &&
    Math.abs(bounds1[3] - bounds2[3]) < tolerance
  );
}
