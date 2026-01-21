# View Implementation Plan: Map View (Home)

## 1. Overview

The Map View is the primary interface for discovering photo locations through an interactive map. It combines a Mapbox-powered map with photo pins (clustered when >50 photos), a synchronized horizontal thumbnail strip (desktop) or bottom sheet carousel (mobile), and a filter panel. The view fetches approved photos from the public `/api/photos` endpoint based on the current map viewport, supporting filters for category, season, time of day, and photographer-only content. The map and thumbnails are bidirectionally synchronized: clicking a pin scrolls to the corresponding thumbnail, and clicking a thumbnail centers the map on that pin's location.

## 2. View Routing

- **Primary Path**: `/map`
- **Alias**: `/` (default route for authenticated, onboarded users)
- **Auth Requirement**: None (public view, but shows additional UI for authenticated users)

## 3. Component Structure

```
/pages/map.astro (Astro page)
└── MainLayout (Astro layout)
    ├── NavbarAuth (React component)
    └── MapSection (React component - main container)
        ├── MapContainer (React component)
        │   ├── MapGL (React component - Mapbox wrapper)
        │   │   ├── PinClusterLayer (React component)
        │   │   └── PhotoPopup (React component)
        │   └── MapControls (React component)
        ├── FilterPanel (React component)
        ├── ThumbnailStrip (React component - desktop only)
        ├── BottomSheetCarousel (React component - mobile only)
        ├── UploadPhotoButton (React component)
        └── ErrorBanner (React component)
```

## 4. Component Details

### 4.1. MapSection

**Description**: Root container component that orchestrates the entire map view. It manages the state for photos, filters, selected photo, viewport, and loading/error states. It provides context to child components and handles the coordination between map and thumbnail interactions.

**Main Elements**:

- `<div>` with full-screen layout (flex column)
- Conditional rendering of desktop vs mobile layouts
- Loading overlay during data fetch
- Error banner at the top when API errors occur

**Handled Interactions**:

- Initial data load on mount
- Viewport change (debounced) triggering photo refetch
- Filter changes triggering photo refetch
- Pin selection propagating to thumbnail scroll
- Thumbnail selection propagating to map centering

**Validation Conditions**:

- Validate bbox bounds before API call: `minLng < maxLng` and `minLat < maxLat`
- Ensure latitude is between -90 and 90
- Ensure longitude is between -180 and 180
- Validate filter enum values against type guards
- Enforce limit ≤ 200

**Types**:

- `MapViewState` (ViewModel)
- `PhotoListItemDto` (DTO)
- `ListResponse<PhotoListItemDto>` (DTO)
- `PhotoQueryParams` (DTO)
- `MapViewport` (ViewModel)
- `PhotoFilters` (ViewModel)

**Props**: None (top-level component)

### 4.2. MapGL

**Description**: Mapbox GL wrapper component that renders the interactive map. It manages the map instance, viewport state (center, zoom, bounds), and provides map event handlers. It uses react-map-gl library for React integration.

**Main Elements**:

- `<Map>` component from react-map-gl
- Map style configuration (Mapbox streets or custom)
- Navigation controls (zoom, compass)
- Geolocate control (optional)

**Handled Interactions**:

- `onMove`: Updates viewport state and propagates bounds to parent
- `onClick`: Deselects current photo when clicking empty map area
- `onLoad`: Sets initial map state, centers on user location or default
- `onError`: Handles map initialization errors

**Validation Conditions**:

- Validate initial viewport coordinates are valid
- Check if Mapbox token is present
- Verify map style URL is valid

**Types**:

- `MapViewport` (ViewModel)
- `MapboxEvent` (from react-map-gl)

**Props**:

```typescript
interface MapGLProps {
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onBoundsChange: (bounds: BoundingBox) => void;
  children?: React.ReactNode; // for layers
}
```

### 4.3. PinClusterLayer

**Description**: Renders photo pins as markers on the map with clustering support. Distinguishes between photographer pins (gold) and regular user pins (blue). Handles pin click events to select photos and show popups.

**Main Elements**:

- `<Source>` component with GeoJSON data
- `<Layer>` components for clusters and individual pins
- Cluster circle with count
- Individual pin markers with custom icons

**Handled Interactions**:

- `onClick` on pin: Select photo, show popup, propagate to parent
- `onMouseEnter` on pin: Change cursor to pointer
- `onMouseLeave` on pin: Reset cursor
- Cluster expansion on click

**Validation Conditions**:

