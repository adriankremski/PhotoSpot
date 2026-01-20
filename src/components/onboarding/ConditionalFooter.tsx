/**
 * ConditionalFooter component - shows different content based on current step
 */

import { Button } from "@/components/ui/button";
import { ProfileSetupForm } from "./ProfileSetupForm";
import { useOnboarding } from "./useOnboarding";
import type { ConditionalFooterProps } from "./types";

export function ConditionalFooter({ step, isProfileMissing, onFinish, userId, role }: ConditionalFooterProps) {
  const { next } = useOnboarding();

  // Steps 0-1: Show Next button
  if (step < 2) {
    return (
      <div className="mt-8 flex w-full max-w-md justify-center px-6">
        <Button onClick={next} size="lg" className="min-w-[200px]">
          Next
        </Button>
      </div>
    );
  }

  // Step 2: Show profile form if missing, otherwise show finish button
  if (isProfileMissing) {
    return (
      <div className="mt-8 flex w-full max-w-md justify-center px-6">
        <ProfileSetupForm userId={userId} role={role} onSuccess={onFinish} />
      </div>
    );
  }

  // Profile exists, show finish button
  return (
    <div className="mt-8 flex w-full max-w-md justify-center px-6">
      <Button onClick={onFinish} size="lg" className="min-w-[200px]">
        Let's Go!
      </Button>
    </div>
  );
}
