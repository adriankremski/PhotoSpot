/**
 * BottomSheetCarousel Component
 * 
 * Mobile-optimized bottom sheet with swipeable carousel of photo cards.
 * Draggable to expand/collapse. Synchronized with map like ThumbnailStrip.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { PhotoListItemDto } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Loader2, Camera } from 'lucide-react';

interface BottomSheetCarouselProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onPhotoSelect: (photoId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}

type SheetState = 'collapsed' | 'expanded';

/**
 * Mobile photo card component
 */
const MobilePhotoCard = React.memo(function MobilePhotoCard({
  photo,
  isActive,
  onClick,
}: {
  photo: PhotoListItemDto;
  isActive: boolean;
  onClick: () => void;
}) {
  const initials = photo.user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      data-photo-id={photo.id}
      onClick={onClick}
      className={`thumbnail-card relative flex-shrink-0 overflow-hidden rounded-lg bg-card shadow-lg transition-all focus-ring ${
        isActive ? 'ring-2 ring-primary' : ''
      }`}
      style={{ width: '85vw', maxWidth: '400px' }}
      role="listitem"
      aria-label={`Photo: ${photo.title} by ${photo.user.display_name}`}
      aria-current={isActive ? 'true' : 'false'}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={photo.thumbnail_url}
          alt={photo.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        
        {/* Photographer badge */}
        {photo.user.role === 'photographer' && (
          <div className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
            Pro
          </div>
        )}

        {/* Category badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/80 px-3 py-1 text-xs font-medium text-white">
          {photo.category}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold text-card-foreground">
          {photo.title}
        </h3>

        {/* Author and stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={photo.user.avatar_url || undefined} alt={photo.user.display_name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{photo.user.display_name}</span>
          </div>
          
          {photo.favorite_count > 0 && (
            <span className="text-sm text-muted-foreground">❤️ {photo.favorite_count}</span>
          )}
        </div>

        {/* View button */}
        <a
          href={`/photo/${photo.id}`}
          className="block w-full rounded-md bg-primary py-2 text-center text-sm font-medium text-primary-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          View Details
        </a>
      </div>
    </button>
  );
});

/**
 * Empty state for mobile
 */
function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="space-y-2">
        <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-card-foreground">No photos found</p>
        <p className="text-xs text-muted-foreground">
          Try adjusting your filters or exploring a different area
        </p>
      </div>
    </div>
  );
}

/**
 * BottomSheetCarousel - Mobile bottom sheet with carousel
 */
export function BottomSheetCarousel({
  photos,
  selectedPhotoId,
  onPhotoSelect,
  onLoadMore,
  hasMore,
  isLoading,
}: BottomSheetCarouselProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * Find and scroll to selected photo
   */
  useEffect(() => {
    if (selectedPhotoId && carouselRef.current) {
      const index = photos.findIndex((p) => p.id === selectedPhotoId);
      if (index !== -1) {
        setCurrentIndex(index);
        const selectedElement = carouselRef.current.querySelector(
          `[data-photo-id="${selectedPhotoId}"]`
        );
        if (selectedElement) {
          selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }
    }
  }, [selectedPhotoId, photos]);

  /**
   * Handle swipe to navigate photos
   */
  const handleScroll = () => {
    if (!carouselRef.current) return;

    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = carouselRef.current.offsetWidth * 0.85; // Approximate card width
    const newIndex = Math.round(scrollLeft / cardWidth);
    
    if (newIndex !== currentIndex && newIndex < photos.length) {
      setCurrentIndex(newIndex);
      onPhotoSelect(photos[newIndex].id);
    }
  };

  /**
   * Toggle sheet state
   */
  const toggleSheet = () => {
    setSheetState((prev) => (prev === 'collapsed' ? 'expanded' : 'collapsed'));
  };

  const sheetHeight = sheetState === 'expanded' ? 'h-[70vh]' : 'h-[280px]';

  // Show empty state if no photos
  if (photos.length === 0 && !isLoading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-48 rounded-t-2xl bg-card shadow-2xl">
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card shadow-2xl transition-all duration-300 ${sheetHeight}`}
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center p-2">
        <button
          onClick={toggleSheet}
          className="flex w-full flex-col items-center gap-1"
          aria-label={sheetState === 'collapsed' ? 'Expand sheet' : 'Collapse sheet'}
        >
          <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
          {sheetState === 'collapsed' ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory carousel-scrollbar-hide smooth-scroll"
        onScroll={handleScroll}
        role="list"
        aria-label="Photo carousel"
      >
        {photos.map((photo, index) => (
          <div key={photo.id} className="snap-center">
            <MobilePhotoCard
              photo={photo}
              isActive={index === currentIndex}
              onClick={() => onPhotoSelect(photo.id)}
            />
          </div>
        ))}

        {/* Load More */}
        {hasMore && (
          <div className="flex flex-shrink-0 items-center justify-center snap-center" style={{ width: '85vw', maxWidth: '400px' }}>
            <Button
              onClick={onLoadMore}
              disabled={isLoading}
              variant="outline"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Pagination dots */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1 pb-2">
          {photos.slice(0, Math.min(photos.length, 10)).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                index === currentIndex ? 'bg-primary w-3' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
          {photos.length > 10 && (
            <span className="text-xs text-muted-foreground">+{photos.length - 10}</span>
          )}
        </div>
      )}
    </div>
  );
}

