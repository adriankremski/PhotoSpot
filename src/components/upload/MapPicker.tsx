/**
 * MapPicker Component
 *
 * Map interface for selecting photo location with blur settings.
 * Allows users to click on map to set location or search for a place.
 */

import { useState, useCallback, useEffect } from "react";
import { Marker, type MapMouseEvent } from "react-map-gl/mapbox";
import { MapPin, Search } from "lucide-react";
import { MapGL } from "@/components/map/MapGL";
import { BlurSlider } from "./BlurSlider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MapViewport, BoundingBox } from "@/types";
import type { MapPickerProps } from "./types";

const DEFAULT_VIEWPORT: MapViewport = {
  latitude: 52.2297, // Warsaw, Poland (default)
  longitude: 21.0122,
  zoom: 10,
};

export function MapPicker({ value, onChange, errors }: MapPickerProps) {
  const [viewport, setViewport] = useState<MapViewport>(DEFAULT_VIEWPORT);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Initialize map with existing location if available
  useEffect(() => {
    if (value.latitude !== null && value.longitude !== null) {
      setViewport({
        latitude: value.latitude,
        longitude: value.longitude,
        zoom: 12,
      });
    }
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const { lngLat } = event;
      if (lngLat) {
        onChange({
          latitude: lngLat.lat,
          longitude: lngLat.lng,
        });
      }
    },
    [onChange]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(searchQuery)}&limit=1`);

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const location = result.data[0];

        // Update viewport to searched location
        setViewport({
          latitude: location.lat,
          longitude: location.lon,
          zoom: 12,
        });

        // Set the location
        onChange({
          latitude: location.lat,
          longitude: location.lon,
        });
      } else {
        alert("Location not found. Try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Failed to search for location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onChange]);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    setViewport(newViewport);
  }, []);

  const handleBoundsChange = useCallback((_bounds: BoundingBox) => {
    // Not needed for this component
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search for a location..."
              className="pl-10"
            />
          </div>
          <Button type="button" onClick={handleSearch} disabled={!searchQuery.trim() || isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Search for a place or click on the map to set your photo's location
        </p>
      </div>

      {/* Map Container */}
      <div className="relative h-[400px] overflow-hidden rounded-lg border border-gray-300">
        <MapGL
          viewport={viewport}
          onViewportChange={handleViewportChange}
          onBoundsChange={handleBoundsChange}
          onClick={handleMapClick}
        >
          {/* Marker at selected location */}
          {value.latitude !== null && value.longitude !== null && (
            <Marker latitude={value.latitude} longitude={value.longitude} anchor="bottom">
              <div className="relative">
                <MapPin className="h-10 w-10 text-red-600 drop-shadow-lg" fill="currentColor" />

                {/* Blur radius circle (if blur is enabled) */}
                {value.blur_location && (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400 bg-blue-200/30"
                    style={{
                      // Approximate pixel conversion (depends on zoom level)
                      width: `${value.blur_radius / 10}px`,
                      height: `${value.blur_radius / 10}px`,
                    }}
                  />
                )}
              </div>
            </Marker>
          )}
        </MapGL>
      </div>

      {/* Coordinates Display */}
      {value.latitude !== null && value.longitude !== null && (
        <div className="rounded-lg bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-900">Location Selected</p>
          <p className="text-green-700">
            Latitude: {value.latitude.toFixed(6)}, Longitude: {value.longitude.toFixed(6)}
          </p>
        </div>
      )}

      {/* Error Display */}
      {errors?.latitude && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errors.latitude}</div>}

      {/* Blur Settings */}
      <BlurSlider
        enabled={value.blur_location}
        radius={value.blur_radius}
        onBlurToggle={(enabled) => onChange({ blur_location: enabled })}
        onRadiusChange={(radius) => onChange({ blur_radius: radius })}
      />
    </div>
  );
}
