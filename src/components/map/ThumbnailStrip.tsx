/**
 * ThumbnailStrip Component
 *
 * Horizontal scrollable strip at the bottom of the screen (desktop)
 * displaying photo thumbnails. Synchronized with map pins.
 */

import React, { useRef, useEffect } from "react";
import type { PhotoListItemDto, PaginationMeta } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Camera } from "lucide-react";

interface ThumbnailStripProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onThumbnailClick: (photoId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}

/**
 * Individual photo card component
 */
const PhotoCard = React.memo(function PhotoCard({
  photo,
  isSelected,
  onClick,
}: {
  photo: PhotoListItemDto;
  isSelected: boolean;
  onClick: () => void;
}) {
  const initials = photo.user.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      data-photo-id={photo.id}
      onClick={onClick}
      className={`thumbnail-card group relative flex-shrink-0 overflow-hidden rounded-lg bg-card shadow-md transition-all hover:shadow-lg focus-ring ${
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{ width: "200px" }}
      role="listitem"
      aria-label={`Photo: ${photo.title} by ${photo.user.display_name}`}
      aria-pressed={isSelected}
    >
      {/* Thumbnail Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={photo.thumbnail_url}
          alt={photo.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Photographer badge overlay */}
        {photo.user.role === "photographer" && (
          <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow-md">
            Pro
          </div>
        )}

        {/* Category badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {photo.category}
        </div>
      </div>

      {/* Card Content */}
      <div className="space-y-2 p-3 text-left">
        {/* Title */}
        <h4 className="line-clamp-1 text-sm font-semibold text-card-foreground">{photo.title}</h4>

        {/* Author */}
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={photo.user.avatar_url || undefined} alt={photo.user.display_name} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="line-clamp-1 text-xs text-muted-foreground">{photo.user.display_name}</span>
        </div>

        {/* Favorites */}
        {photo.favorite_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>❤️</span>
            <span>{photo.favorite_count}</span>
          </div>
        )}
      </div>
    </button>
  );
});

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8 text-center">
      <div className="space-y-2">
        <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-medium text-card-foreground">No photos found</p>
        <p className="text-xs text-muted-foreground">Try adjusting your filters or exploring a different area</p>
      </div>
    </div>
  );
}

/**
 * ThumbnailStrip - Horizontal scrollable photo strip for desktop
 */
export function ThumbnailStrip({
  photos,
  selectedPhotoId,
  onThumbnailClick,
  onLoadMore,
  hasMore,
  isLoading,
}: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll to selected photo when selection changes
   */
  useEffect(() => {
    if (selectedPhotoId && containerRef.current) {
      const selectedElement = containerRef.current.querySelector(`[data-photo-id="${selectedPhotoId}"]`);

      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [selectedPhotoId]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photos.length || !containerRef.current) return;

      const currentIndex = selectedPhotoId ? photos.findIndex((p) => p.id === selectedPhotoId) : -1;

      if (e.key === "ArrowLeft" && currentIndex > 0) {
        e.preventDefault();
        onThumbnailClick(photos[currentIndex - 1].id);
      } else if (e.key === "ArrowRight" && currentIndex < photos.length - 1) {
        e.preventDefault();
        onThumbnailClick(photos[currentIndex + 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos, selectedPhotoId, onThumbnailClick]);

  // Show empty state if no photos
  if (photos.length === 0 && !isLoading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-card shadow-lg">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-card shadow-lg">
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto p-4 thumbnail-strip-scrollbar smooth-scroll"
        role="list"
        aria-label="Photo thumbnails"
      >
        {/* Photo cards */}
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={photo.id === selectedPhotoId}
            onClick={() => onThumbnailClick(photo.id)}
          />
        ))}

        {/* Load More button */}
        {hasMore && (
          <div className="flex flex-shrink-0 items-center">
            <Button onClick={onLoadMore} disabled={isLoading} variant="outline" size="lg" className="h-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
