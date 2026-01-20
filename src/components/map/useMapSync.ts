/**
 * Custom Hook: useMapSync
 *
 * Manages bidirectional synchronization between map pins and thumbnail strip/carousel.
 * Handles photo selection and ensures map and UI stay in sync.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { PhotoListItemDto, MapViewport } from "@/types";

type SelectionSource = "map" | "thumbnail" | null;

interface UseMapSyncReturn {
  selectedPhotoId: string | null;
  selectPhotoFromPin: (photoId: string) => void;
  selectPhotoFromThumbnail: (photoId: string) => void;
  deselectPhoto: () => void;
  scrollToThumbnail: (photoId: string) => void;
  centerMapOnPhoto: (photoId: string) => void;
}

interface UseMapSyncOptions {
  photos: PhotoListItemDto[];
  viewport: MapViewport;
  setViewport: (viewport: MapViewport) => void;
  thumbnailContainerRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook for managing synchronization between map and thumbnails
 */
export function useMapSync({
  photos,
  viewport,
  setViewport,
  thumbnailContainerRef,
}: UseMapSyncOptions): UseMapSyncReturn {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectionSource, setSelectionSource] = useState<SelectionSource>(null);

  // Ref to prevent circular updates
  const isUpdatingRef = useRef(false);

  /**
   * Finds a photo by ID
   */
  const findPhoto = useCallback(
    (photoId: string): PhotoListItemDto | undefined => {
      return photos.find((photo) => photo.id === photoId);
    },
    [photos]
  );

  /**
   * Scrolls the thumbnail strip to bring the selected photo into view
   */
  const scrollToThumbnail = useCallback(
    (photoId: string) => {
      if (!thumbnailContainerRef?.current) {
        return;
      }

      const container = thumbnailContainerRef.current;
      const thumbnailElement = container.querySelector(`[data-photo-id="${photoId}"]`);

      if (thumbnailElement) {
        thumbnailElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    },
    [thumbnailContainerRef]
  );

  /**
   * Centers the map on a specific photo's location
   */
  const centerMapOnPhoto = useCallback(
    (photoId: string) => {
      const photo = findPhoto(photoId);
      if (!photo || !photo.location_public) {
        console.warn(`Cannot center map on photo ${photoId}: photo not found or no location`);
        return;
      }

      const [lng, lat] = photo.location_public.coordinates;

      // Update viewport to center on photo
      setViewport({
        ...viewport,
        latitude: lat,
        longitude: lng,
        // Optionally increase zoom if current zoom is too low
        zoom: Math.max(viewport.zoom, 12),
      });
    },
    [findPhoto, viewport, setViewport]
  );

  /**
   * Selects a photo when a pin is clicked on the map
   */
  const selectPhotoFromPin = useCallback(
    (photoId: string) => {
      if (isUpdatingRef.current) {
        return;
      }

      isUpdatingRef.current = true;
      setSelectedPhotoId(photoId);
      setSelectionSource("map");

      // Scroll thumbnail into view
      setTimeout(() => {
        scrollToThumbnail(photoId);
        isUpdatingRef.current = false;
      }, 50);
    },
    [scrollToThumbnail]
  );

  /**
   * Selects a photo when a thumbnail is clicked
   */
  const selectPhotoFromThumbnail = useCallback(
    (photoId: string) => {
      if (isUpdatingRef.current) {
        return;
      }

      isUpdatingRef.current = true;
      setSelectedPhotoId(photoId);
      setSelectionSource("thumbnail");

      // Center map on photo
      setTimeout(() => {
        centerMapOnPhoto(photoId);
        isUpdatingRef.current = false;
      }, 50);
    },
    [centerMapOnPhoto]
  );

  /**
   * Deselects the current photo
   */
  const deselectPhoto = useCallback(() => {
    setSelectedPhotoId(null);
    setSelectionSource(null);
  }, []);

  /**
   * Reset selection when photos change (e.g., after filtering)
   */
  useEffect(() => {
    if (selectedPhotoId) {
      const photo = findPhoto(selectedPhotoId);
      if (!photo) {
        // Selected photo no longer in list, deselect
        deselectPhoto();
      }
    }
  }, [photos, selectedPhotoId, findPhoto, deselectPhoto]);

  return {
    selectedPhotoId,
    selectPhotoFromPin,
    selectPhotoFromThumbnail,
    deselectPhoto,
    scrollToThumbnail,
    centerMapOnPhoto,
  };
}
