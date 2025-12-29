# View Implementation Plan – Photo Upload

## 1. Overview
The Photo Upload view allows authenticated users to add a new photo together with descriptive metadata and an approximate public location. The flow is implemented as a multi-step wizard (`UploadWizard`) which can be opened either as a dedicated page (`/upload`) or as a modal triggered from anywhere via `UploadPhotoButton`. The wizard guides the user through selecting a file, entering descriptive information, picking (and optionally blurring) the location, and finally confirming the upload. When finished, the wizard sends a `POST /api/photos` request and, on success, closes and notifies the rest of the UI that a new photo is available.

## 2. View Routing
* **Path**: `/upload` – full-screen page version (SSR + CSR)
* **Modal**: The same wizard can be rendered in a modal from `UploadPhotoButton` using React Portal (`/src/components/map/UploadPhotoButton.tsx` already exists as trigger).
* Guarded by `auth` middleware – redirect unauthenticated users to `/login`.

## 3. Component Structure
```
<UploadWizard>
 ├── <StepIndicator />          // horizontal step header
 ├── <WizardBody>
 │    ├── Step 1: <Dropzone />
 │    ├── Step 2: <MetadataForm />
 │    ├── Step 3: <MapPicker>
 │    │              └── <BlurSlider />
 │    └── Step 4: <ReviewSummary />
 └── <WizardFooter />           // Back / Next / Submit buttons
```
Each step is rendered conditionally inside `UploadWizard` based on the current step index maintained in internal state.

## 4. Component Details
### 4.1 `UploadWizard`
* **Description**: High-level controller managing step flow, global wizard state, validation between steps and final submission.
* **Main elements**: `StepIndicator`, `WizardBody`, `WizardFooter`.
* **Handled interactions**:
  - `next()` – advance to next step after validation
  - `back()` – go to previous step
  - `submit()` – build `FormData` & call `createPhoto()` hook
  - `close()` – cancel & reset wizard
* **Handled validation** (delegates to child components):
  - Step 1: file selected and passes size/type constraints
  - Step 2: required fields filled and max lengths respected
  - Step 3: latitude/longitude valid, blur radius within 100-500 if enabled
* **Types**: `UploadWizardState`, `UploadStep` enum
* **Props**: `mode: 'page' | 'modal'`, optional `onSuccess(photo: CreatePhotoResponse['photo'])`

### 4.2 `StepIndicator`
* Displays numbered steps with current progress.
* No external props beyond `currentStep`, `totalSteps`.

### 4.3 `Dropzone`
* **Purpose**: File selection with drag-&-drop and click-to-browse.
* **Elements**: `<input type="file" multiple={false}>`, preview thumbnail, EXIF quick view.
* **Events**: `onFileAccepted(file)`, `onValidationError(error)`.
* **Validation**:
  - MIME type in `FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES`
  - file size ≤ `MAX_SIZE_BYTES`
  - reject more than one file
* **Types**: `FileWithPreview`, `ValidationError`
* **Props**: `(initialFile?)`, callbacks above.

### 4.4 `MetadataForm`
* **Purpose**: Collect textual & categorical fields (title, description, category, season, time_of_day, tags, gear).
* **Elements**: shadcn/ui `Input`, `Textarea`, custom `TagsInput`, `Select` dropdowns.
* **Events**: `onChange(partialState)`, local `onValidation`.
* **Validation**:
  - `title` required, ≤ 200 chars
  - `category` required, enum value
  - `tags.length ≤ 10`, each tag length ≤ 30
  - optional fields length limits (`FIELD_CONSTRAINTS`)
* **Types**: `MetadataState`
* **Props**: `value`, `onChange`, `errors`.

### 4.5 `MapPicker`
* **Purpose**: Choose exact location on mini map (Mapbox GL instance) – user sets marker by click or search.
* **Elements**: Map canvas, search box (re-use `LocationSearch` service), marker.
* **Events**: `onLocationChange(lat, lon)`.
* **Validation**: verify coordinates within valid ranges (helper `isValidCoordinates`).
* **Props**: `value`, `onChange`.

### 4.6 `BlurSlider`
* **Purpose**: Enable/disable blur and choose radius (100-500 m).
* **Elements**: toggle switch, slider component, live radius label.
* **Events**: `onBlurToggle(enabled)`, `onRadiusChange(radius)`.
* **Validation**: radius inside `LOCATION_BLUR` range when blur enabled.
* **Props**: `enabled`, `radius`, `onChange`.

### 4.7 `ReviewSummary`
* **Purpose**: Final read-only preview of all collected data + legal note.
* **Elements**: image preview, metadata list, map snapshot (static image URL from Mapbox Static API).
* **Events**: none except final `Submit` handled by parent.

