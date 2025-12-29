/**
 * PhotoPopup Component
 * 
 * Small popup overlay that appears when a pin is clicked.
 * Shows photo preview, title, author, and a "View Details" link.
 */

import { Popup } from 'react-map-gl/mapbox';
import type { PhotoListItemDto } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X } from 'lucide-react';

interface PhotoPopupProps {
  photo: PhotoListItemDto;
  onClose: () => void;
}

/**
 * PhotoPopup - Displays photo information when a pin is selected
 */
export function PhotoPopup({ photo, onClose }: PhotoPopupProps) {
  const [lng, lat] = photo.location_public.coordinates;

  // Get initials for avatar fallback
  const initials = photo.user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Popup
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      offset={40}
      onClose={onClose}
      closeButton={false}
      className="photo-popup"
      maxWidth="280px"
    >
      <div className="relative w-64 overflow-hidden rounded-lg bg-card shadow-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Photo thumbnail */}
        <a href={`/photo/${photo.id}`} className="block">
          <img
            src={photo.thumbnail_url}
            alt={photo.title}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </a>

        {/* Content */}
        <div className="space-y-2 p-3">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground">
            {photo.title}
          </h3>

          {/* Author info */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={photo.user.avatar_url || undefined} alt={photo.user.display_name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{photo.user.display_name}</span>
            {photo.user.role === 'photographer' && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Pro
              </span>
            )}
          </div>

          {/* Category badge */}
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {photo.category}
            </span>
            {photo.favorite_count > 0 && (
              <span className="text-xs text-muted-foreground">❤️ {photo.favorite_count}</span>
            )}
          </div>

          {/* View details link */}
          <a
            href={`/photo/${photo.id}`}
            className="block w-full rounded-md bg-primary py-2 text-center text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View Details
          </a>
        </div>
      </div>
    </Popup>
  );
}

