# View Implementation Plan: Photo Upload Flow

## 1. Overview

The Photo Upload view enables authenticated users to upload new photos to PhotoSpot. The view implements a multi-step wizard interface that guides users through file selection, metadata entry, and location configuration. It supports file validation (JPG/PNG ≤ 10MB), automatic EXIF extraction, location selection via interactive map, and optional location blurring (100-500m radius). The view enforces business rules including the 5 photos per 24 hours rate limit and validates all required fields before submission.

## 2. View Routing

**Primary Path**: `/upload`

**Alternative**: Inline modal triggered by `UploadPhotoButton` (from map view)

**Authentication**: Required - Unauthenticated users should be redirected to `/login` with return URL parameter

**Access Control**: Available to both photographer and enthusiast roles

## 3. Component Structure

```
UploadPage (Astro page)
└── UploadWizard (React - client:load)
    ├── UploadProgress (progress indicator)
    ├── Step 1: FileUploadStep
    │   ├── Dropzone
    │   ├── FilePreview
    │   └── ExifPreview
    ├── Step 2: MetadataStep
    │   ├── MetadataForm
    │   │   ├── Input (title)
    │   │   ├── Textarea (description)
    │   │   ├── CategorySelect
    │   │   ├── SeasonSelect (optional)
    │   │   ├── TimeOfDaySelect (optional)
    │   │   ├── TagsInput
    │   │   └── GearForm (optional)
    │   └── ValidationErrors
    └── Step 3: LocationStep
        ├── MapPicker
        ├── LocationCoordinatesDisplay
        ├── BlurLocationToggle
        ├── BlurSlider (conditional)
        └── SubmitButton

ErrorBanner (shared component for upload errors)
```

## 4. Component Details

### 4.1 UploadWizard

**Purpose**: Main container component orchestrating the multi-step photo upload workflow. Manages overall state, navigation between steps, form validation, and API submission.

**Main Elements**:

- Header with current step indicator (1/3, 2/3, 3/3)
- Dynamic step content container
- Navigation buttons (Back, Next/Continue, Submit)
- Error banner for global errors (rate limit, server errors)
- Loading overlay during submission

**Child Components**: `UploadProgress`, `FileUploadStep`, `MetadataStep`, `LocationStep`, `ErrorBanner`

**Handled Events**:

- `onStepChange`: Navigate between wizard steps
- `onFileSelect`: Handle file selection from child components
- `onFormChange`: Update form data from metadata inputs
- `onLocationChange`: Update location coordinates
- `onSubmit`: Validate and submit complete form to API
- `onCancel`: Close wizard/navigate away with confirmation if data entered

**Validation Conditions**:

- **Step 1 → Step 2**: File must be selected, valid type (JPG/PNG), size ≤ 10MB
- **Step 2 → Step 3**: Title required (1-200 chars), category required and valid enum, description ≤ 1000 chars if provided, tags ≤ 10 items and each ≤ 30 chars, gear JSON valid if provided
- **Step 3 → Submit**: Latitude -90 to 90, longitude -180 to 180, if blur_location is true then blur_radius must be 100-500

**Types**:

- Props: `UploadWizardProps`
- State: `UploadFormState`
- Enums: `UploadStep`

**Props**:

```typescript
interface UploadWizardProps {
  isModal?: boolean; // If true, renders as modal overlay
  onClose?: () => void; // Callback when upload complete or cancelled
  initialLocation?: { lat: number; lng: number }; // Pre-populate location from map
}
```

---

### 4.2 UploadProgress

**Purpose**: Visual indicator showing current step in the upload wizard with step labels.

**Main Elements**:

- Horizontal step indicator with three circles (Step 1, 2, 3)
- Progress bar connecting steps
- Step labels: "Upload File", "Add Details", "Set Location"
- Visual state: completed (checkmark), current (highlighted), upcoming (gray)

**Child Components**: None

**Handled Events**: None (presentational component)

**Validation Conditions**: N/A

**Types**:

- Props: `UploadProgressProps`

**Props**:

```typescript
interface UploadProgressProps {
  currentStep: UploadStep;
  completedSteps: UploadStep[];
}
```

---

### 4.3 FileUploadStep

**Purpose**: First step of wizard - handles file selection, preview, and EXIF extraction.

**Main Elements**:

- File selection area (Dropzone)
- File preview (thumbnail)
- EXIF data preview panel
- File info display (name, size, type)
- Error messages for invalid files

**Child Components**: `Dropzone`, `FilePreview`, `ExifPreview`

**Handled Events**:

- `onFileSelect`: Triggered when user selects/drops a file
- `onFileRemove`: Remove selected file and reset state
- `onExifExtracted`: Callback when EXIF data is successfully parsed

**Validation Conditions**:

- File type must be `image/jpeg` or `image/png` (validate MIME type and file extension)
- File size must be ≤ 10,485,760 bytes (10 MB)
- File must be readable (not corrupted)

**Types**:

- Props: `FileUploadStepProps`
- Local State: `FileState`

**Props**:

```typescript
interface FileUploadStepProps {
  selectedFile: File | null;
  filePreviewUrl: string | null;
  exifData: ExifPreviewData | null;
  error: string | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onExifExtracted: (exif: ExifPreviewData) => void;
}
```

---

### 4.4 Dropzone

**Purpose**: Interactive drag-and-drop zone for file selection with click-to-browse fallback.

**Main Elements**:

- Dashed border drop area
- Upload icon
- Primary text: "Drag and drop your photo here"
- Secondary text: "or click to browse"
- Format and size constraints display: "JPG or PNG, max 10MB"
- Visual feedback on drag over (border highlight)

**Child Components**: None (uses shadcn/ui primitives)

**Handled Events**:

- `onDrop`: Handle file drop
- `onChange`: Handle file input change (click-to-browse)
- `onDragOver`: Visual feedback during drag
- `onDragLeave`: Remove visual feedback

**Validation Conditions**:

- Accept only `.jpg`, `.jpeg`, `.png` file extensions
- Validate file size before accepting
- Reject multiple files (only single upload supported)
- Validate MIME type matches extension

**Types**:

- Props: `DropzoneProps`

**Props**:

```typescript
interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept: string; // ".jpg,.jpeg,.png"
  maxSize: number; // 10485760
  disabled?: boolean;
  error?: string | null;
}
```

---

### 4.5 FilePreview

**Purpose**: Display thumbnail preview of selected image file.

**Main Elements**:

- Image thumbnail (max 300x300px, maintain aspect ratio)
- File name
- File size (formatted: "2.5 MB")
- Remove button (X icon)

**Child Components**: None

**Handled Events**:

- `onRemove`: Remove selected file

**Validation Conditions**: N/A

**Types**:

- Props: `FilePreviewProps`

**Props**:

```typescript
interface FilePreviewProps {
  file: File;
  previewUrl: string;
  onRemove: () => void;
}
```

---

### 4.6 ExifPreview

**Purpose**: Display extracted EXIF metadata from uploaded photo in a readable format.

**Main Elements**:

- Collapsible section header: "Photo Information (EXIF)"
- Grid layout displaying key-value pairs:
  - Camera make/model
  - Lens
  - Aperture (f-stop)
  - Shutter speed
  - ISO
  - Focal length
  - Date taken
  - GPS coordinates (if available) with "Use for location" button
- Empty state: "No EXIF data found" if extraction fails or no data present