## 5. Types
### 5.1 Wizard Types
```ts
export enum UploadStep {
  File = 0,
  Metadata = 1,
  Location = 2,
  Review = 3,
}

export interface UploadWizardState {
  step: UploadStep;
  file: File | null;
  metadata: MetadataState;
  location: {
    latitude: number | null;
    longitude: number | null;
    blur_location: boolean;
    blur_radius: number; // default 200
  };
  errors: Partial<Record<'file' | 'metadata' | 'location', string>>;
  isSubmitting: boolean;
}

export interface FileWithPreview {
  file: File;
  previewUrl: string; // object URL
  exif?: ExifData;
}

export interface MetadataState {
  title: string;
  description: string;
  category: PhotoCategory | '';
  season: Season | '';
  time_of_day: TimeOfDay | '';
  tags: string[];
  gear: GearInfo;
}
```
Other DTOs come from existing `types.ts` (`CreatePhotoCommand`, `CreatePhotoResponse`).

## 6. State Management
* **useUploadWizard** (custom hook in `/src/components/upload/useUploadWizard.ts`)
  - Holds `UploadWizardState`
  - Provides `setFile`, `updateMetadata`, `updateLocation`, `next`, `back`, `submit`
  - Performs per-step validation using zod schemas (Tree-shaken by Astro)
  - On `submit`, converts wizard state into `FormData` matching `CreatePhotoCommand` and triggers `useCreatePhoto` mutation.
* **useCreatePhoto** (existing or new) – wrapper around `photosService.createPhoto(formData)` with `useMutation` from `@tanstack/react-query` (already installed for other services).
* Global context not required; wizard state lives inside component/hook.

## 7. API Integration
* **Endpoint**: `POST /api/photos` (multipart/form-data)
* **Request Type**: `CreatePhotoCommand` → send as `FormData` where:
  - `file` – binary (append directly)
  - primitive fields as strings
  - `tags` – send multiple `tags[]` values OR JSON string (to match backend spec)
  - `gear` – JSON.stringify(gear)
* **Response Type**: `CreatePhotoResponse`
* **Handling**:
  - On success (201) – close wizard, toast “Photo uploaded successfully”, invalidate `photos` query on map.
  - On `400|413|429|422` – display error banner within wizard and allow retry.

## 8. User Interactions
1. Drag image onto dropzone → preview appears, EXIF auto-parsed.
2. Click “Next” without choosing image → dropzone shakes, error shown.
3. Fill metadata form – inline validation; “Next” disabled until valid.
4. Pick location on map; enable blur and adjust radius via slider (value label live-updates).
5. Click “Submit” on review screen → loading spinner in footer, then toast & redirect.
6. Cancel at any time → confirmation dialog to discard changes.

## 9. Conditions and Validation
* **File**:
  - Size ≤ 10 MB → else show "File too large (max 10 MB)".
  - Type JPEG/PNG → else "Unsupported format".
* **Metadata**:
  - Title required, ≤ 200 chars.
  - Category required.
  - Tags ≤ 10, each ≤ 30 chars.
* **Location**:
  - lat ∈ [-90, 90], lon ∈ [-180, 180].
  - If blur enabled → radius ∈ 100-500 m.
* Validation implemented with `zod` schemas per step; error messages surfaced inline.

## 10. Error Handling
| Scenario | Handling |
| --- | --- |
| 401 Unauthorized | Global `authRedirect` middleware already handles – wizard not shown |
| 400 Bad Request (invalid fields) | Show field-level messages parsed from backend `details` |
| 413 Payload Too Large | Show banner "File exceeds 10 MB" and return to Step 1 |
| 429 Too Many Requests | Toast + banner: "Daily limit reached (5 photos/24 h)"; disable submit |
| 422 Invalid coordinates | Highlight MapPicker with error border |
| Network / unknown error | Generic banner with retry option |

## 11. Implementation Steps
1. **Scaffold route**: Create `src/pages/upload.astro` importing `<UploadWizard mode="page" />` and protect with auth middleware.
2. **Create directory** `src/components/upload/` and add `UploadWizard.tsx` plus sub-components.
3. **Implement types** above in `src/types/upload.ts` and export.
4. **Create zod schemas** (`fileSchema`, `metadataSchema`, `locationSchema`).
5. **Implement `useUploadWizard` hook`** managing state and validation.
6. **Implement `Dropzone`** using `react-dropzone`, integrate file size/type checks and preview.
7. **Implement `MetadataForm`** with shadcn/ui inputs and real-time validation.
8. **Implement `MapPicker`** reusing existing `MapGL` util; allow marker placement and search using location service.
9. **Implement `BlurSlider`** with shadcn/ui `Switch` + `Slider` components.
10. **Implement `ReviewSummary`** assembling read-only card.
11. **Wire components inside `UploadWizard`** with navigation footer.
12. **Add `useCreatePhoto` mutation** in `src/lib/services/photos.ts` (if not present) and integrate.
13. **Add toast notifications** using existing `useToast` util.
14. **Update `UploadPhotoButton`** to open wizard in modal (`mode='modal'`).
15. **Write unit tests** (Vitest + React Testing Library) for each wizard step validation edge cases.
16. **Run linter & fix issues**, ensure type-safety with strict TS.
17. **Update docs**: add link in README MAP_VIEW progress.

