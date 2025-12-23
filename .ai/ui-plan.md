# UI Architecture for PhotoSpot

## 1. UI Structure Overview

PhotoSpot is a map-centric web application. A persistent Map view acts as the canvas for every major user flow; all other information is layered on top through URL-addressable modal dialogs so the map never unmounts. The architecture is a hybrid Astro + React client:

• Astro delivers server-rendered shells for fast initial paint.
• React 19 manages interactive regions (map, modals, wizards) and state via TanStack Query.
• A single global `ModalProvider` portal guarantees one modal layer at any time and syncs its content with route changes (`/photo/:id`, `/user/:id`, etc.).
• Responsive design swaps desktop thumbnail strips for a mobile bottom-sheet carousel while keeping component contracts identical.
• Navigation relies on the browser history API; dialogs have dedicated URLs for shareability and reload resilience.

## 2. View List

### 2.1 Landing / Login
- **Path**: `/` *(redirects to `/map` if authenticated & onboarded)*
- **Purpose**: Brand entry point, account gateway.
- **Key info**: Hero copy, login form (email / password), CTA links to Register & PRD docs.
- **Components**: `NavbarPublic`, `LoginForm`, `Footer`.
- **UX / A11y / Security**:
  - Inline validation & error codes (`UNAUTHORIZED`, `VALIDATION_ERROR`).
  - Password manager-friendly form fields.
  - Rate-limit error banner if 429.

### 2.2 Register
- **Path**: `/register`
- **Purpose**: Account creation and role selection.
- **Key info**: Email, password, role radio buttons.
- **Components**: `RegisterForm`, `RoleSelector`.
- **Considerations**: Password rules tooltip; 409 conflict messaging.

### 2.3 Reset Password
- **Path**: `/reset-password`
- **Purpose**: Supabase password reset flow wrapper.
- **Components**: `PasswordResetRequestForm`, `PasswordResetConfirmForm`.

### 2.4 Onboarding Wizard
- **Path**: `/onboarding`
- **Purpose**: Gate access until user sets role, default location, completes tutorial.
- **Steps & Components**:
  1. **RoleStep** – confirm / change role.
  2. **LocationStep** – Map picker or geolocation prompt.
  3. **TutorialStep** – interactive hints overlay.
- **Security**: Wizard requires auth; sets `onboarding_complete` flag via `/api/users/:id/profile` PATCH.

### 2.5 Map View (Home)
- **Path**: `/map` *(also `/`, default route for onboarded users)*
- **Purpose**: Discover photos via interactive map & thumbnail rail.
- **Key info**: Map tiles, clustered pins, horizontal thumbnails (desktop) or bottom sheet (mobile), filter panel, upload/favorites controls.
- **Components**:
  - `MainLayout` (Astro) with `NavbarAuth` & `MapSection`.
  - `MapGL` (Mapbox wrapper) + `PinClusterLayer`.
  - `ThumbnailStrip` / `BottomSheetCarousel`.
  - `FilterPanel` (category, season, time of day, photographer-only).
  - `UploadPhotoButton` (guarded by `usePermissions`).
- **A11y / UX**: Keyboard pin focus via invisible DOM markers; live-region updates when thumbnails refresh.

### 2.6 Photo Dialog (Modal Route)
- **Path**: `/photo/:photoId`
- **Purpose**: Detailed photo view without leaving the map.
- **Key info**: Image (thumb→blur-up→full), title, author card, tags, metadata, Prev/Next nav, favorite toggle, report button (if not owner), edit/delete (if owner), status badge (owner/moderator).
- **Components**: `DialogShell`, `PhotoHero`, `AuthorLink`, `PhotoMeta`, `TagList`, `PrevNextBar`, `ActionButtons`.
- **Data Sources**: `/api/photos/:id` (+ cached `/api/photos` list for Prev/Next), pre-fetch author profile when visible.
- **Error States**: Inline retry block for 404 / 500.

### 2.7 Author Dialog (Modal Route)
- **Path**: `/user/:userId`
- **Purpose**: View author profile & sample gallery.
- **Key info**: Avatar, display name, bio, contact (photographers), “More from …” grid (12 photos, cached).
- **Components**: `DialogShell`, `AuthorHeader`, `AuthorDetails`, `AuthorPhotoGrid`.
- **Edge Cases**: Enthusiast role → hide contact section; 404 user → generic not-found state.

