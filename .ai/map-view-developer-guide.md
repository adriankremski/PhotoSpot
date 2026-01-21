# Map View - Developer Guide

## Architecture Overview

The Map View is built with **Astro 5**, **React 19**, **Mapbox GL**, and **TypeScript**. It follows a container/presenter pattern with custom hooks for state management.

---

## Tech Stack

| Technology   | Version | Purpose        |
| ------------ | ------- | -------------- |
| Astro        | 5.13.7  | SSR framework  |
| React        | 19.1.1  | UI components  |
| TypeScript   | 5.x     | Type safety    |
| Mapbox GL JS | 3.17.0  | Map rendering  |
| react-map-gl | 8.1.0   | React bindings |
| Tailwind CSS | 4.1.13  | Styling        |
| Shadcn/ui    | Latest  | UI components  |
| Vitest       | 4.0.16  | Testing        |

---

## Project Structure

```
src/
├── components/map/
│   ├── index.ts                     # Exports
│   ├── MapSection.tsx               # Container
│   ├── MapGL.tsx                    # Map wrapper
│   ├── PinClusterLayer.tsx          # Pins
│   ├── PhotoPopup.tsx               # Popup
│   ├── FilterPanel.tsx              # Filters
│   ├── MapControls.tsx              # Controls
│   ├── ThumbnailStrip.tsx           # Desktop gallery
│   ├── BottomSheetCarousel.tsx      # Mobile gallery
│   ├── UploadPhotoButton.tsx        # FAB
│   ├── LiveRegion.tsx               # A11y
│   ├── useMapPhotos.ts              # Data hook
│   ├── useMapSync.ts                # Sync hook
│   ├── map.css                      # Styles
│   └── *.test.{ts,tsx}              # Tests
├── lib/
│   ├── utils/
│   │   ├── mapHelpers.ts            # Map utilities
│   │   └── filterHelpers.ts         # Filter utilities
│   └── monitoring/
│       └── errorTracking.ts         # Error tracking
├── pages/
│   ├── map.astro                    # Page
│   └── api/photos/index.ts          # API endpoint
└── types.ts                         # Type definitions
```

---

## Component Hierarchy

```
map.astro (Astro SSR)
└── MapSection (React, client:load)
    ├── MapGL
    │   ├── PinClusterLayer
    │   │   └── PhotoPin (each pin)
    │   └── PhotoPopup
    ├── FilterPanel
    ├── MapControls
    ├── ThumbnailStrip (desktop)
    │   └── PhotoCard (each card)
    ├── BottomSheetCarousel (mobile)
    │   └── MobilePhotoCard (each card)
    ├── UploadPhotoButton
    └── LiveRegion
```

---

## Custom Hooks

### useMapPhotos

**Purpose:** Manages photo data, filtering, and pagination

**Location:** `src/components/map/useMapPhotos.ts`

**State:**

- `photos: PhotoListItemDto[]`
- `pagination: PaginationMeta`
- `isLoading: boolean`
- `error: string | null`
- `filters: PhotoFilters`

**Functions:**

- `setFilters(filters)` - Update filters and refetch
- `resetFilters()` - Clear all filters
- `loadMore()` - Load next page
- `refetchWithBounds(bounds)` - Fetch for new viewport (debounced)
- `clearError()` - Clear error state

**Key Features:**

- Debounces viewport changes (500ms)
- Uses AbortController for request cancellation
- Validates bounds and filters
- Handles pagination automatically

### useMapSync

**Purpose:** Synchronizes map and thumbnail selection

**Location:** `src/components/map/useMapSync.ts`

**State:**

- `selectedPhotoId: string | null`

**Functions:**

- `selectPhotoFromPin(id)` - Pin clicked → scroll thumbnail
- `selectPhotoFromThumbnail(id)` - Thumbnail clicked → center map
- `deselectPhoto()` - Clear selection
- `scrollToThumbnail(id)` - Scroll thumbnail into view
- `centerMapOnPhoto(id)` - Center map on coordinates

**Key Features:**

- Prevents circular updates with refs
- Smooth scroll behavior
- Auto-deselects when photo removed

---

## API Integration

### Endpoint: GET /api/photos

**URL:** `/api/photos`

**Query Parameters:**

