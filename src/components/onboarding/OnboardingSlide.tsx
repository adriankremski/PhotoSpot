/**
 * OnboardingSlide component - displays a single slide in the onboarding carousel
 */

import type { OnboardingSlideProps } from './types';

export function OnboardingSlide({ title, description, illustration }: OnboardingSlideProps) {
  return (
    <div className="flex min-w-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-8 flex h-64 w-64 items-center justify-center">
        {illustration}
      </div>
      <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <p className="max-w-md text-lg text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