### 2.8 Photo Upload Flow
- **Path**: `/upload` *(or inline modal triggered by button)*
- **Purpose**: Add new photo.
- **Key info**: Dropzone, metadata form, EXIF preview, location picker / blur slider.
- **Components**: `UploadWizard` (multistep), `Dropzone`, `MapPicker`, `BlurSlider`, `MetadataForm`.
- **Validation**: Local file checks + server errors (413, 429).

### 2.9 Favorites List
- **Path**: `/favorites`
- **Purpose**: Personal list of favorited photos.
- **Key info**: Paginated grid, remove toggle.
- **Components**: `FavoritesGrid`, `EmptyState`.

### 2.10 Moderator Panel *(MVP-optional)*
- **Path**: `/admin/moderation`
- **Purpose**: Review pending photos & reports.
- **Components**: `ModerationQueue`, `ReportTable`, `StatusUpdater`.
- **Permissions**: Rendered only if `usePermissions().isModerator`.

## 3. User Journey Map

1. **First-time visitor** opens `/` → sees Landing.
2. Clicks **Register**, completes form → Supabase signup.
3. Redirect to **Onboarding Wizard**.
   1. Select role → Next.
   2. Set default location → Next.
   3. Tutorial hints → Finish.
4. Enters **Map View**; pins load for current viewport.
5. Clicks a **pin/thumbnail** → URL changes to `/photo/:id`, Photo Dialog opens.
6. In dialog, taps **Author name** → Photo Dialog replaced by Author Dialog (`/user/:id`).
7. From Author grid, selects another image → same modal route updates (`/photo/:id`).
8. Uses **Prev/Next** buttons to browse nearby photos without leaving modal.
9. Hits **Favorite** → optimistic UI, POST to `/api/users/:id/favorites`.
10. Dismisses modal → returns to full Map view (URL `/map`).
11. Later selects **Upload Photo** → Upload flow; on success, Photo Dialog opens for the new image.

## 4. Layout and Navigation Structure

```
MainLayout (Astro)
 ├── Navbar (public/auth)
 ├── <Outlet />       ← React Router renders Map, Auth pages, etc.
 ├── ModalProvider    ← Portal root (React context)
 └── Footer (public pages)
```

• React Router (hashless) manages page routes; modal routes render inside `ModalProvider` while keeping background routes mounted.
• Navigation mechanisms:
  - **Navbar links**: Home (/map), Favorites, Upload, Logout.
  - **FilterPanel** slides from left on mobile (Hamburger).
  - **Browser back/forward** closes / reopens dialogs seamlessly.

## 5. Key Components

| Component | Purpose | Cross-View Usage |
|-----------|---------|------------------|
| `ModalProvider` | Global portal & route sync, single-layer modal management | All dialogs |
| `MapGL` | Mapbox GL wrapper with Supabase spatial queries | Map View, Onboarding LocationStep |
| `ThumbnailStrip` / `BottomSheetCarousel` | Viewport photo previews | Map View |
| `FilterPanel` | Photo filters, persistent query params | Map View |
| `PhotoCard` | Consistent photo tile (thumb, title, author) | Thumbnails, Favorites, AuthorGrid |
| `AuthorCard` | Compact profile summary | Photo Dialog, Author Dialog |
| `UploadWizard` | Multistep upload with validation | Upload flow |
| `usePermissions` | Hook returning role/ownership booleans | Buttons, conditional UI |
| `ErrorBanner` | Standardized inline error with retry | Dialogs, Upload |
| `Skeleton` components | Loading placeholders | All data-fetching regions |

---

All user stories from the PRD have been mapped: US-001-003 handled in Auth & Password views; US-004-008, US-010-012 fulfilled by Map, Photo, Upload, and Favorites flows; US-009 implemented via blur slider; US-013 by Author Dialog; US-014 via Report button & Moderator Panel; US-015 via Location search in Map; US-016 Onboarding wizard; US-017 by session handling & `usePermissions`. Error and edge states respect API error schema and rate-limit codes.