```typescript
interface PhotoQueryParams {
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  category?: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  photographer_only?: boolean;
  limit?: number; // Max 200, default 200
  offset?: number; // Default 0
}
```

**Response:**

```typescript
interface ListResponse<PhotoListItemDto> {
  data: PhotoListItemDto[];
  meta: PaginationMeta;
}
```

**Error Codes:**

- `400` - Invalid input (validation failed)
- `500` - Internal server error

**Implementation:** `src/pages/api/photos/index.ts`

---

## State Flow

### Initial Load

```
1. map.astro renders with SSR
2. MapSection mounts (client:load)
3. useMapPhotos calculates initial bounds
4. Fetch photos from API
5. Render pins on map
6. Render thumbnails in gallery
```

### Viewport Change

```
1. User pans/zooms map
2. MapGL.onMove fires
3. Update viewport state
4. onBoundsChange (debounced 500ms)
5. useMapPhotos.refetchWithBounds
6. Cancel previous request
7. Fetch new photos
8. Update state
9. Re-render pins and thumbnails
```

### Pin Selection

```
1. User clicks pin
2. PinClusterLayer.onPinClick
3. useMapSync.selectPhotoFromPin
4. Set selectedPhotoId
5. Show PhotoPopup
6. Scroll thumbnail into view
7. Highlight thumbnail
```

### Thumbnail Selection

```
1. User clicks thumbnail
2. ThumbnailStrip.onThumbnailClick
3. useMapSync.selectPhotoFromThumbnail
4. Set selectedPhotoId
5. Center map on coordinates
6. Show PhotoPopup
7. Highlight thumbnail
```

### Filter Application

```
1. User selects filters
2. FilterPanel local state updates
3. User clicks "Apply"
4. onFiltersChange fires
5. useMapPhotos.setFilters
6. Reset offset to 0
7. Fetch with new filters
8. Update photos
9. Re-render everything
```

---

## Type System

### Core Types

**From `src/types.ts`:**

```typescript
// DTO from API
interface PhotoListItemDto {
  id: string;
  title: string;
  category: PhotoCategory;
  location_public: GeoPoint;
  user: UserBasicInfo;
  // ... more fields
}

// Query params
interface PhotoQueryParams {
  bbox?: string;
  category?: PhotoCategory;
  // ... filters
}

// Response envelope
interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

**ViewModel Types (map-specific):**

```typescript
// Map viewport
interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

// Filter state
interface PhotoFilters {
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  photographer_only: boolean;
}

// Pin for rendering
interface PhotoPin {
  id: string;
  coordinates: [number, number];
  isPhotographer: boolean;
  clusterId?: number | null;
}
```

---

## Styling

### Tailwind Classes

All components use Tailwind CSS v4 with custom configuration.

**Key Classes:**

- `thumbnail-strip-scrollbar` - Custom scrollbar
- `smooth-scroll` - Smooth scroll behavior
- `focus-ring` - Keyboard focus indicator
- `sr-only` - Screen reader only

### Custom CSS

**File:** `src/components/map/map.css`

**Features:**

- Custom scrollbar styling
- Pin animations
- Loading states
- Mobile optimizations
- Print styles

**Import:** Already imported in `global.css`

---

## Performance Optimizations

### Implemented

1. **React.memo** - PhotoPin, PhotoCard, MobilePhotoCard
2. **useMemo** - GeoJSON transformation
3. **useCallback** - Event handlers
4. **Debouncing** - Viewport changes (500ms)
5. **AbortController** - Cancel stale requests
6. **Lazy Loading** - Images (loading="lazy")
7. **Code Splitting** - Mapbox loaded separately

### Bundle Sizes

```
MapSection: 51.20 kB (gzipped: 16.08 kB)
Mapbox GL: 1,679.41 kB (gzipped: 464.39 kB)
```

### Optimization Opportunities

- **Virtual Scrolling:** For 1000+ photos (consider react-window)
- **Dynamic Import:** Load Mapbox only when needed
- **Image CDN:** Optimize thumbnails with CDN
- **Service Worker:** Cache map tiles offline

---

## Testing

### Unit Tests

**File:** `useMapPhotos.test.ts`

```bash
npm run test -- useMapPhotos.test.ts
```

**Coverage:**

- Hook initialization
- Photo fetching
- Filter updates
- Error handling
- Pagination

### Component Tests

**File:** `FilterPanel.test.tsx`

```bash
npm run test -- FilterPanel.test.tsx
```

**Coverage:**

- Render controls
- Filter application
- Reset functionality
- Loading states

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI
npm run test:ui
```