**Child Components**: None

**Handled Events**:

- `onUseGpsLocation`: When user clicks "Use for location" button, populate coordinates for Step 3

**Validation Conditions**: N/A (display only)

**Types**:

- Props: `ExifPreviewProps`
- Data: `ExifPreviewData` (extends `ExifData` from types.ts)

**Props**:

```typescript
interface ExifPreviewProps {
  exifData: ExifPreviewData | null;
  onUseGpsLocation?: (lat: number, lon: number) => void;
}
```

---

### 4.7 MetadataStep

**Purpose**: Second step of wizard - collects photo metadata including title, description, category, tags, and gear information.

**Main Elements**:

- Form container with responsive layout
- Required field indicators (asterisk)
- Real-time character counters for text fields
- Validation error messages below each field
- Optional field labels clearly marked

**Child Components**: `MetadataForm`, `ValidationErrors`

**Handled Events**:

- `onFormChange`: Update form data on input changes
- `onValidate`: Validate all fields before proceeding to next step

**Validation Conditions**:

- Title: required, 1-200 characters, non-empty after trim
- Description: optional, max 1000 characters
- Category: required, must be valid `PhotoCategory` enum value
- Season: optional, must be valid `Season` enum value if provided
- Time of day: optional, must be valid `TimeOfDay` enum value if provided
- Tags: optional, max 10 tags, each tag max 30 characters, lowercase trimmed, no duplicates
- Gear: optional, valid JSON structure matching `GearInfo` type

**Types**:

- Props: `MetadataStepProps`
- Local State: `MetadataFormData`

**Props**:

```typescript
interface MetadataStepProps {
  formData: MetadataFormData;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
  onValidate: () => boolean;
}
```

---

### 4.8 MetadataForm

**Purpose**: Form component containing all metadata input fields.

**Main Elements**:

- **Title Input**: Text input with character counter (200 max), required indicator
- **Description Textarea**: Multi-line textarea with character counter (1000 max)
- **Category Select**: Dropdown with photo categories (landscape, portrait, street, etc.)
- **Season Select**: Optional dropdown (spring, summer, autumn, winter)
- **Time of Day Select**: Optional dropdown (golden_hour_morning, morning, midday, etc.)
- **Tags Input**: Multi-value input with tag pills, add/remove functionality, max 10 tags
- **Gear Form**: Collapsible section with camera and lens text inputs

**Child Components**: shadcn/ui form components (`Input`, `Textarea`, `Select`, `Label`)

**Handled Events**:

- `onChange`: Individual field change handlers
- `onTagAdd`: Add new tag to array
- `onTagRemove`: Remove tag from array
- `onBlur`: Trigger field-level validation

**Validation Conditions**: (Same as MetadataStep - enforced at form level)

**Types**:

- Props: `MetadataFormProps`

**Props**:

```typescript
interface MetadataFormProps {
  title: string;
  description: string;
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  tags: string[];
  gear: GearInfo | null;
  errors: Record<string, string>;
  onChange: (field: string, value: any) => void;
}
```

---

### 4.9 LocationStep

**Purpose**: Third and final step - allows users to set/verify photo location and optionally blur it.

**Main Elements**:

- Interactive map (MapPicker)
- Coordinate display (latitude/longitude)
- Location source indicator (EXIF, Manual, Current Location)
- Blur location toggle checkbox
- Conditional blur radius slider (100-500m)
- Visual preview of blur radius on map (circle overlay)
- Submit button
- Final validation errors

**Child Components**: `MapPicker`, `LocationCoordinatesDisplay`, `BlurLocationToggle`, `BlurSlider`

**Handled Events**:

- `onLocationChange`: Update coordinates when user clicks on map
- `onBlurToggle`: Enable/disable location blurring
- `onBlurRadiusChange`: Adjust blur radius via slider
- `onUseCurrentLocation`: Get user's browser geolocation
- `onSubmit`: Final form submission

**Validation Conditions**:

- Latitude: required, must be -90 to 90
- Longitude: required, must be -180 to 180
- Blur radius: if blur_location is true, must be 100-500 (defaults to 200)
- At least one coordinate source must be set (EXIF, manual, or current location)

**Types**:

- Props: `LocationStepProps`
- Local State: `LocationState`

**Props**:

```typescript
interface LocationStepProps {
  latitude: number | null;
  longitude: number | null;
  blurLocation: boolean;
  blurRadius: number;
  onLocationChange: (lat: number, lng: number) => void;
  onBlurToggle: (enabled: boolean) => void;
  onBlurRadiusChange: (radius: number) => void;
  onUseCurrentLocation: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}
```

---

### 4.10 MapPicker

**Purpose**: Interactive Mapbox map for selecting or verifying photo location with blur radius visualization.

**Main Elements**:

- Mapbox GL map instance
- Draggable marker for location pin
- Optional blur radius circle (semi-transparent overlay)
- Zoom controls
- "Use Current Location" button
- Coordinate display tooltip on marker

**Child Components**: Uses `mapbox-gl` library

**Handled Events**:

- `onClick`: Set location by clicking on map
- `onMarkerDrag`: Update location by dragging marker
- `onZoomChange`: Maintain zoom level state

**Validation Conditions**: N/A (parent validates coordinates)

**Types**:

- Props: `MapPickerProps`

**Props**:

```typescript
interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  blurRadius?: number; // If provided, show blur circle
  onChange: (lat: number, lng: number) => void;
  height?: string; // Default "400px"
}
```

---

### 4.11 BlurSlider

**Purpose**: Slider control for adjusting location blur radius (100-500 meters).

**Main Elements**:

- Range slider input (100-500)
- Current value display with unit (e.g., "250 m")
- Min/max labels
- Info tooltip explaining blur purpose
- Visual ticks at 100m intervals

**Child Components**: shadcn/ui `Slider` component

**Handled Events**:

- `onChange`: Update blur radius value
- `onChangeCommitted`: Final value when user releases slider

**Validation Conditions**:

- Value must be between 100 and 500 (inclusive)
- Value is always an integer

**Types**:

- Props: `BlurSliderProps`

**Props**:

```typescript
interface BlurSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number; // Default 100
  max?: number; // Default 500
  step?: number; // Default 50
}
```

---

### 4.12 TagsInput

**Purpose**: Multi-value input component for adding and managing photo tags.

**Main Elements**:

- Text input field for new tag entry
- Tag pills displaying added tags with remove buttons
- Tag counter (e.g., "3/10 tags")
- Add button (or Enter key submission)
- Validation feedback (duplicate, max count, max length)

**Child Components**: Tag pill badges (shadcn/ui `Badge`)

**Handled Events**:

- `onTagAdd`: Add new tag (Enter key or button click)
- `onTagRemove`: Remove tag by clicking X on pill
- `onChange`: Update input value
- `onBlur`: Validate input on blur

**Validation Conditions**:

- Maximum 10 tags per photo
- Each tag max 30 characters
- Tags are automatically lowercased and trimmed
- No duplicate tags allowed
- No empty tags

**Types**:

- Props: `TagsInputProps`

**Props**:

```typescript
interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number; // Default 10
  maxLength?: number; // Default 30
  error?: string | null;
}
```

---

### 4.13 ValidationErrors

**Purpose**: Display component for showing field-level validation errors in a consistent format.

**Main Elements**:

- Alert/banner component
- Error icon
- List of error messages
- Field labels corresponding to errors

**Child Components**: shadcn/ui `Alert` component

**Handled Events**: None (presentational)

**Validation Conditions**: N/A

**Types**:

- Props: `ValidationErrorsProps`

**Props**:

```typescript
interface ValidationErrorsProps {
  errors: Record<string, string>; // field name -> error message
}
```

---

## 5. Types

### 5.1 Existing Types (from types.ts)

The following types are already defined and should be imported:

- `CreatePhotoCommand`: Request payload for photo upload
- `CreatePhotoResponse`: Success response from API
- `PhotoCategory`: Enum for photo categories
- `Season`: Enum for seasons
- `TimeOfDay`: Enum for time of day
- `GearInfo`: Camera gear information
- `ExifData`: EXIF metadata structure
- `ApiError`: Standard error response
- `FILE_UPLOAD_CONSTRAINTS`: File validation constants
- `FIELD_CONSTRAINTS`: Field length constraints
- `LOCATION_BLUR`: Blur radius constraints

### 5.2 New View Model Types

**UploadStep Enum**:

```typescript
enum UploadStep {
  FILE_UPLOAD = 1,
  METADATA = 2,
  LOCATION = 3,
}
```

**UploadFormState**:
Complete state for the upload wizard, combining all form data.

```typescript
interface UploadFormState {
  // Step 1: File
  file: File | null;
  filePreviewUrl: string | null;
  exifData: ExifPreviewData | null;

  // Step 2: Metadata
  title: string;
  description: string;
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  tags: string[];
  gear: GearInfo | null;

  // Step 3: Location
  latitude: number | null;
  longitude: number | null;
  locationSource: "exif" | "manual" | "current" | null;
  blur_location: boolean;
  blur_radius: number; // 100-500, default 200

  // Wizard state
  currentStep: UploadStep;
  completedSteps: UploadStep[];

  // Validation & errors
  errors: Record<string, string>;

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;
}
```

**ExifPreviewData**:
Extends ExifData with additional UI-friendly fields.

```typescript
interface ExifPreviewData extends ExifData {
  hasGpsData: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  formattedDate?: string;
  formattedAperture?: string;
  formattedShutterSpeed?: string;
}
```

**MetadataFormData**:
Subset of form data for metadata step.

```typescript
interface MetadataFormData {
  title: string;
  description: string;
  category: PhotoCategory | null;
  season: Season | null;
  time_of_day: TimeOfDay | null;
  tags: string[];
  gear: GearInfo | null;
}
```

**LocationState**:
Subset of form data for location step.

```typescript
interface LocationState {
  latitude: number | null;
  longitude: number | null;
  locationSource: "exif" | "manual" | "current" | null;
  blur_location: boolean;
  blur_radius: number;
}
```

**FileState**:
Internal state for file handling.

```typescript
interface FileState {
  file: File | null;
  previewUrl: string | null;
  isValidating: boolean;
  isExtracting: boolean;
  error: string | null;
}
```

**UploadProgress**:
Tracks upload progress for user feedback.

```typescript
interface UploadProgressState {
  percentage: number; // 0-100
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message?: string;
}
```

### 5.3 Validation Types

**ValidationResult**:

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

**StepValidation**:

```typescript
type StepValidation = {
  [UploadStep.FILE_UPLOAD]: (state: UploadFormState) => ValidationResult;
  [UploadStep.METADATA]: (state: UploadFormState) => ValidationResult;
  [UploadStep.LOCATION]: (state: UploadFormState) => ValidationResult;
};
```

---

## 6. State Management

### 6.1 Custom Hook: `usePhotoUpload`

A custom hook that encapsulates all upload logic, state management, and side effects.

**Purpose**: Centralize upload workflow logic, reduce component complexity, enable easier testing and reusability.

**State Variables**:

```typescript
const [formState, setFormState] = useState<UploadFormState>(initialState);
const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({ ... });
```

**Hook Interface**:

```typescript
interface UsePhotoUploadReturn {
  // State
  formState: UploadFormState;
  uploadProgress: UploadProgressState;

  // File operations
  selectFile: (file: File) => Promise<void>;
  removeFile: () => void;

  // Metadata operations
  updateMetadata: (field: keyof MetadataFormData, value: any) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;

  // Location operations
  setLocation: (lat: number, lng: number, source: "exif" | "manual" | "current") => void;
  toggleBlur: (enabled: boolean) => void;
  setBlurRadius: (radius: number) => void;
  getCurrentLocation: () => Promise<void>;

  // Navigation
  goToStep: (step: UploadStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceed: (step: UploadStep) => boolean;

  // Validation
  validateStep: (step: UploadStep) => ValidationResult;
  clearErrors: () => void;

  // Submission
  submitUpload: () => Promise<void>;
  resetForm: () => void;
}
```

**Hook Implementation Details**:

1. **File Selection Flow**:
   - Validate file type and size immediately
   - Create preview URL using `URL.createObjectURL()`
   - Extract EXIF data asynchronously using `exifr` library
   - Parse GPS coordinates if present in EXIF
   - Clean up blob URLs on component unmount

2. **Validation Strategy**:
   - Validate on blur for individual fields
   - Validate entire step before navigation
   - Show inline errors for specific fields
   - Show summary errors in banner for multiple issues
   - Disable "Next" button if current step invalid

3. **EXIF Extraction**:

   ```typescript
   async function extractExif(file: File): Promise<ExifPreviewData | null> {
     try {
       const exif = await exifr.parse(file, {
         gps: true,
         pick: ["Make", "Model", "LensModel", "FNumber", "ExposureTime", "ISO", "FocalLength", "DateTimeOriginal"],
       });

       return formatExifForDisplay(exif);
     } catch (error) {
       console.warn("EXIF extraction failed:", error);
       return null;
     }
   }
   ```

4. **Location Handling**:
   - Prioritize EXIF GPS if available (auto-populate)
   - Allow manual selection via map click
   - Support browser geolocation API
   - Track location source for analytics

5. **Form Submission Flow**:

   ```typescript
   async function submitUpload() {
     // 1. Final validation
     const validation = validateAllSteps();
     if (!validation.isValid) {
       setErrors(validation.errors);
       return;
     }

     // 2. Prepare multipart form data
     const formData = new FormData();
     formData.append("file", formState.file);
     formData.append("title", formState.title);
     formData.append("category", formState.category);
     formData.append("latitude", formState.latitude.toString());
     formData.append("longitude", formState.longitude.toString());
     // ... append all fields

     if (formState.blur_location) {
       formData.append("blur_location", "true");
       formData.append("blur_radius", formState.blur_radius.toString());
     }

     if (formState.tags.length > 0) {
       formData.append("tags", JSON.stringify(formState.tags));
     }

     if (formState.gear) {
       formData.append("gear", JSON.stringify(formState.gear));
     }

     // 3. Submit with progress tracking
     setIsSubmitting(true);
     setUploadProgress({ percentage: 0, status: "uploading" });

     try {
       const response = await fetch("/api/photos", {
         method: "POST",
         body: formData,
         // Note: Don't set Content-Type header, browser will set it with boundary
       });

       if (!response.ok) {
         const error: ApiError = await response.json();
         throw new Error(error.error.message);
       }

       const result: CreatePhotoResponse = await response.json();

       setUploadProgress({ percentage: 100, status: "success" });

       // 4. Navigate to photo detail page or back to map
       window.location.href = `/photo/${result.photo.id}`;
     } catch (error) {
       setUploadProgress({ percentage: 0, status: "error", message: error.message });
       setSubmitError(handleApiError(error));
     } finally {
       setIsSubmitting(false);
     }
   }
   ```

