/**
 * StepIndicator Component
 *
 * Displays horizontal progress through wizard steps.
 */

import { STEP_LABELS } from "./types";
import type { StepIndicatorProps } from "./types";
import { UploadStep } from "./types";

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i as UploadStep);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = step < currentStep;

        return (
          <div key={step} className="flex flex-1 items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                  isCompleted
                    ? "border-green-600 bg-green-600 text-white"
                    : isActive
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                {isCompleted ? "✓" : step + 1}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {/* Connector Line */}
            {index < totalSteps - 1 && (
              <div className="mx-2 h-0.5 flex-1 bg-gray-300">
                <div
                  className={`h-full transition-all ${isCompleted ? "bg-green-600" : "bg-gray-300"}`}
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
