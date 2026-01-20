/**
 * MapGL Component
 *
 * Mapbox GL wrapper component that renders the interactive map.
 * Manages map instance, viewport state, and provides event handlers.
 */

import { useCallback, useState } from "react";
import Map, {
  NavigationControl,
  GeolocateControl,
  type MapRef,
  type ViewStateChangeEvent,
  type MapMouseEvent,
} from "react-map-gl/mapbox";
import type { MapViewport, BoundingBox } from "@/types";

interface MapGLProps {
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onBoundsChange: (bounds: BoundingBox) => void;
  onClick?: (event: MapMouseEvent) => void;
  children?: React.ReactNode;
}

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

/**
 * MapGL - Interactive map component using Mapbox GL
 */
export function MapGL({ viewport, onViewportChange, onBoundsChange, onClick, children }: MapGLProps) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  /**
   * Handles map movement (pan/zoom)
   */
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      const { viewState } = evt;

      // Update viewport
      const newViewport: MapViewport = {
        latitude: viewState.latitude,
        longitude: viewState.longitude,
        zoom: viewState.zoom,
        pitch: viewState.pitch,
        bearing: viewState.bearing,
      };

      onViewportChange(newViewport);

      // Get bounds and propagate
      if (mapRef) {
        const bounds = mapRef.getBounds();
        if (bounds) {
          const boundingBox: BoundingBox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
          onBoundsChange(boundingBox);
        }
      }
    },
    [mapRef, onViewportChange, onBoundsChange]
  );

  /**
   * Handles map load event
   */
  const handleLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapError(null);
  }, []);

  /**
   * Handles map errors
   */
  const handleError = useCallback((evt: { error: Error }) => {
    console.error("Map error:", evt.error);
    setMapError("Map failed to load. Please refresh the page.");
  }, []);

  // Check if Mapbox token is present
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Map Configuration Error</p>
          <p className="text-sm text-muted-foreground">
            Mapbox token is missing. Please configure PUBLIC_MAPBOX_TOKEN.
          </p>
        </div>
      </div>
    );
  }

  // Show error message if map failed to load
  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Map Error</p>
          <p className="text-sm text-muted-foreground">{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={setMapRef}
      {...viewport}
      onMove={handleMove}
      onLoad={handleLoad}
      onError={handleError}
      onClick={onClick}
      mapboxAccessToken={MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: "100%", height: "100%" }}
      reuseMaps
      attributionControl={true}
    >
      {/* Navigation Controls (zoom, compass) */}
      <NavigationControl position="top-right" showCompass visualizePitch />

      {/* Geolocate Control */}
      <GeolocateControl
        position="top-right"
        trackUserLocation
        showUserHeading
        onError={(err) => {
          console.warn("Geolocation error:", err);
        }}
      />

      {/* Child components (pins, popups, etc.) */}
      {children}
    </Map>
  );
}
