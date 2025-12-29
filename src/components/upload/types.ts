/**
 * Types and Schemas for Photo Upload Wizard
 */

import type { PhotoCategory, Season, TimeOfDay, GearInfo, ExifData } from '@/types';

// ============================================================================
// Wizard Step Enum
// ============================================================================

export enum UploadStep {
  File = 0,
  Metadata = 1,
  Location = 2,
  Review = 3,
}

// ============================================================================
// Wizard State Types
// ============================================================================

/**
 * File with preview URL for display
 */
export interface FileWithPreview {
  file: File;
  previewUrl: string; // object URL
  exif?: ExifData;
}

/**
 * Metadata form state
 */
export interface MetadataState {
  title: string;
  description: string;
  category: PhotoCategory | '';
  season: Season | '';
  time_of_day: TimeOfDay | '';
  tags: string[];
  gear: GearInfo;
}

/**
 * Location state with blur settings
 */
export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  blur_location: boolean;
  blur_radius: number; // default 200
}

/**
 * Complete wizard state
 */
export interface UploadWizardState {
  step: UploadStep;
  file: File | null;
  filePreview: FileWithPreview | null;
  metadata: MetadataState;
  location: LocationState;
  errors: Partial<Record<'file' | 'metadata' | 'location', string>>;
  isSubmitting: boolean;
}

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface UploadWizardProps {
  mode: 'page' | 'modal';
  userRole: string | null;
  onSuccess?: (photoId: string) => void;
  onCancel?: () => void;
}

export interface StepIndicatorProps {
  currentStep: UploadStep;
  totalSteps: number;
}

export interface DropzoneProps {
  initialFile?: File;
  onFileAccepted: (fileWithPreview: FileWithPreview) => void;
  onValidationError: (error: ValidationError) => void;
}

export interface MetadataFormProps {
  value: MetadataState;
  onChange: (metadata: Partial<MetadataState>) => void;
  errors?: Record<string, string>;
}

export interface MapPickerProps {
  value: LocationState;
  onChange: (location: Partial<LocationState>) => void;
  errors?: Record<string, string>;
}

export interface BlurSliderProps {
  enabled: boolean;
  radius: number;
  onBlurToggle: (enabled: boolean) => void;
  onRadiusChange: (radius: number) => void;
}

export interface ReviewSummaryProps {
  file: FileWithPreview;
  metadata: MetadataState;
  location: LocationState;
}

export interface WizardFooterProps {
  currentStep: UploadStep;
  totalSteps: number;
  canGoNext: boolean;
  canGoBack: boolean;
  isSubmitting: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

// ============================================================================
// Step Labels
// ============================================================================

export const STEP_LABELS: Record<UploadStep, string> = {
  [UploadStep.File]: 'Select Photo',
  [UploadStep.Metadata]: 'Add Details',
  [UploadStep.Location]: 'Set Location',
  [UploadStep.Review]: 'Review & Submit',
};