- Validate GeoJSON features have valid coordinates
- Check if cluster_id is present when count > 50
- Ensure photo data contains required fields for pin rendering

**Types**:

- `PhotoListItemDto` (DTO)
- `GeoPoint` (DTO)
- `PhotoPin` (ViewModel)
- `ClusterFeature` (from mapbox-gl)

**Props**:

```typescript
interface PinClusterLayerProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onPinClick: (photoId: string) => void;
}
```

### 4.4. PhotoPopup

**Description**: Small popup overlay that appears when a pin is clicked, showing photo preview, title, author, and a "View Details" link. Positioned above the selected pin on the map.

**Main Elements**:

- `<Popup>` component from react-map-gl
- Thumbnail image
- Photo title (truncated if long)
- Author display name with avatar
- "View Details" link to `/photo/[id]`
- Close button

**Handled Interactions**:

- `onClick` on close button: Deselect photo, hide popup
- `onClick` on "View Details": Navigate to photo detail page
- `onClick` on thumbnail: Navigate to photo detail page

**Validation Conditions**:

- Ensure selected photo data is not null
- Validate thumbnail URL exists
- Check coordinates are valid for popup positioning

**Types**:

- `PhotoListItemDto` (DTO)
- `GeoPoint` (DTO)

**Props**:

```typescript
interface PhotoPopupProps {
  photo: PhotoListItemDto;
  onClose: () => void;
}
```

### 4.5. FilterPanel

**Description**: Collapsible panel with filter controls for category, season, time of day, and photographer-only toggle. Appears as a floating panel on desktop (top-left or top-right) and as a slide-up drawer on mobile.

**Main Elements**:

- Container `<div>` with card styling
- Category `<select>` dropdown (with "All" option)
- Season `<select>` dropdown (with "All" option)
- Time of day `<select>` dropdown (with "All" option)
- Photographer-only checkbox
- "Apply Filters" button
- "Reset" button
- Collapse/expand toggle button

**Handled Interactions**:

- `onChange` on selects: Update local filter state
- `onChange` on checkbox: Update photographer_only state
- `onClick` on "Apply": Validate and propagate filters to parent
- `onClick` on "Reset": Clear all filters, propagate to parent
- `onClick` on collapse toggle: Toggle panel visibility

**Validation Conditions**:

- Validate selected category is valid `PhotoCategory` or null
- Validate selected season is valid `Season` or null
- Validate selected time_of_day is valid `TimeOfDay` or null
- Ensure photographer_only is boolean

**Types**:

- `PhotoFilters` (ViewModel)
- `PhotoCategory` (Enum)
- `Season` (Enum)
- `TimeOfDay` (Enum)

**Props**:

```typescript
interface FilterPanelProps {
  filters: PhotoFilters;
  onFiltersChange: (filters: PhotoFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
}
```

### 4.6. ThumbnailStrip (Desktop)

**Description**: Horizontal scrollable strip at the bottom of the screen displaying photo thumbnails. Synchronized with map: scrolls to selected photo when pin is clicked, and centers map when thumbnail is clicked.

**Main Elements**:

- Container `<div>` with horizontal scroll (`overflow-x: auto`)
- Scrollable inner `<div>` with flex layout
- Photo cards: thumbnail image, title, author name
- "Load More" button at the end if `has_more` is true
- Empty state message when no photos

**Handled Interactions**:

- `onClick` on thumbnail card: Select photo, center map, propagate to parent
- `onClick` on "Load More": Fetch next page with offset
- Automatic scroll when `selectedPhotoId` changes (from pin click)
- Keyboard navigation: arrow keys to navigate between thumbnails

**Validation Conditions**:

- Check if photos array is not empty before rendering
- Validate thumbnail URLs exist
- Ensure pagination meta is present for "Load More" logic

**Types**:

- `PhotoListItemDto` (DTO)
- `PaginationMeta` (DTO)

**Props**:

```typescript
interface ThumbnailStripProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onThumbnailClick: (photoId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}
```

### 4.7. BottomSheetCarousel (Mobile)

**Description**: Mobile-optimized bottom sheet with swipeable carousel of photo cards. Draggable to expand/collapse. Synchronized with map like ThumbnailStrip.

**Main Elements**:

- Bottom sheet container with drag handle
- Swipeable carousel (using Swiper or similar library)
- Photo cards: larger thumbnail, title, author, category badge
- Expand/collapse indicator
- Empty state when no photos

**Handled Interactions**:

- `onSwipe`: Navigate between photos, update selected photo
- `onDrag`: Expand or collapse bottom sheet
- `onClick` on card: Navigate to photo detail page
- Automatic slide to selected photo when pin is clicked

**Validation Conditions**:

- Same as ThumbnailStrip
- Validate swipe gestures within bounds
- Ensure at least one photo is present for carousel

**Types**:

- `PhotoListItemDto` (DTO)
- `PaginationMeta` (DTO)

**Props**:

```typescript
interface BottomSheetCarouselProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onPhotoSelect: (photoId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading?: boolean;
}
```

### 4.8. UploadPhotoButton

**Description**: Floating action button (FAB) that navigates to the photo upload page. Only visible to authenticated users with photographer role.

**Main Elements**:

- Floating `<button>` with icon (camera or plus)
- Tooltip on hover: "Upload Photo"
- Conditional rendering based on user role

**Handled Interactions**:

- `onClick`: Navigate to `/upload` page (or show modal)
- `onMouseEnter`: Show tooltip

**Validation Conditions**:

- Check if user is authenticated
- Check if user role is "photographer"
- Hide button if conditions not met

**Types**:

- `UserRole` (Enum)

**Props**:

```typescript
interface UploadPhotoButtonProps {
  userRole: UserRole | null;
  isAuthenticated: boolean;
}
```

### 4.9. MapControls

**Description**: Additional map control buttons like "Locate Me" (geolocation), "Reset View", and optional style switcher.

**Main Elements**:

- Control buttons container (absolute positioned)
- Locate button with icon
- Reset view button
- Optional style switcher

**Handled Interactions**:

- `onClick` on Locate: Request geolocation, center map on user location
- `onClick` on Reset: Reset viewport to default location
- `onClick` on style switcher: Change map style

**Validation Conditions**:

- Check if geolocation API is available
- Validate coordinates returned by geolocation

**Types**:

- `MapViewport` (ViewModel)

**Props**:

```typescript
interface MapControlsProps {
  onLocateMe: () => void;
  onResetView: () => void;
  isLocating?: boolean;
}
```

## 5. Types

### 5.1. Existing DTOs (from `src/types.ts`)

**PhotoListItemDto**: Primary data structure for each photo in the list.

```typescript
interface PhotoListItemDto {
  id: string;
  title: string;
  description: string | null;
  category: PhotoCategory;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  file_url: string;
  thumbnail_url: string;
  location_public: GeoPoint;
  is_location_blurred?: boolean;
  user: UserBasicInfo;
  tags: string[];
  created_at: string;
  favorite_count: number;
  cluster_id?: number | null;
}
```

**PhotoQueryParams**: Query parameters for the GET /api/photos endpoint.

```typescript
interface PhotoQueryParams {
  bbox?: string; // "minLng,minLat,maxLng,maxLat"
  category?: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  photographer_only?: boolean;
  limit?: number;
  offset?: number;
}
```

**ListResponse<T>**: Generic envelope for list endpoints.

