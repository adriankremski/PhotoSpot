/**
 * WizardFooter Component
 *
 * Navigation controls for wizard: Back, Next, Submit, Cancel.
 */

import { Button } from "@/components/ui/button";
import { UploadStep } from "./types";
import type { WizardFooterProps } from "./types";

export function WizardFooter({
  currentStep,
  totalSteps,
  canGoNext,
  canGoBack,
  isSubmitting,
  onNext,
  onBack,
  onSubmit,
  onCancel,
}: WizardFooterProps) {
  const isReviewStep = currentStep === UploadStep.Review;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
      {/* Left: Cancel */}
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>

      {/* Right: Back / Next / Submit */}
      <div className="flex gap-2">
        {canGoBack && (
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
        )}

        {isReviewStep ? (
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Uploading..." : "Submit Photo"}
          </Button>
        ) : (
          <Button onClick={onNext} disabled={!canGoNext || isSubmitting}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
