/**
 * Map Components - Index
 *
 * Central export for all map-related components, hooks, and utilities.
 */

// Main container
export { MapSection } from "./MapSection";

// Core map components
export { MapGL } from "./MapGL";
export { PinClusterLayer } from "./PinClusterLayer";
export { PhotoPopup } from "./PhotoPopup";

// Control components
export { FilterPanel } from "./FilterPanel";
export { MapControls } from "./MapControls";

// Thumbnail components
export { ThumbnailStrip } from "./ThumbnailStrip";
export { BottomSheetCarousel } from "./BottomSheetCarousel";

// Action button
export { UploadPhotoButton } from "./UploadPhotoButton";

// Custom hooks
export { useMapPhotos } from "./useMapPhotos";
export { useMapSync } from "./useMapSync";