```typescript
interface ListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

**PaginationMeta**: Pagination metadata.

```typescript
interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  has_more?: boolean;
}
```

**GeoPoint**: GeoJSON Point for coordinates.

```typescript
interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}
```

**BoundingBox**: Tuple for map bounds.

```typescript
type BoundingBox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
```

**UserBasicInfo**: Embedded user information.

```typescript
interface UserBasicInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role?: UserRole;
}
```

### 5.2. New ViewModel Types (to be added)

**MapViewport**: Represents the current map viewport state.

```typescript
interface MapViewport {
  latitude: number; // Center latitude
  longitude: number; // Center longitude
  zoom: number; // Zoom level (0-22)
  pitch?: number; // Optional 3D tilt
  bearing?: number; // Optional rotation
}
```

**MapBounds**: Map bounds derived from viewport.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

**PhotoFilters**: Current filter state.

```typescript
interface PhotoFilters {
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  photographer_only: boolean;
}
```

**MapViewState**: Complete state for MapSection component.

```typescript
interface MapViewState {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  viewport: MapViewport;
  filters: PhotoFilters;
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
}
```

**PhotoPin**: Simplified pin data for map rendering.

```typescript
interface PhotoPin {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  isPhotographer: boolean; // For gold vs blue pin color
  clusterId?: number | null;
}
```

## 6. State Management

State is managed at the **MapSection** component level using React hooks, with a custom hook abstracting the complex logic.

### 6.1. Custom Hook: `useMapPhotos`

**Purpose**: Encapsulates all logic for fetching photos, managing filters, pagination, and viewport-based queries.

**Location**: `src/components/map/useMapPhotos.ts`

**Interface**:

```typescript
interface UseMapPhotosReturn {
  photos: PhotoListItemDto[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  filters: PhotoFilters;
  setFilters: (filters: PhotoFilters) => void;
  resetFilters: () => void;
  loadMore: () => void;
  refetchWithBounds: (bounds: BoundingBox) => void;
}

function useMapPhotos(initialViewport: MapViewport): UseMapPhotosReturn;
```

**Internal State**:

- `photos`: Array of PhotoListItemDto
- `pagination`: PaginationMeta from API response
- `isLoading`: Boolean for loading state
- `error`: Error message string or null
- `filters`: PhotoFilters object
- `offset`: Current pagination offset

**Key Functions**:

- `fetchPhotos(bounds: BoundingBox, filters: PhotoFilters, offset: number)`: Calls API with query params
- `setFilters(filters)`: Updates filters and triggers refetch with offset 0
- `resetFilters()`: Clears filters and refetches
- `loadMore()`: Increments offset and appends results
- `refetchWithBounds(bounds)`: Debounced refetch when viewport changes

**Dependencies**:

- Uses `useEffect` to trigger initial fetch
- Uses `useCallback` for memoized functions
- Uses `useMemo` for derived state
- Debounces viewport changes (500ms) to avoid excessive API calls

### 6.2. Custom Hook: `useMapSync`

**Purpose**: Manages synchronization between map and thumbnail strip, including selected photo state and scroll/pan behaviors.

**Location**: `src/components/map/useMapSync.ts`

**Interface**:

```typescript
interface UseMapSyncReturn {
  selectedPhotoId: string | null;
  selectPhotoFromPin: (photoId: string) => void;
  selectPhotoFromThumbnail: (photoId: string) => void;
  deselectPhoto: () => void;
  scrollToThumbnail: (photoId: string) => void;
  centerMapOnPhoto: (photoId: string) => void;
}

function useMapSync(
  photos: PhotoListItemDto[],
  viewport: MapViewport,
  setViewport: (viewport: MapViewport) => void
): UseMapSyncReturn;
```

**Internal State**:

- `selectedPhotoId`: Currently selected photo ID or null
- `selectionSource`: 'map' | 'thumbnail' | null (to prevent circular updates)

**Key Functions**:

- `selectPhotoFromPin(photoId)`: Sets selected photo, scrolls thumbnail into view
- `selectPhotoFromThumbnail(photoId)`: Sets selected photo, centers map on pin
- `deselectPhoto()`: Clears selection
- `scrollToThumbnail(photoId)`: Uses ref to scroll thumbnail strip
- `centerMapOnPhoto(photoId)`: Updates viewport to center on photo coordinates

### 6.3. Component State

**MapSection**:

- Uses `useMapPhotos` for photo data and filters
- Uses `useMapSync` for selection and synchronization
- Manages viewport state locally with `useState<MapViewport>`

**MapGL**:

- Controlled viewport via props
- Internal map instance ref

**FilterPanel**:

- Local form state (controlled inputs)
- Syncs with parent on "Apply" click

## 7. API Integration

### 7.1. Endpoint

**GET** `/api/photos`

### 7.2. Request Construction

**Function**: `buildPhotoQueryParams`

```typescript
function buildPhotoQueryParams(
  bounds: BoundingBox,
  filters: PhotoFilters,
  offset: number,
  limit: number = 200
): PhotoQueryParams {
  const [minLng, minLat, maxLng, maxLat] = bounds;

  return {
    bbox: `${minLng},${minLat},${maxLng},${maxLat}`,
    category: filters.category || undefined,
    season: filters.season || undefined,
    time_of_day: filters.time_of_day || undefined,
    photographer_only: filters.photographer_only || undefined,
    limit,
    offset,
  };
}
```

**Query String Serialization**:

- Use `URLSearchParams` to build query string
- Filter out undefined values
- Format boolean as string ("true" / "false")

### 7.3. API Call

**Function**: `fetchPhotos`

```typescript
async function fetchPhotos(params: PhotoQueryParams): Promise<ListResponse<PhotoListItemDto>> {
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  const response = await fetch(`/api/photos?${queryString}`);

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}
```

### 7.4. Response Handling

**Success (200 OK)**:

- Extract `data` array and `meta` object
- Update photos state
- Update pagination meta
- Set loading to false

**Error (400 Bad Request)**:

- Parse `ApiError` response
- Set error state with message
- Show error banner
- Keep previous photos (don't clear)

**Error (500 Internal Server Error)**:

- Set generic error message
- Log to console/Sentry
- Show error banner

**Network Error**:

- Catch fetch exception
- Set error: "Network error, please check your connection"
- Show error banner

### 7.5. Request Types

```typescript
// Input to API call
type PhotoQueryParams = {
  bbox?: string;
  category?: PhotoCategory;
  season?: Season;
  time_of_day?: TimeOfDay;
  photographer_only?: boolean;
  limit?: number;
  offset?: number;
};
```

### 7.6. Response Type

```typescript
// API response envelope
type ListResponse<PhotoListItemDto> = {
  data: PhotoListItemDto[];
  meta: PaginationMeta;
};
```

## 8. User Interactions

### 8.1. Initial Page Load

**Flow**:

1. User navigates to `/map`
2. MapSection mounts and initializes viewport (default or user's last location)
3. `useMapPhotos` triggers initial fetch with viewport bounds
4. Loading spinner shows while fetching
5. Photos render as pins on map and thumbnails in strip
6. If no photos, show empty state: "No photos found in this area. Try adjusting your filters or moving the map."

### 8.2. Map Pan/Zoom (Viewport Change)

**Flow**:

1. User drags map or zooms
2. MapGL fires `onMove` event
3. Viewport state updates
4. `onBoundsChange` fires (debounced 500ms)
5. `useMapPhotos.refetchWithBounds(newBounds)` called
6. Loading indicator shows (subtle, not full screen)
7. New photos fetched and rendered
8. Pins update, thumbnail strip updates

### 8.3. Pin Click

**Flow**:

1. User clicks a pin on the map
2. `PinClusterLayer` fires `onPinClick(photoId)`
3. `useMapSync.selectPhotoFromPin(photoId)` called
4. `selectedPhotoId` state updates
5. PhotoPopup appears above the pin
6. Thumbnail strip scrolls to selected photo (smooth scroll)
7. Selected thumbnail highlights with border

### 8.4. Thumbnail Click

**Flow**:

1. User clicks a thumbnail card
2. `ThumbnailStrip` fires `onThumbnailClick(photoId)`
3. `useMapSync.selectPhotoFromThumbnail(photoId)` called
4. `selectedPhotoId` state updates
5. Map viewport animates to center on pin location
6. PhotoPopup appears above the pin
7. Thumbnail highlights

### 8.5. Filter Change

**Flow**:

1. User opens FilterPanel
2. User selects category, season, time_of_day, or toggles photographer_only
3. User clicks "Apply Filters"
4. FilterPanel fires `onFiltersChange(newFilters)`
5. `useMapPhotos.setFilters(newFilters)` called
6. Offset resets to 0
7. Photos refetch with new filters + current bounds
8. Map pins and thumbnails update
9. If no results, show "No photos match your filters" empty state

### 8.6. Filter Reset

**Flow**:

1. User clicks "Reset" button in FilterPanel
2. FilterPanel fires `onReset()`
3. `useMapPhotos.resetFilters()` called
4. All filters clear
5. Photos refetch with no filters
6. Map and thumbnails update

### 8.7. Load More (Pagination)

**Flow**:

1. User scrolls thumbnail strip to the end
2. "Load More" button appears
3. User clicks "Load More"
4. ThumbnailStrip fires `onLoadMore()`
5. `useMapPhotos.loadMore()` called
6. Offset increments by limit (200)
7. Next page fetched with same bounds and filters
8. New photos appended to existing array
9. Thumbnails render new items

### 8.8. Upload Button Click

**Flow**:

1. User (photographer role) clicks floating upload button
2. Navigate to `/upload` page
3. (Alternatively, open upload modal if implemented)

### 8.9. Popup Close

**Flow**:

1. User clicks "X" button in PhotoPopup or clicks elsewhere on map
2. PhotoPopup fires `onClose()`
3. `useMapSync.deselectPhoto()` called
4. `selectedPhotoId` clears
5. Popup disappears
6. Thumbnail unhighlights

### 8.10. Locate Me

**Flow**:

1. User clicks "Locate Me" button
2. Request geolocation permission
3. If granted: Get current coordinates, center map on user location
4. If denied: Show toast "Location access denied"
5. Refetch photos for new viewport

## 9. Conditions and Validation

### 9.1. Filter Validation (FilterPanel)

**Conditions**:

- Category must be a valid `PhotoCategory` enum value or null
- Season must be a valid `Season` enum value or null
- Time of day must be a valid `TimeOfDay` enum value or null
- Photographer-only must be a boolean

**Validation**:

- Use type guards `isPhotoCategory()`, `isSeason()`, `isTimeOfDay()` before applying filters
- If invalid, log warning and ignore invalid filter
- Display validation error in FilterPanel if user manually edits (edge case)

**Effect on UI**:

- Invalid filters are ignored
- Only valid filters sent to API
- Error banner shows if API rejects filters

### 9.2. Bounding Box Validation (useMapPhotos)

**Conditions**:

- bbox must have 4 comma-separated floats
- minLng < maxLng
- minLat < maxLat
- Latitude between -90 and 90
- Longitude between -180 and 180

**Validation**:

- Before calling API, validate bounds with `validateBoundingBox(bounds)` function
- If invalid, log error and use fallback bounds (world bounds)
- Prevent API call if bounds are clearly invalid

**Effect on UI**:

- Invalid bounds prevent unnecessary API calls
- Error logged to console for debugging

### 9.3. Pagination Limit (useMapPhotos)

**Conditions**:

- Limit must be ≤ 200
- Limit must be > 0
- Offset must be ≥ 0

**Validation**:

- Clamp limit to 200 max
- Ensure offset is non-negative
- If API returns error, show error banner

**Effect on UI**:

- Prevents exceeding API limits
- Ensures valid pagination state

### 9.4. Photo Data Validation (Component Rendering)

**Conditions**:

- Each photo must have valid `id`, `thumbnail_url`, `location_public`
- Coordinates must be valid numbers

**Validation**:

- Before rendering pins, filter out photos with invalid coordinates
- Log warning for malformed photo data
- Skip rendering invalid photos

**Effect on UI**:

- Only valid photos render as pins
- No crashes from malformed data

### 9.5. Clustering Condition (PinClusterLayer)

**Conditions**:

- If `photos.length > 50` and `cluster_id` is present, enable clustering
- Otherwise, render individual pins

**Validation**:

- Check `meta.total` and presence of `cluster_id` in photo data
- Enable clustering mode if conditions met

**Effect on UI**:

- Smooth clustering when many pins
- Individual pins when few photos

### 9.6. Empty State Conditions

**Conditions**:

- If `photos.length === 0` and not loading and no error, show empty state

**Validation**:

- Check all three conditions before showing empty state

**Effect on UI**:

- "No photos found" message appears
- Suggest adjusting filters or moving map

### 9.7. Authentication Checks (UploadPhotoButton)

**Conditions**:

- User must be authenticated
- User role must be "photographer"

**Validation**:

- Check `isAuthenticated` and `userRole === 'photographer'`
- Hide button if conditions not met

**Effect on UI**:

- Upload button only visible to photographers
- Non-photographers don't see button

## 10. Error Handling

### 10.1. API Errors

**400 Bad Request**:

- **Scenario**: Invalid bbox format, unknown enum value, limit > 200
- **Handling**:
  - Parse `ApiError` response
  - Show error banner: "Invalid filters. Please check your selections."
  - Keep current photos visible (don't clear)
  - Log error details to console
- **User Action**: Adjust filters and try again

**500 Internal Server Error**:

- **Scenario**: Unexpected server error, database issue
- **Handling**:
  - Show error banner: "Server error. Please try again later."
  - Log error to Sentry with full context
  - Keep current photos visible
- **User Action**: Retry or refresh page

### 10.2. Network Errors

**Network Timeout / Offline**:

- **Scenario**: No internet connection, request timeout
- **Handling**:
  - Catch fetch exception
  - Show error banner: "Network error. Please check your connection."
  - Provide "Retry" button in banner
  - Keep current photos visible
- **User Action**: Check connection and retry

### 10.3. Map Loading Errors

**Mapbox Initialization Failure**:

- **Scenario**: Invalid Mapbox token, service unavailable
- **Handling**:
  - Catch map error in `onError` handler
  - Show fallback message: "Map failed to load. Please refresh the page."
  - Log error to Sentry
- **User Action**: Refresh page or check Mapbox status

### 10.4. Geolocation Errors

**Permission Denied**:

- **Scenario**: User denies geolocation permission
- **Handling**:
  - Show toast notification: "Location access denied. Using default location."
  - Fall back to default viewport (e.g., center of US or Europe)
- **User Action**: Grant permission in browser settings if desired

**Position Unavailable**:

- **Scenario**: GPS signal not available
- **Handling**:
  - Show toast: "Unable to determine your location."
  - Use default viewport
- **User Action**: Move map manually

### 10.5. Empty State (No Photos)

**No Photos in Viewport**:

- **Scenario**: Query returns 0 photos
- **Handling**:
  - Show empty state message in thumbnail strip: "No photos found in this area."
  - Suggest: "Try adjusting your filters or exploring a different area."
  - Keep map interactive
- **User Action**: Pan map or change filters

**No Photos Matching Filters**:

- **Scenario**: Filters are too restrictive
- **Handling**:
  - Show empty state: "No photos match your filters."
  - Suggest: "Try removing some filters or exploring a different area."
  - Provide "Reset Filters" button in empty state
- **User Action**: Reset filters or adjust them

### 10.6. Invalid Data Handling

**Malformed Photo Data**:

- **Scenario**: API returns photo with missing required fields
- **Handling**:
  - Filter out invalid photos before rendering
  - Log warning with photo ID
  - Continue rendering valid photos
- **User Action**: No action needed (handled gracefully)

**Invalid Coordinates**:

- **Scenario**: Photo has coordinates outside valid range
- **Handling**:
  - Skip rendering pin for that photo
  - Log warning
  - Show thumbnail but with "Location unavailable" label
- **User Action**: No action needed

### 10.7. Clustering Errors

**Cluster Expansion Failure**:

- **Scenario**: Click on cluster but expansion fails
- **Handling**:
  - Log error
  - Zoom in manually to break up cluster
- **User Action**: Zoom in to see individual pins

## 11. Implementation Steps

### Step 1: Project Setup and Dependencies

1. Install required packages:
   ```bash
   npm install react-map-gl mapbox-gl
   npm install --save-dev @types/mapbox-gl
   ```
2. Set up Mapbox token in `.env`:
   ```
   PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   ```
3. Add Mapbox CSS to global styles or layout

### Step 2: Create Type Definitions

1. Add new ViewModel types to `src/types.ts`:
   - `MapViewport`
   - `MapBounds`
   - `PhotoFilters`
   - `MapViewState`
   - `PhotoPin`
2. Ensure all DTO types are imported correctly

### Step 3: Create Utility Functions

1. Create `src/lib/utils/mapHelpers.ts`:
   - `boundsToString(bounds: BoundingBox): string`
   - `validateBoundingBox(bounds: BoundingBox): boolean`
   - `photoToPin(photo: PhotoListItemDto): PhotoPin`
2. Create `src/lib/utils/filterHelpers.ts`:
   - `isFilterEmpty(filters: PhotoFilters): boolean`
   - `filtersToQueryParams(filters: PhotoFilters): Partial<PhotoQueryParams>`

### Step 4: Implement Custom Hooks

1. Create `src/components/map/useMapPhotos.ts`:
   - Implement `fetchPhotos` function
   - Implement `useMapPhotos` hook with all state and functions
   - Add debouncing for viewport changes
2. Create `src/components/map/useMapSync.ts`:
   - Implement `useMapSync` hook
   - Handle selection logic
   - Implement scroll and pan functions

### Step 5: Build Core Map Components

1. Create `src/components/map/MapGL.tsx`:
   - Set up react-map-gl `<Map>` component
   - Handle viewport changes
   - Implement event handlers
2. Create `src/components/map/PinClusterLayer.tsx`:
   - Convert photos to GeoJSON
   - Implement cluster and pin layers
   - Style pins based on user role (gold/blue)
   - Handle click events
3. Create `src/components/map/PhotoPopup.tsx`:
   - Build popup UI
   - Position above selected pin
   - Add navigation link

### Step 6: Build Filter and Control Components

1. Create `src/components/map/FilterPanel.tsx`:
   - Build form with selects and checkbox
   - Implement local state for form
   - Add Apply and Reset buttons
2. Create `src/components/map/MapControls.tsx`:
   - Add Locate Me button
   - Add Reset View button
   - Implement geolocation logic

### Step 7: Build Thumbnail Components

1. Create `src/components/map/ThumbnailStrip.tsx`:
   - Horizontal scroll container
   - Photo card component
   - Scroll-to-selected logic
   - Load More button
2. Create `src/components/map/BottomSheetCarousel.tsx` (mobile):
   - Implement swipeable carousel
   - Bottom sheet with drag handle
   - Responsive breakpoint logic

### Step 8: Build Container Components

1. Create `src/components/map/MapSection.tsx`:
   - Integrate `useMapPhotos` and `useMapSync`
   - Compose all child components
   - Handle loading and error states
   - Implement responsive layout (desktop/mobile)
2. Create `src/components/map/UploadPhotoButton.tsx`:
   - Floating action button
   - Role-based visibility

### Step 9: Create Astro Page

1. Create `src/pages/map.astro`:
   - Import MapSection as client component
   - Use MainLayout
   - Pass initial data (e.g., user auth state)
   - Set page title and meta tags

### Step 10: Styling and Responsiveness

1. Create `src/components/map/map.css` or use Tailwind classes:
   - Style FilterPanel (floating panel)
   - Style ThumbnailStrip (horizontal scroll)
   - Style BottomSheetCarousel (mobile)
   - Style PhotoPopup
   - Style loading states and error banners
2. Implement responsive breakpoints:
   - Desktop: Show ThumbnailStrip, hide BottomSheetCarousel
   - Mobile: Show BottomSheetCarousel, hide ThumbnailStrip
   - Use `@media` queries or Tailwind responsive classes

### Step 11: Accessibility Enhancements

1. Add ARIA labels to interactive elements:
   - Map pins: `aria-label="Photo by {author} at {location}"`
   - Filter controls: proper labels and associations
   - Thumbnail cards: `aria-label` with photo title and author
2. Implement keyboard navigation:
   - Tab through pins (invisible DOM markers)
   - Arrow keys in thumbnail strip
   - Focus management for popup
3. Add live regions for dynamic updates:
   - `<div aria-live="polite">` for "X photos loaded"
   - Announce filter changes

### Step 12: Testing

1. Unit tests for custom hooks:
   - `useMapPhotos.test.ts`: Test fetching, filtering, pagination
   - `useMapSync.test.ts`: Test selection and synchronization
2. Component tests:
   - `FilterPanel.test.tsx`: Test form interactions
   - `ThumbnailStrip.test.tsx`: Test click and scroll
   - `PinClusterLayer.test.tsx`: Test pin rendering
3. Integration tests:
   - Test full flow: load → filter → select pin → select thumbnail
   - Test error scenarios
   - Test empty states
4. E2E tests (optional):
   - Full user journey through map view
   - Test with real API

### Step 13: Performance Optimization

1. Memoize expensive computations:
   - Use `useMemo` for photo-to-pin transformation
   - Use `useCallback` for event handlers
2. Debounce viewport changes (already in `useMapPhotos`)
3. Lazy load thumbnails:
   - Use `loading="lazy"` on `<img>` tags
4. Optimize map rendering:
   - Reduce re-renders with `React.memo`
   - Use Mapbox clustering efficiently

### Step 14: Error Monitoring Setup

1. Integrate Sentry:
   - Add Sentry SDK to project
   - Wrap MapSection in ErrorBoundary
   - Log API errors and map errors to Sentry
2. Add custom error tracking:
   - Track failed API calls
   - Track map initialization errors
   - Track geolocation errors

### Step 15: Documentation and Review

1. Add JSDoc comments to all components and hooks
2. Update `.ai/api-plan.md` with any frontend-specific notes
3. Create README for map components directory
4. Code review and refactoring
5. Update project task list

### Step 16: Deployment and Monitoring

1. Test on staging environment
2. Verify Mapbox token works in production
3. Check performance metrics (load time, API response time)
4. Monitor error rates in Sentry
5. Deploy to production

---

## Notes for Implementation

- **Mapbox Clustering**: Use Mapbox's built-in clustering feature for performance. Configure cluster radius and max zoom for optimal UX.
- **Debouncing**: Critical for viewport changes to avoid excessive API calls. Use 500ms delay.
- **Mobile UX**: Bottom sheet should be draggable and snap to expanded/collapsed states. Consider using a library like `react-spring` for smooth animations.
- **A11y**: Invisible DOM markers for pins are essential for screen reader users. Map canvas is not accessible by default.
- **Performance**: With 200 photos, rendering can be slow on low-end devices. Use memoization and lazy loading aggressively.
- **Error Recovery**: Always keep previous photos visible when errors occur. Users should never see a blank map unless it's the initial load.
- **Testing Strategy**: Focus on custom hooks first, then components. Integration tests are valuable for catching sync issues between map and thumbnails.