### 6.2 Local Component State

Individual components may maintain local UI state (e.g., dropdown open/closed, slider dragging), but all form data flows through `usePhotoUpload` hook for single source of truth.

---

## 7. API Integration

### 7.1 Endpoint

**Method**: `POST`  
**Path**: `/api/photos`  
**Content-Type**: `multipart/form-data`  
**Authentication**: Required (Supabase Auth token in cookie or Authorization header)

### 7.2 Request Construction

The request payload is built using the `FormData` API to support file uploads:

```typescript
const formData = new FormData();

// Required fields
formData.append("file", file); // File object
formData.append("title", title);
formData.append("category", category);
formData.append("latitude", latitude.toString());
formData.append("longitude", longitude.toString());

// Optional fields (only append if present)
if (description) formData.append("description", description);
if (season) formData.append("season", season);
if (time_of_day) formData.append("time_of_day", time_of_day);
if (blur_location) {
  formData.append("blur_location", "true");
  formData.append("blur_radius", blur_radius.toString());
}

// Array/Object fields (JSON serialized)
if (tags.length > 0) {
  formData.append("tags", JSON.stringify(tags));
}
if (gear) {
  formData.append("gear", JSON.stringify(gear));
}
```

**Important Notes**:

- Do NOT manually set `Content-Type` header - browser will automatically set it with proper multipart boundary
- Authentication is handled by Astro middleware (cookie-based session)

### 7.3 Response Handling

**Success Response (201 Created)**:

```typescript
interface CreatePhotoResponse {
  message: "Photo uploaded successfully";
  photo: {
    id: string;
    title: string;
    status: "pending"; // Always pending for new uploads
    file_url: string;
    created_at: string;
  };
}
```

**Action on Success**:

1. Show success message
2. Navigate to photo detail page (`/photo/${photo.id}`)
3. Or close modal and refresh map view if modal context

**Error Response Examples**:

**401 Unauthorized**:

```typescript
{
  error: {
    code: "unauthorized",
    message: "Not authenticated"
  }
}
```

Action: Redirect to `/login?returnUrl=/upload`

**400 Bad Request**:

```typescript
{
  error: {
    code: "validation_error",
    message: "Invalid input",
    details: {
      title: "Title is required",
      category: "Invalid category value"
    }
  }
}
```

Action: Display field-specific errors in form

**413 Payload Too Large**:

```typescript
{
  error: {
    code: "file_too_large",
    message: "File size exceeds 10MB limit"
  }
}
```

Action: Show error banner, keep user on Step 1 to select different file

**429 Too Many Requests**:

```typescript
{
  error: {
    code: "rate_limit_exceeded",
    message: "You have reached the limit of 5 photos per 24 hours"
  }
}
```

Action: Show error banner with countdown timer to next available upload slot

**422 Unprocessable Entity**:

```typescript
{
  error: {
    code: "invalid_data",
    message: "Invalid coordinates or EXIF data"
  }
}
```

Action: Show error banner, navigate back to Step 3 to fix location

**500 Internal Server Error**:

```typescript
{
  error: {
    code: "server_error",
    message: "Failed to process upload. Please try again later."
  }
}
```

Action: Show error banner with retry button

### 7.4 Error Mapping Function

```typescript
function handleApiError(error: any): string {
  if (error.response?.status === 401) {
    window.location.href = "/login?returnUrl=/upload";
    return "";
  }

  if (error.response?.status === 413) {
    return "File size exceeds 10MB limit. Please select a smaller file.";
  }

  if (error.response?.status === 429) {
    return "Upload limit reached (5 photos per 24 hours). Please try again later.";
  }

  if (error.response?.status === 422) {
    return "Invalid location data. Please check coordinates and try again.";
  }

  if (error.response?.data?.error) {
    return error.response.data.error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
```

---

## 8. User Interactions

### 8.1 Step 1: File Upload

**User Action**: Drag and drop photo onto dropzone OR click to open file browser

**System Response**:

1. Validate file type (JPG/PNG only)
2. Validate file size (≤ 10MB)
3. If invalid, show error message inline in dropzone
4. If valid:
   - Display file preview thumbnail
   - Show loading indicator during EXIF extraction
   - Display EXIF data panel when extraction completes
   - Enable "Next" button

**User Action**: Click "Next" button

**System Response**:

1. Validate that file is selected
2. Transition to Step 2 (Metadata)
3. Mark Step 1 as completed

**User Action**: Remove selected file (click X on preview)

**System Response**:

1. Clear file preview
2. Reset EXIF data
3. Disable "Next" button
4. Show dropzone again

---

### 8.2 Step 2: Metadata Entry

**User Action**: Type in title field

**System Response**:

1. Update character counter in real-time
2. Show error if exceeds 200 characters
3. Validate on blur: required, non-empty after trim

**User Action**: Type in description field

**System Response**:

1. Update character counter in real-time (0/1000)
2. Show error if exceeds 1000 characters
3. No validation error if empty (optional field)

**User Action**: Select category from dropdown

**System Response**:

1. Update selected value
2. Clear any previous category error
3. Enable "Next" button if all required fields valid

**User Action**: Add tag

**System Response**:

1. Validate tag: max 30 chars, no duplicates
2. Convert to lowercase and trim
3. Add tag pill to display
4. Update counter (e.g., "3/10 tags")
5. Show error if max 10 tags reached

**User Action**: Remove tag (click X on tag pill)

**System Response**:

1. Remove tag from array
2. Update counter
3. Clear max tags error if was showing

**User Action**: Toggle gear section open and enter camera/lens

**System Response**:

1. Update gear object
2. Validate JSON structure
3. No error if left empty (optional)

**User Action**: Click "Next" button

**System Response**:

1. Validate all required fields:
   - Title: required, 1-200 chars
   - Category: required, valid enum
2. If validation fails:
   - Show inline errors for each invalid field
   - Keep user on Step 2
   - Scroll to first error
3. If validation passes:
   - Transition to Step 3 (Location)
   - Mark Step 2 as completed
   - Pre-populate location from EXIF if available

**User Action**: Click "Back" button

**System Response**:

1. Save current metadata (don't lose data)
2. Return to Step 1
3. Show previously selected file

---

### 8.3 Step 3: Location Selection

**User Action**: View map with pre-populated location (from EXIF or previous manual selection)

**System Response**:

1. Display map centered on coordinates
2. Show draggable marker at location
3. Display coordinates below map
4. Show location source label (e.g., "From EXIF data")

**User Action**: Click on map to change location

**System Response**:

1. Move marker to clicked point
2. Update latitude/longitude display
3. Change location source to "Manual"
4. Clear any previous location errors

**User Action**: Drag marker to new position

**System Response**:

1. Update marker position in real-time
2. Update coordinates display
3. Change location source to "Manual"

**User Action**: Click "Use Current Location" button

**System Response**:

1. Request browser geolocation permission (if not granted)
2. Show loading indicator
3. If permission granted:
   - Get coordinates
   - Update map center and marker
   - Update coordinates display
   - Set location source to "Current Location"
4. If permission denied:
   - Show error message
   - Keep existing location

**User Action**: Toggle "Blur location" checkbox

**System Response**:

1. Enable/disable blur slider
2. If enabling blur:
   - Set default radius to 200m
   - Show blur radius slider
   - Display semi-transparent circle on map showing blur area
3. If disabling blur:
   - Hide slider
   - Remove circle from map
   - Clear blur_radius validation

**User Action**: Adjust blur radius slider

**System Response**:

1. Update radius value display (e.g., "250 m")
2. Resize blur circle on map in real-time
3. Validate range (100-500)
4. Update tooltip explaining blur effect

**User Action**: Click "Submit" button

**System Response**:

1. Validate location:
   - Latitude -90 to 90
   - Longitude -180 to 180
   - Blur radius 100-500 if blur enabled
2. If validation fails:
   - Show error banner
   - Keep user on Step 3
3. If validation passes:
   - Show loading overlay with progress bar
   - Disable all form inputs
   - Prepare and send multipart form data to API
   - Handle response (see Section 7)

**User Action**: Click "Back" button

**System Response**:

1. Save current location data
2. Return to Step 2
3. Keep location ready for when user returns to Step 3

**User Action**: Click "Cancel" button (any step)

**System Response**:

1. Show confirmation dialog: "Discard unsaved photo?"
2. If confirmed:
   - Clean up file preview URL
   - Reset form state
   - Close wizard/navigate away
3. If cancelled:
   - Stay on current step

---

## 9. Conditions and Validation

### 9.1 Step 1: File Upload Validation

**Component**: `FileUploadStep`, `Dropzone`

**Condition**: File type validation

- **Rule**: File must have MIME type `image/jpeg` or `image/png`
- **When**: On file selection (before accepting)
- **Effect**: If invalid, show error "Only JPG and PNG files are supported" and reject file
- **UI State**: Error text appears in dropzone, file is not loaded

**Condition**: File size validation

- **Rule**: File size must be ≤ 10,485,760 bytes (10 MB)
- **When**: On file selection (before accepting)
- **Effect**: If invalid, show error "File size must not exceed 10 MB" and reject file
- **UI State**: Error text appears in dropzone, file is not loaded

**Condition**: File selection required for progression

- **Rule**: At least one valid file must be selected
- **When**: When user clicks "Next" button
- **Effect**: If no file, show error "Please select a photo to upload"
- **UI State**: "Next" button remains disabled until file selected

**Condition**: File preview generation

- **Rule**: Create object URL for selected file
- **When**: After successful file validation
- **Effect**: Display thumbnail preview
- **UI State**: Preview image shown, EXIF extraction begins

### 9.2 Step 2: Metadata Validation

**Component**: `MetadataStep`, `MetadataForm`

**Condition**: Title required

- **Rule**: Title field must not be empty after trimming
- **When**: On blur and before step navigation
- **Effect**: Show error "Title is required"
- **UI State**: Red border on input, error text below field, "Next" button disabled

**Condition**: Title length

- **Rule**: Title must be between 1 and 200 characters
- **When**: On input change (real-time counter), on blur (validation)
- **Effect**: Show error "Title must not exceed 200 characters"
- **UI State**: Character counter turns red when limit exceeded, error text appears

**Condition**: Description length

- **Rule**: Description must not exceed 1000 characters (optional field)
- **When**: On input change (real-time counter)
- **Effect**: Show error "Description must not exceed 1000 characters"
- **UI State**: Character counter turns red when limit exceeded, cannot type more characters

**Condition**: Category required

- **Rule**: Category must be selected and be a valid `PhotoCategory` enum value
- **When**: On blur and before step navigation
- **Effect**: Show error "Please select a category"
- **UI State**: Red border on select, error text below field

**Condition**: Season validation (optional)

- **Rule**: If provided, must be a valid `Season` enum value
- **When**: On selection
- **Effect**: None (dropdown only shows valid options)
- **UI State**: No error possible (controlled by dropdown)

**Condition**: Time of day validation (optional)

- **Rule**: If provided, must be a valid `TimeOfDay` enum value
- **When**: On selection
- **Effect**: None (dropdown only shows valid options)
- **UI State**: No error possible (controlled by dropdown)

**Condition**: Tags maximum count

- **Rule**: Maximum 10 tags allowed
- **When**: When attempting to add 11th tag
- **Effect**: Show error "Maximum 10 tags allowed" and prevent addition
- **UI State**: Add button disabled, error text appears, tag counter shows "10/10"

**Condition**: Individual tag length

- **Rule**: Each tag must not exceed 30 characters
- **When**: When attempting to add tag
- **Effect**: Show error "Tag must not exceed 30 characters"
- **UI State**: Error text below input, tag not added

**Condition**: Duplicate tags

- **Rule**: No duplicate tags allowed (case-insensitive comparison)
- **When**: When attempting to add tag
- **Effect**: Show error "This tag already exists"
- **UI State**: Error text below input, tag not added

**Condition**: Gear JSON validation (optional)

- **Rule**: If provided, must match `GearInfo` type structure
- **When**: On blur
- **Effect**: Show error "Invalid gear information format"
- **UI State**: Red border on inputs, error text appears

### 9.3 Step 3: Location Validation

**Component**: `LocationStep`, `MapPicker`, `BlurSlider`

**Condition**: Latitude range

- **Rule**: Latitude must be between -90 and 90 (inclusive)
- **When**: On location change (map click, marker drag, current location)
- **Effect**: Show error "Invalid latitude value"
- **UI State**: Error banner appears, submit button disabled

**Condition**: Longitude range

- **Rule**: Longitude must be between -180 and 180 (inclusive)
- **When**: On location change (map click, marker drag, current location)
- **Effect**: Show error "Invalid longitude value"
- **UI State**: Error banner appears, submit button disabled

**Condition**: Location required

- **Rule**: Both latitude and longitude must be set (not null)
- **When**: On submit attempt
- **Effect**: Show error "Please select a location on the map"
- **UI State**: Error banner appears, submit button disabled

**Condition**: Blur radius range (conditional)

- **Rule**: If `blur_location` is true, `blur_radius` must be between 100 and 500 meters
- **When**: When blur is enabled and slider is moved
- **Effect**: Slider automatically constrains to valid range
- **UI State**: Slider cannot move outside 100-500 range

**Condition**: Blur radius required when blur enabled

- **Rule**: If `blur_location` is true, `blur_radius` must be provided
- **When**: On submit attempt
- **Effect**: Automatically uses default value (200) if not explicitly set
- **UI State**: No error possible (slider always has value)

### 9.4 Global Validation

**Condition**: Authentication required

- **Rule**: User must be authenticated (valid Supabase session)
- **When**: On page load, on submit
- **Effect**: Redirect to `/login?returnUrl=/upload`
- **UI State**: Upload view not accessible, redirect immediately

**Condition**: Rate limit check

- **Rule**: User can upload maximum 5 photos per 24 hours
- **When**: On form submission
- **Effect**: API returns 429 error
- **UI State**: Show error banner "Upload limit reached (5 photos per 24 hours). Please try again later."

### 9.5 Validation Summary

**Progressive Validation Strategy**:

1. **Immediate**: File type/size on selection
2. **On Blur**: Individual field validation (title, description, etc.)
3. **On Navigation**: Step-level validation before proceeding to next step
4. **On Submit**: Complete form validation + server-side validation

**Error Display Hierarchy**:

1. **Field-level errors**: Show inline below each field (red border, error text)
2. **Step-level errors**: Show in ValidationErrors component at top of step
3. **Global errors**: Show in ErrorBanner at top of wizard (rate limits, server errors)

---

## 10. Error Handling

### 10.1 Client-Side Validation Errors

**Error Type**: File validation errors

**Scenarios**:

- Wrong file type (not JPG/PNG)
- File too large (>10 MB)
- Corrupted/unreadable file

**Handling**:

- Display error message in dropzone
- Prevent file from being loaded
- Keep user on Step 1
- Allow user to select different file

**UI Feedback**:

```
⚠️ Only JPG and PNG files are supported
⚠️ File size must not exceed 10 MB
⚠️ Unable to read file. Please select a different file.
```

---

**Error Type**: Required field errors

**Scenarios**:

- Missing title
- Missing category
- Missing location coordinates

**Handling**:

- Show inline error below field
- Add red border to invalid field
- Disable "Next" or "Submit" button
- Scroll to first error on submit attempt

**UI Feedback**:

```
Title (Red border)
[_____________________]
⚠️ Title is required
```

---

**Error Type**: Field length/format errors

**Scenarios**:

- Title exceeds 200 characters
- Description exceeds 1000 characters
- Tag exceeds 30 characters
- Too many tags (>10)

**Handling**:

- Show character counter turning red
- Show error message below field
- Prevent further input (for hard limits)
- Disable progression until fixed

**UI Feedback**:

```
Description (Characters: 1050/1000)
[________________________]
⚠️ Description must not exceed 1000 characters
```

---

**Error Type**: Coordinate validation errors

**Scenarios**:

- Latitude outside -90 to 90 range
- Longitude outside -180 to 180 range
- Invalid GeoJSON structure

**Handling**:

- Show error banner at top of location step
- Highlight coordinate display in red
- Disable submit button
- Suggest using map picker instead of manual entry

**UI Feedback**:

```
⚠️ Invalid coordinates. Please use the map to select a valid location.
```

---

### 10.2 Server-Side Errors

**Error Type**: 401 Unauthorized

**Scenario**: User session expired or not authenticated

**Handling**:

- Automatically redirect to login page
- Preserve form data in sessionStorage (if possible)
- Include return URL: `/login?returnUrl=/upload`
- After login, restore form data and return to upload view

**UI Feedback**:

```
Redirecting to login...
```

---

**Error Type**: 400 Bad Request (Validation)

**Scenario**: Server-side validation fails (e.g., invalid enum value, malformed data)

**Response Example**:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input",
    "details": {
      "category": "Invalid category value",
      "tags": "Tag name contains invalid characters"
    }
  }
}
```

**Handling**:

- Parse error details object
- Map field names to corresponding form fields
- Display inline errors for each field
- Navigate to earliest step with errors
- Scroll to first error

**UI Feedback**:

```
⚠️ Please fix the following errors:
- Category: Invalid category value
- Tags: Tag name contains invalid characters
```

---

**Error Type**: 413 Payload Too Large

**Scenario**: File size exceeds 10 MB (server rejects)

**Handling**:

- Show error banner at top of wizard
- Navigate back to Step 1
- Highlight file preview with error
- Suggest compressing file or selecting smaller file
- Provide link to image compression tool

**UI Feedback**:

```
❌ File size exceeds the 10 MB limit

