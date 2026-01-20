/**
 * Custom hook and context for managing onboarding state
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import type { OnboardingContextValue, OnboardingStep } from "./types";

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Provider component for onboarding context
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);

  const next = () => {
    setCurrentStep((prev) => (prev < 2 ? ((prev + 1) as OnboardingStep) : prev));
  };

  const prev = () => {
    setCurrentStep((prev) => (prev > 0 ? ((prev - 1) as OnboardingStep) : prev));
  };

  const goToStep = (step: OnboardingStep) => {
    if (step >= 0 && step <= 2) {
      setCurrentStep(step);
    }
  };

  return (
    <OnboardingContext.Provider value={{ currentStep, next, prev, goToStep }}>{children}</OnboardingContext.Provider>
  );
}

/**
 * Hook to access onboarding context
 */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
