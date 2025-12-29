/**
 * UploadWizard Component
 * 
 * Main controller for the multi-step photo upload wizard.
 * Can be rendered as a full page or in a modal.
 */

import { useCallback, useState } from 'react';
import { useUploadWizard } from './useUploadWizard';
import { useCreatePhoto } from './useCreatePhoto';
import { StepIndicator } from './StepIndicator';
import { Dropzone } from './Dropzone';
import { MetadataForm } from './MetadataForm';
import { MapPicker } from './MapPicker';
import { ReviewSummary } from './ReviewSummary';
import { WizardFooter } from './WizardFooter';
import { UploadStep } from './types';
import type { UploadWizardProps, FileWithPreview, ValidationError } from './types';

/**
 * UploadWizard - Multi-step photo upload flow
 */
export function UploadWizard({ mode, userRole, onSuccess, onCancel }: UploadWizardProps) {
  const wizard = useUploadWizard();
  const { state, setFile, updateMetadata, updateLocation, next, back, canGoNext, canGoBack, totalSteps, setSubmitting, reset } = wizard;
  
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Photo creation hook
  const { createPhoto, isLoading: isUploading, error: uploadApiError, fieldErrors } = useCreatePhoto({
    onSuccess: (response) => {
      setUploadSuccess(true);
      setUploadError(null);
      
      // Show success message
      setTimeout(() => {
        reset();
        onSuccess?.(response.photo.id);
        
        // Redirect to map if in page mode
        if (mode === 'page') {
          window.location.href = '/map';
        }
      }, 1500);
    },
    onError: (error) => {
      setUploadError(error.message);
      setSubmitting(false);
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleFileAccepted = useCallback(
    (fileWithPreview: FileWithPreview) => {
      setFile(fileWithPreview);
      
      // Auto-populate metadata from EXIF if available
      if (fileWithPreview.exif) {
        updateMetadata({
          gear: {
            camera: fileWithPreview.exif.camera || '',
            lens: fileWithPreview.exif.lens || '',
          },
        });
      }
    },
    [setFile, updateMetadata]
  );

  const handleFileError = useCallback((error: ValidationError) => {
    console.error('File validation error:', error);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!state.file || !state.filePreview) {
      return;
    }

    setSubmitting(true);
    setUploadError(null);
    setUploadSuccess(false);

    // Build FormData
    const formData = new FormData();
    formData.append('file', state.file);
    formData.append('title', state.metadata.title);
    
    if (state.metadata.description) {
      formData.append('description', state.metadata.description);
    }
    
    formData.append('category', state.metadata.category);
    
    if (state.metadata.season) {
      formData.append('season', state.metadata.season);
    }
    
    if (state.metadata.time_of_day) {
      formData.append('time_of_day', state.metadata.time_of_day);
    }
    
    formData.append('latitude', state.location.latitude!.toString());
    formData.append('longitude', state.location.longitude!.toString());
    
    if (state.location.blur_location) {
      formData.append('blur_location', 'true');
      formData.append('blur_radius', state.location.blur_radius.toString());
    }
    
    // Tags array
    state.metadata.tags.forEach((tag) => {
      formData.append('tags[]', tag);
    });
    
    // Gear as JSON
    if (state.metadata.gear.camera || state.metadata.gear.lens) {
      formData.append('gear', JSON.stringify(state.metadata.gear));
    }

    // Call the upload hook
    await createPhoto(formData);
  }, [state, setSubmitting, createPhoto]);

  const handleCancel = useCallback(() => {
    const shouldCancel = confirm('Are you sure you want to cancel? Your changes will be lost.');
    if (shouldCancel) {
      reset();
      if (mode === 'modal') {
        onCancel?.();
      } else {
        window.history.back();
      }
    }
  }, [reset, mode, onCancel]);

  // ============================================================================
  // Render Current Step
  // ============================================================================

  const renderStep = () => {
    switch (state.step) {
      case UploadStep.File:
        return <Dropzone onFileAccepted={handleFileAccepted} onValidationError={handleFileError} />;

      case UploadStep.Metadata:
        return <MetadataForm value={state.metadata} onChange={updateMetadata} />;

      case UploadStep.Location:
        return <MapPicker value={state.location} onChange={updateLocation} />;

      case UploadStep.Review:
        if (!state.filePreview) return null;
        return <ReviewSummary file={state.filePreview} metadata={state.metadata} location={state.location} />;

      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const containerClass = mode === 'modal' 
    ? 'flex h-full flex-col' 
    : 'mx-auto max-w-4xl';

  return (
    <div className={containerClass}>
      {/* Header with Step Indicator */}
      <div className="mb-6">
        <h1 className="mb-4 text-2xl font-bold lg:text-3xl">Upload Photo</h1>
        <StepIndicator currentStep={state.step} totalSteps={totalSteps} />
      </div>

      {/* Success Message */}
      {uploadSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">✓ Photo uploaded successfully!</p>
          <p className="mt-1">Redirecting...</p>
        </div>
      )}

      {/* Error Display */}
      {(uploadError || uploadApiError || Object.keys(state.errors).length > 0) && !uploadSuccess && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {uploadError && <p className="font-semibold">{uploadError}</p>}
          {uploadApiError && <p className="font-semibold">{uploadApiError}</p>}
          {Object.values(state.errors).map((error, idx) => (
            <p key={idx}>{error}</p>
          ))}
          {fieldErrors && Object.entries(fieldErrors).map(([field, error]) => (
            <p key={field}>{field}: {error}</p>
          ))}
        </div>
      )}

      {/* Step Content */}
      <div className="mb-6 flex-1 overflow-auto">
        {renderStep()}
      </div>

      {/* Footer with Navigation */}
      <WizardFooter
        currentStep={state.step}
        totalSteps={totalSteps}
        canGoNext={canGoNext}
        canGoBack={canGoBack}
        isSubmitting={state.isSubmitting}
        onNext={next}
        onBack={back}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}

