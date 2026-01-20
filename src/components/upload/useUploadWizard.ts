/**
 * useUploadWizard Hook
 *
 * Manages state and navigation for the multi-step photo upload wizard.
 */

import { useState, useCallback } from "react";
import { LOCATION_BLUR } from "@/types";
import { validateFile, validateMetadata, validateLocation } from "./validation";
import type { UploadStep, UploadWizardState, FileWithPreview, MetadataState, LocationState } from "./types";
import { UploadStep as Step } from "./types";

const TOTAL_STEPS = 4;

/**
 * Initial state for the wizard
 */
function getInitialState(): UploadWizardState {
  return {
    step: Step.File,
    file: null,
    filePreview: null,
    metadata: {
      title: "",
      description: "",
      category: "",
      season: "",
      time_of_day: "",
      tags: [],
      gear: {},
    },
    location: {
      latitude: null,
      longitude: null,
      blur_location: false,
      blur_radius: LOCATION_BLUR.DEFAULT_RADIUS_METERS,
    },
    errors: {},
    isSubmitting: false,
  };
}

/**
 * Hook for managing upload wizard state and validation
 */
export function useUploadWizard() {
  const [state, setState] = useState<UploadWizardState>(getInitialState());

  // ============================================================================
  // State Setters
  // ============================================================================

  const setFile = useCallback((fileWithPreview: FileWithPreview | null) => {
    setState((prev) => ({
      ...prev,
      file: fileWithPreview?.file || null,
      filePreview: fileWithPreview,
      errors: { ...prev.errors, file: undefined },
    }));
  }, []);

  const updateMetadata = useCallback((updates: Partial<MetadataState>) => {
    setState((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...updates },
      errors: { ...prev.errors, metadata: undefined },
    }));
  }, []);

  const updateLocation = useCallback((updates: Partial<LocationState>) => {
    setState((prev) => ({
      ...prev,
      location: { ...prev.location, ...updates },
      errors: { ...prev.errors, location: undefined },
    }));
  }, []);

  // ============================================================================
  // Navigation
  // ============================================================================

  const next = useCallback(() => {
    // Validate current step before advancing
    const currentStep = state.step;

    if (currentStep === Step.File) {
      const validation = validateFile(state.file);
      if (!validation.success) {
        setState((prev) => ({ ...prev, errors: { ...prev.errors, file: validation.error } }));
        return;
      }
    } else if (currentStep === Step.Metadata) {
      const validation = validateMetadata(state.metadata);
      if (!validation.success) {
        setState((prev) => ({ ...prev, errors: { ...prev.errors, metadata: "Please check all required fields" } }));
        return;
      }
    } else if (currentStep === Step.Location) {
      const validation = validateLocation(state.location);
      if (!validation.success) {
        setState((prev) => ({ ...prev, errors: { ...prev.errors, location: "Please set a valid location" } }));
        return;
      }
    }

    // Advance to next step
    if (state.step < TOTAL_STEPS - 1) {
      setState((prev) => ({ ...prev, step: (prev.step + 1) as UploadStep, errors: {} }));
    }
  }, [state.step, state.file, state.metadata, state.location]);

  const back = useCallback(() => {
    if (state.step > Step.File) {
      setState((prev) => ({ ...prev, step: (prev.step - 1) as UploadStep, errors: {} }));
    }
  }, [state.step]);

  const goToStep = useCallback((step: UploadStep) => {
    setState((prev) => ({ ...prev, step, errors: {} }));
  }, []);

  // ============================================================================
  // Validation Checks
  // ============================================================================

  const canGoNext = useCallback((): boolean => {
    switch (state.step) {
      case Step.File:
        return state.file !== null;
      case Step.Metadata:
        return state.metadata.title.trim() !== "" && state.metadata.category !== "";
      case Step.Location:
        return state.location.latitude !== null && state.location.longitude !== null;
      case Step.Review:
        return false; // No next from review
      default:
        return false;
    }
  }, [state.step, state.file, state.metadata, state.location]);

  const canGoBack = useCallback((): boolean => {
    return state.step > Step.File;
  }, [state.step]);

  // ============================================================================
  // Submission
  // ============================================================================

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const reset = useCallback(() => {
    setState(getInitialState());
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    state,

    // Setters
    setFile,
    updateMetadata,
    updateLocation,

    // Navigation
    next,
    back,
    goToStep,
    canGoNext: canGoNext(),
    canGoBack: canGoBack(),

    // Submission
    setSubmitting,
    reset,

    // Computed
    totalSteps: TOTAL_STEPS,
  };
}