---

## Error Handling

### Error Tracking

**File:** `src/lib/monitoring/errorTracking.ts`

**Functions:**

- `trackError()` - Track errors
- `trackWarning()` - Track warnings
- `trackAPIError()` - Track API errors
- `trackMapError()` - Track map-specific errors

**Integration:**

```typescript
import { trackMapError } from "@/lib/monitoring/errorTracking";

try {
  // ... code
} catch (error) {
  trackMapError("action_name", error);
}
```

### Error Boundary

**File:** `src/components/ErrorBoundary.tsx`

**Usage:**

```tsx
<ErrorBoundary fallback={<CustomError />}>
  <MapSection />
</ErrorBoundary>
```

---

## Accessibility

### ARIA Implementation

**Labels:**

- Map: `role="application" aria-label="Interactive photo map"`
- Thumbnails: `role="list"` with `role="listitem"`
- Buttons: Descriptive `aria-label` attributes
- Forms: Proper `label` associations

**Live Regions:**

- Photo count announcements
- Filter change announcements
- Error messages

**Keyboard Support:**

- Tab navigation through controls
- Arrow keys for thumbnail navigation
- Enter/Space for activation
- Focus indicators on all interactives

### Testing

```bash
# Screen reader testing
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (Mac)

# Keyboard navigation
- Tab through all controls
- Use arrow keys in galleries
- Test focus indicators
```

---

## Configuration

### Environment Variables

```env
# .env file
PUBLIC_MAPBOX_TOKEN=pk.your_token_here
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Astro Config

**File:** `astro.config.mjs`

```javascript
export default defineConfig({
  vite: {
    ssr: {
      noExternal: ["react-map-gl", "mapbox-gl"],
    },
  },
});
```

**Why:** react-map-gl v8 requires this for SSR compatibility

---

## Deployment

### Build

```bash
npm run build
```

**Output:** `dist/` directory

### Environment Check

```bash
# Verify environment variables
echo $PUBLIC_MAPBOX_TOKEN
echo $PUBLIC_SUPABASE_URL
```

### Production Checklist

- [ ] Mapbox token configured
- [ ] API endpoint `/api/photos` working
- [ ] Database migrations applied
- [ ] Error tracking initialized (Sentry)
- [ ] Performance monitoring enabled
- [ ] SSL certificate valid
- [ ] CDN configured for images

---

## Troubleshooting

### Common Issues

**1. react-map-gl import error**

```
Error: Failed to resolve entry for package "react-map-gl"
```

**Solution:** Use `/mapbox` import path

```typescript
import { Map } from "react-map-gl/mapbox";
```

**2. Mapbox token missing**

```
Error: Map configuration error
```

**Solution:** Add `PUBLIC_MAPBOX_TOKEN` to `.env`

**3. Photos not loading**

```
Error: API returned 500
```

**Solution:** Check database connection and `/api/photos` endpoint

**4. TypeScript errors**

```
Error: Property 'coordinates' does not exist
```

**Solution:** Ensure types are imported from correct paths

---

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with Prettier
- **Formatting:** Run `npm run lint:fix`
- **Commits:** Conventional commit format

### Adding Features

1. Create feature branch
2. Add types to `types.ts` if needed
3. Implement component/hook
4. Add tests
5. Update documentation
6. Submit PR

### Testing Requirements

- Unit tests for hooks
- Component tests for UI
- E2E tests for critical flows
- Accessibility audit

---

## Resources

**Documentation:**

- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/api/)
- [react-map-gl Docs](https://visgl.github.io/react-map-gl/)
- [Astro Docs](https://docs.astro.build/)

**Internal Docs:**

- [API Plan](.ai/api-plan.md)
- [Implementation Plan](.ai/map-view-implementation-plan.md)
- [User Guide](.ai/map-view-user-guide.md)

---

**Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Maintainer:** Development Team