Your file is too large to upload. Please compress your image or select a smaller file.

[Select Different File]
```

---

**Error Type**: 429 Too Many Requests (Rate Limit)

**Scenario**: User has uploaded 5 photos in last 24 hours

**Response Example**:

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "You have reached the limit of 5 photos per 24 hours. Please try again in 3 hours."
  }
}
```

**Handling**:

- Show error banner with rate limit message
- Display countdown timer showing time until next upload slot available
- Disable submit button
- Optionally show user's recent uploads with timestamps
- Allow user to save draft (future enhancement)

**UI Feedback**:

```
⏱️ Upload Limit Reached

You have reached the limit of 5 photos per 24 hours.
Next upload available in: 2 hours 34 minutes

Your recent uploads:
- Mountain Sunrise (2 hours ago)
- Beach Sunset (5 hours ago)
- Forest Path (8 hours ago)
- City Lights (14 hours ago)
- River View (18 hours ago)

[Return to Map]
```

---

**Error Type**: 422 Unprocessable Entity

**Scenario**: Invalid EXIF data or coordinates processing failed

**Response Example**:

```json
{
  "error": {
    "code": "invalid_data",
    "message": "Failed to process location data. Please verify coordinates and try again."
  }
}
```

**Handling**:

- Show error banner
- Navigate to Step 3 (Location)
- Suggest manually selecting location on map
- Clear EXIF-derived location data
- Allow user to proceed with manual location

**UI Feedback**:

```
⚠️ Location Processing Failed

We couldn't process the location data from your photo. Please select the location manually on the map.

[Continue to Location Selection]
```

---

**Error Type**: 500 Internal Server Error

**Scenario**: Unexpected server error, storage failure, database error

**Response Example**:

```json
{
  "error": {
    "code": "server_error",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

**Handling**:

- Show error banner with generic message
- Log error details to console for debugging
- Provide retry button
- Offer option to save form data locally (future enhancement)
- Track error in Sentry/monitoring tool

**UI Feedback**:

```
❌ Upload Failed

An unexpected error occurred while uploading your photo. Please try again.

[Retry Upload]  [Save Draft]  [Cancel]
```

---

### 10.3 Network Errors

**Error Type**: Network timeout or connection failure

**Scenario**: User has poor internet connection, request times out

**Handling**:

- Detect timeout (e.g., no response after 30 seconds)
- Show error banner
- Preserve form data
- Offer retry with same data
- Suggest checking internet connection

**UI Feedback**:

```
🔌 Connection Error

Unable to reach the server. Please check your internet connection and try again.

[Retry Upload]  [Cancel]
```

---

### 10.4 Browser/Client Errors

**Error Type**: File API errors

**Scenario**: Browser doesn't support File API, file unreadable

**Handling**:

- Detect browser capability on page load
- Show warning if unsupported browser
- Fallback to standard file input if drag-and-drop unavailable
- Graceful degradation for EXIF extraction

**UI Feedback**:

```
⚠️ Limited Browser Support

Your browser doesn't support some advanced features. File upload will still work, but EXIF data extraction may not be available.

[Continue Anyway]  [Learn More]
```

---

**Error Type**: Geolocation permission denied

**Scenario**: User clicks "Use Current Location" but denies permission

**Handling**:

- Catch permission error
- Show informative message
- Provide alternative: select location on map or use EXIF
- Don't block workflow

**UI Feedback**:

```
📍 Location Access Denied

To use your current location, please grant location permissions in your browser settings.

Alternatively, you can:
- Select location manually on the map
- Use location from EXIF data (if available)

[Try Again]  [Select on Map]
```

---

**Error Type**: Local storage quota exceeded

**Scenario**: Cannot save draft or form data to localStorage

**Handling**:

- Catch quota exceeded error
- Continue without saving draft
- Warn user that data won't persist if they leave
- Suggest clearing browser data

**UI Feedback**:

```
⚠️ Unable to Save Draft

Your browser storage is full. Your upload data will be lost if you navigate away.

