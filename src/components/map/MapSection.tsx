/**
 * MapSection Component
 * 
 * Root container component that orchestrates the entire map view.
 * Manages state for photos, filters, selected photo, viewport, and
 * loading/error states. Provides context to child components.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MapViewport, BoundingBox, UserRole } from '@/types';
import { DEFAULT_VIEWPORT } from '@/lib/utils/mapHelpers';
import { useMapPhotos } from './useMapPhotos';
import { useMapSync } from './useMapSync';
import { MapGL } from './MapGL';
import { PinClusterLayer } from './PinClusterLayer';
import { PhotoPopup } from './PhotoPopup';
import { FilterPanel } from './FilterPanel';
import { MapControls } from './MapControls';
import { ThumbnailStrip } from './ThumbnailStrip';
import { BottomSheetCarousel } from './BottomSheetCarousel';
import { UploadPhotoButton } from './UploadPhotoButton';
import { LiveRegion } from './LiveRegion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertCircle } from 'lucide-react';

interface MapSectionProps {
  userRole?: UserRole | null;
  isAuthenticated?: boolean;
  initialViewport?: Partial<MapViewport>;
}

/**
 * MapSection - Main container for map view
 */
export function MapSection({
  userRole = null,
  isAuthenticated = false,
  initialViewport = {},
}: MapSectionProps) {
  // Viewport state
  const [viewport, setViewport] = useState<MapViewport>({
    ...DEFAULT_VIEWPORT,
    ...initialViewport,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Refs
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const {
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
  } = useMapPhotos(viewport);

  const {
    selectedPhotoId,
    selectPhotoFromPin,
    selectPhotoFromThumbnail,
    deselectPhoto,
  } = useMapSync({
    photos,
    viewport,
    setViewport,
    thumbnailContainerRef,
  });

  /**
   * Handles viewport changes from map
   */
  const handleViewportChange = useCallback((newViewport: MapViewport) => {
    setViewport(newViewport);
  }, []);

  /**
   * Handles bounds changes (debounced in useMapPhotos)
   */
  const handleBoundsChange = useCallback(
    (bounds: BoundingBox) => {
      refetchWithBounds(bounds);
    },
    [refetchWithBounds]
  );

  /**
   * Handles "Locate Me" button
   */
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newViewport: MapViewport = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoom: 12,
        };
        setViewport(newViewport);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
      }
    );
  }, []);

  /**
   * Handles "Reset View" button
   */
  const handleResetView = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  /**
   * Get selected photo object
   */
  const selectedPhoto = selectedPhotoId
    ? photos.find((p) => p.id === selectedPhotoId)
    : null;

  /**
   * Announce photo count changes
   */
  useEffect(() => {
    if (photos.length > 0 && !isLoading) {
      const message = `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} loaded`;
      setAnnouncement(message);
      // Clear announcement after it's been read
      const timer = setTimeout(() => setAnnouncement(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [photos.length, isLoading]);

  /**
   * Announce filter changes
   */
  useEffect(() => {
    const activeFilters = [];
    if (filters.category) activeFilters.push(filters.category);
    if (filters.season) activeFilters.push(filters.season);
    if (filters.time_of_day) activeFilters.push(filters.time_of_day);
    if (filters.photographer_only) activeFilters.push('photographers only');

    if (activeFilters.length > 0) {
      setAnnouncement(`Filters applied: ${activeFilters.join(', ')}`);
    }
  }, [filters]);

  return (
    <div className="relative h-screen w-full overflow-hidden" role="application" aria-label="Interactive photo map">
      {/* Error Banner */}
      {error && (
        <div className="absolute left-0 right-0 top-0 z-30 p-4">
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <button
              onClick={clearError}
              className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              aria-label="Close error"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      {/* Loading Overlay (only on initial load) */}
      {isLoading && photos.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">Loading photos...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="h-full w-full">
        <MapGL
          viewport={viewport}
          onViewportChange={handleViewportChange}
          onBoundsChange={handleBoundsChange}
        >
          {/* Photo Pins */}
          <PinClusterLayer
            photos={photos}
            selectedPhotoId={selectedPhotoId}
            onPinClick={selectPhotoFromPin}
          />

          {/* Photo Popup */}
          {selectedPhoto && (
            <PhotoPopup photo={selectedPhoto} onClose={deselectPhoto} />
          )}
        </MapGL>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        isLoading={isLoading}
      />

      {/* Map Controls */}
      <MapControls
        onLocateMe={handleLocateMe}
        onResetView={handleResetView}
        isLocating={isLocating}
      />

      {/* Desktop: Thumbnail Strip */}
      <div className="hidden lg:block">
        <ThumbnailStrip
          photos={photos}
          selectedPhotoId={selectedPhotoId}
          onThumbnailClick={selectPhotoFromThumbnail}
          onLoadMore={loadMore}
          hasMore={pagination.has_more || false}
          isLoading={isLoading}
        />
      </div>

      {/* Mobile: Bottom Sheet Carousel */}
      <div className="lg:hidden">
        <BottomSheetCarousel
          photos={photos}
          selectedPhotoId={selectedPhotoId}
          onPhotoSelect={selectPhotoFromThumbnail}
          onLoadMore={loadMore}
          hasMore={pagination.has_more || false}
          isLoading={isLoading}
        />
      </div>

      {/* Upload Photo Button (Photographers only) */}
      <UploadPhotoButton userRole={userRole} isAuthenticated={isAuthenticated} />

      {/* Live Region for Screen Reader Announcements */}
      <LiveRegion message={announcement} />
    </div>
  );
}

