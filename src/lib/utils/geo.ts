/**
 * Geographic utility functions
 *
 * Provides functions for geographic calculations including
 * location blurring for privacy protection.
 */

import type { GeoPoint } from "../../types";

/**
 * Earth's radius in meters (mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians
 */
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Converts radians to degrees
 */
function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Generates a random point within a specified radius from a center point
 * Uses uniform distribution to ensure points are evenly distributed
 *
 * Algorithm based on:
 * - Random bearing (0-360 degrees)
 * - Random distance with square root for uniform distribution
 * - Haversine formula for calculating destination point
 *
 * @param lat - Center latitude in degrees (-90 to 90)
 * @param lon - Center longitude in degrees (-180 to 180)
 * @param radiusMeters - Maximum radius in meters from the center point
 * @returns Object with blurred latitude and longitude
 *
 * @example
 * const blurred = randomOffsetPoint(40.7128, -74.0060, 200);
 * console.log(blurred); // { lat: 40.7145, lon: -74.0042 }
 */
export function randomOffsetPoint(lat: number, lon: number, radiusMeters: number): { lat: number; lon: number } {
  // Generate random bearing (direction) in radians
  const bearing = Math.random() * 2 * Math.PI;

  // Generate random distance with square root for uniform distribution
  // (otherwise points would cluster near the center)
  const randomDistance = Math.sqrt(Math.random()) * radiusMeters;

  // Convert center point to radians
  const latRad = degreesToRadians(lat);
  const lonRad = degreesToRadians(lon);

  // Calculate angular distance (distance / earth radius)
  const angularDistance = randomDistance / EARTH_RADIUS_METERS;

  // Calculate new latitude using Haversine formula
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  // Calculate new longitude using Haversine formula
  const newLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  // Convert back to degrees
  const newLat = radiansToDegrees(newLatRad);
  const newLon = radiansToDegrees(newLonRad);

  // Normalize longitude to -180 to 180 range
  const normalizedLon = ((newLon + 180) % 360) - 180;

  return {
    lat: newLat,
    lon: normalizedLon,
  };
}

/**
 * Creates a GeoJSON Point from latitude and longitude
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lon - Longitude in degrees (-180 to 180)
 * @returns GeoJSON Point object
 */
export function createGeoPoint(lat: number, lon: number): GeoPoint {
  return {
    type: "Point",
    coordinates: [lon, lat], // GeoJSON uses [longitude, latitude] order
  };
}

/**
 * Calculates the distance between two points using the Haversine formula
 *
 * @param lat1 - First point latitude in degrees
 * @param lon1 - First point longitude in degrees
 * @param lat2 - Second point latitude in degrees
 * @param lon2 - Second point longitude in degrees
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);
  const deltaLatRad = degreesToRadians(lat2 - lat1);
  const deltaLonRad = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