[Clear Browser Data]  [Continue Anyway]
```

---

### 10.5 Error Recovery Strategies

**Strategy 1: Retry with exponential backoff**

- For transient network errors
- Retry 1st attempt after 1s, 2nd after 2s, 3rd after 4s
- Max 3 retry attempts
- Show retry counter to user

**Strategy 2: Graceful degradation**

- If EXIF extraction fails, continue without EXIF data
- If current location unavailable, fallback to manual selection
- If blur visualization fails, still allow blur setting

**Strategy 3: State preservation**

- Save form data to sessionStorage on each step completion
- Restore data if user returns to page or session recovered
- Clear saved data after successful upload

**Strategy 4: User communication**

- Always explain what went wrong (avoid generic errors)
- Provide actionable next steps
- Show contact support option for persistent errors
- Log errors for developer investigation

---

## 11. Implementation Steps

### Step 1: Project Setup and Dependencies

**Tasks**:

1. Install required npm packages:

   ```bash
   npm install exifr mapbox-gl
   npm install --save-dev @types/mapbox-gl
   ```

2. Verify existing dependencies (should already be installed):
   - React 19
   - TypeScript 5
   - Tailwind CSS 4
   - shadcn/ui components

3. Add Mapbox access token to environment variables:
   ```
   PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   ```

**Deliverable**: Dependencies installed, environment configured

---

### Step 2: Type Definitions

**Tasks**:

1. Create `/src/types/upload.types.ts` file
2. Define all new types from Section 5.2:
   - `UploadStep` enum
   - `UploadFormState`
   - `ExifPreviewData`
   - `MetadataFormData`
   - `LocationState`
   - `FileState`
   - `UploadProgressState`
   - `ValidationResult`
   - `StepValidation`

3. Import and export from `/src/types.ts`:
   ```typescript
   export * from "./types/upload.types";
   ```

**Deliverable**: Complete type definitions for upload flow

---

### Step 3: Validation Utilities

**Tasks**:

1. Create `/src/lib/validators/photoUpload.ts`
2. Implement validation functions:
   - `validateFileUploadStep()`
   - `validateMetadataStep()`
   - `validateLocationStep()`
   - `validateCompleteForm()`

3. Import constraints from `types.ts`:
   - `FILE_UPLOAD_CONSTRAINTS`
   - `FIELD_CONSTRAINTS`
   - `LOCATION_BLUR`

4. Create helper functions:
   - `isValidFileType(file: File): boolean`
   - `isValidFileSize(file: File): boolean`
   - `formatFileSize(bytes: number): string`
   - `normalizeTag(tag: string): string`

**Deliverable**: Reusable validation utilities with comprehensive error messages

---

### Step 4: EXIF Extraction Utility

**Tasks**:

1. Create `/src/lib/utils/exif.ts`
2. Implement EXIF extraction function:

   ```typescript
   export async function extractExif(file: File): Promise<ExifPreviewData | null>;
   ```

3. Parse relevant EXIF fields:
   - Camera: Make + Model
   - Lens: LensModel
   - Settings: FNumber (aperture), ExposureTime (shutter), ISO, FocalLength
   - GPS: GPSLatitude, GPSLongitude
   - Date: DateTimeOriginal

4. Format data for display:
   - Aperture: "f/2.8"
   - Shutter: "1/250"
   - Focal length: "24mm"
   - Date: "Dec 15, 2025 10:30 AM"

5. Handle extraction errors gracefully (return null)

**Deliverable**: EXIF extraction utility with formatted output

---

### Step 5: Custom Hook - usePhotoUpload

**Tasks**:

1. Create `/src/components/upload/usePhotoUpload.ts`
2. Implement hook with all functionality from Section 6.1:
   - State management (useState)
   - File operations (select, remove, extract EXIF)
   - Metadata operations (update fields, manage tags)
   - Location operations (set location, toggle blur, get current location)
   - Wizard navigation (steps, validation)
   - Form submission

3. Integrate validation utilities
4. Integrate EXIF extraction utility
5. Handle API call to `/api/photos`
6. Implement error handling and recovery

**Deliverable**: Complete custom hook encapsulating all upload logic

---

### Step 6: Shared UI Components

**Tasks**:

1. Verify required shadcn/ui components are installed:
   - Button
   - Input
   - Textarea
   - Label
   - Select
   - Slider
   - Alert
   - Badge
   - Tooltip

2. If missing, install with:
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

**Deliverable**: All required shadcn/ui components available

---

### Step 7: Basic Upload Components

**Tasks**:

1. Create `/src/components/upload/` directory

2. Implement `UploadProgress.tsx` (Section 4.2):
   - Step indicator circles
   - Progress bar
   - Step labels

3. Implement `FilePreview.tsx` (Section 4.5):
   - Image thumbnail
   - File info
   - Remove button

4. Implement `ValidationErrors.tsx` (Section 4.13):
   - Error banner
   - Field-error mapping

**Deliverable**: Basic presentational components

---

### Step 8: File Upload Components

**Tasks**:

1. Implement `Dropzone.tsx` (Section 4.4):
   - Drag and drop area
   - File input
   - Visual feedback (hover, active)
   - Validation integration

2. Implement `ExifPreview.tsx` (Section 4.6):
   - Collapsible section
   - EXIF data display grid
   - "Use GPS location" button
   - Empty state

3. Implement `FileUploadStep.tsx` (Section 4.3):
   - Integrate Dropzone
   - Integrate FilePreview
   - Integrate ExifPreview
   - Connect to usePhotoUpload hook

**Deliverable**: Complete Step 1 implementation

---

### Step 9: Metadata Form Components

**Tasks**:

1. Implement `TagsInput.tsx` (Section 4.12):
   - Input field for new tags
   - Tag pills with remove buttons
   - Tag counter
   - Validation (max count, max length, duplicates)

2. Implement `MetadataForm.tsx` (Section 4.8):
   - Title input with character counter
   - Description textarea with character counter
   - Category select (dropdown with all PhotoCategory values)
   - Season select (optional)
   - Time of day select (optional)
   - TagsInput integration
   - Gear form (collapsible: camera, lens inputs)

3. Implement `MetadataStep.tsx` (Section 4.7):
   - Integrate MetadataForm
   - Integrate ValidationErrors
   - Connect to usePhotoUpload hook
   - Field-level validation on blur

**Deliverable**: Complete Step 2 implementation

---

### Step 10: Location Components

**Tasks**:

1. Implement `MapPicker.tsx` (Section 4.10):
   - Initialize Mapbox GL map
   - Display draggable marker
   - Handle map click to set location
   - Handle marker drag to update location
   - Display blur radius circle (if blur enabled)
   - Add zoom controls
   - "Use Current Location" button

2. Implement `BlurSlider.tsx` (Section 4.11):
   - Range slider (100-500, step 50)
   - Current value display with unit
   - Min/max labels
   - Info tooltip

3. Implement `LocationStep.tsx` (Section 4.9):
   - Integrate MapPicker
   - Coordinate display (lat/lng)
   - Location source indicator
   - Blur toggle checkbox
   - Conditional BlurSlider
   - Submit button
   - Connect to usePhotoUpload hook

**Deliverable**: Complete Step 3 implementation

---

### Step 11: Main Wizard Component

**Tasks**:

1. Implement `UploadWizard.tsx` (Section 4.1):
   - Initialize usePhotoUpload hook
   - Render UploadProgress
   - Conditionally render current step:
     - Step 1: FileUploadStep
     - Step 2: MetadataStep
     - Step 3: LocationStep
   - Navigation buttons (Back, Next, Submit)
   - Loading overlay during submission
   - Error banner for global errors
   - Success state and navigation

2. Handle wizard flow:
   - Validate before step progression
   - Preserve state when navigating back
   - Confirm cancel if data entered
   - Clean up on unmount (blob URLs)

3. Add modal wrapper support (if `isModal` prop true):
   - Overlay backdrop
   - Close button
   - Escape key handler

**Deliverable**: Complete wizard orchestration component

---

### Step 12: Upload Page

**Tasks**:

1. Create `/src/pages/upload.astro`

2. Implement page structure:

   ```astro
   ---
   import Layout from "@/layouts/Layout.astro";
   import UploadWizard from "@/components/upload/UploadWizard";

   // Server-side auth check
   const { user } = Astro.locals;
   if (!user) {
     return Astro.redirect("/login?returnUrl=/upload");
   }
   ---

   <Layout title="Upload Photo - PhotoSpot">
     <main class="container mx-auto py-8">
       <h1 class="text-3xl font-bold mb-6">Upload Photo</h1>
       <UploadWizard client:load />
     </main>
   </Layout>
   ```

3. Add authentication middleware check

**Deliverable**: Upload page accessible at `/upload`

---

### Step 13: Modal Integration (Optional)

**Tasks**:

1. Update `UploadPhotoButton.tsx` to support modal trigger:

   ```typescript
   const [isModalOpen, setIsModalOpen] = useState(false);

   // In render:
   {isModalOpen && (
     <UploadWizard
       isModal={true}
       onClose={() => setIsModalOpen(false)}
       initialLocation={{ lat: mapCenter.lat, lng: mapCenter.lng }}
     />
   )}
   ```

2. Pass current map center as initial location (if available)

3. Handle successful upload in modal:
   - Close modal
   - Refresh map to show new photo
   - Show success toast

**Deliverable**: Upload accessible as modal from map view

---

### Step 14: Error Handling and Recovery

**Tasks**:

1. Implement error handling utilities in usePhotoUpload:
   - API error mapping (Section 10.2)
   - Network error detection (Section 10.3)
   - Retry logic for transient errors

2. Add state preservation:
   - Save form state to sessionStorage on step completion
   - Restore state on page load (if available)
   - Clear saved state after successful upload

3. Implement rate limit UI:
   - Parse 429 error response
   - Calculate time remaining until next upload
   - Display countdown timer
   - Show recent uploads list

**Deliverable**: Robust error handling and recovery mechanisms

---

### Step 15: Styling and Responsive Design

**Tasks**:

1. Apply Tailwind CSS classes to all components
2. Ensure responsive design:
   - Mobile: Single column, stacked layout
   - Tablet: Optimize form widths
   - Desktop: Multi-column where appropriate

3. Add loading states:
   - File processing spinner
   - EXIF extraction indicator
   - Upload progress bar
   - Disabled state styling

4. Add transitions and animations:
   - Step transitions (fade/slide)
   - Button hover effects
   - Drag-and-drop visual feedback
   - Error shake animation

5. Test with shadcn/ui theming (light/dark mode if applicable)

**Deliverable**: Polished, responsive UI matching PhotoSpot design system

---

### Step 16: Testing

**Tasks**:

1. **Unit Tests** (Vitest):
   - Validation utilities (`photoUpload.ts`)
   - EXIF extraction (`exif.ts`)
   - usePhotoUpload hook (mock API calls)
   - Individual components (validation logic)

2. **Integration Tests**:
   - Complete wizard flow (Step 1 → 2 → 3 → Submit)
   - Error scenarios (validation failures, API errors)
   - File upload with various file types/sizes
   - Location selection and blur functionality

3. **Manual Testing**:
   - Test on different browsers (Chrome, Firefox, Safari)
   - Test on mobile devices
   - Test with slow network (throttling)
   - Test edge cases (huge files, missing EXIF, etc.)

**Deliverable**: Comprehensive test coverage and manual test results

---

### Step 17: Documentation and Code Cleanup

**Tasks**:

1. Add JSDoc comments to all exported functions and components
2. Create component usage examples in comments
3. Update project README with upload flow documentation
4. Document any gotchas or known limitations
5. Remove any console.logs or debug code
6. Ensure consistent code formatting (Prettier)
7. Run linter and fix all issues

**Deliverable**: Clean, well-documented code ready for review

---

### Step 18: Performance Optimization

**Tasks**:

1. Optimize file preview generation:
   - Use canvas to resize large images before preview
   - Lazy load EXIF extraction (only when panel expanded)

2. Optimize map rendering:
   - Lazy load Mapbox GL library
   - Only initialize map when Step 3 is reached

3. Code splitting:
   - Lazy import UploadWizard (already handled by client:load)
   - Lazy import exifr library

4. Add loading skeletons:
   - File preview placeholder
   - EXIF data loading skeleton
   - Map loading placeholder

**Deliverable**: Optimized upload flow with minimal initial bundle size

---

### Step 19: Accessibility (a11y) Review

**Tasks**:

1. Ensure keyboard navigation works throughout wizard:
   - Tab order logical
   - Enter key submits forms
   - Escape key closes modal
   - Arrow keys work in sliders/selects

2. Add ARIA labels and roles:
   - Form labels properly associated
   - Error messages announced to screen readers
   - Progress indicator accessible
   - Loading states announced

3. Ensure sufficient color contrast
4. Test with screen reader (VoiceOver/NVDA)
5. Add focus indicators for all interactive elements

**Deliverable**: WCAG 2.1 AA compliant upload interface

---

### Step 20: Final Integration and Deployment

**Tasks**:

1. Test complete flow end-to-end with real Supabase backend
2. Verify uploaded photos appear on map immediately (or after moderation)
3. Test rate limiting (upload 5 photos, verify 6th is blocked)
4. Verify file storage in Supabase Storage bucket
5. Check database records created correctly
6. Test photo detail page shows uploaded photo
7. Deploy to staging environment
8. Conduct final QA review
9. Create deployment checklist
10. Deploy to production

**Deliverable**: Fully functional photo upload feature deployed to production

---

## Summary

This implementation plan provides a comprehensive roadmap for building the Photo Upload view in PhotoSpot. The multi-step wizard interface guides users through file selection, metadata entry, and location configuration, with robust validation and error handling at every stage.

**Key Features**:

- ✅ Multi-step wizard (File → Metadata → Location)
- ✅ Drag-and-drop file upload with preview
- ✅ Automatic EXIF extraction and display
- ✅ Interactive map for location selection
- ✅ Location blur functionality (100-500m radius)
- ✅ Comprehensive validation (client + server)
- ✅ Rate limiting (5 photos/24h) with user feedback
- ✅ Error handling and recovery
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessible (keyboard navigation, screen readers)

**Estimated Timeline**: 5-7 days for a single developer following this plan systematically.

**Dependencies**:

- POST `/api/photos` endpoint must be implemented and tested first
- Supabase Storage bucket configured
- Mapbox access token available
- Authentication middleware in place

**Next Steps After Implementation**:

1. User acceptance testing
2. Performance monitoring (upload success rates)
3. Analytics integration (track upload funnel drop-off)
4. Iterative improvements based on user feedback
