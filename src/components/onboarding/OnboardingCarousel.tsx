/**
 * OnboardingCarousel component - horizontally scrollable container for slides
 */

import { useEffect, useRef } from 'react';
import { useOnboarding } from './useOnboarding';
import { CarouselDots } from './CarouselDots';
import type { OnboardingStep } from './types';

interface OnboardingCarouselProps {
  children: React.ReactNode;
  slideCount: number;
}

export function OnboardingCarousel({ children, slideCount }: OnboardingCarouselProps) {
  const { currentStep, goToStep } = useOnboarding();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step
  useEffect(() => {
    if (containerRef.current) {
      const slideWidth = containerRef.current.offsetWidth;
      containerRef.current.scrollTo({
        left: slideWidth * currentStep,
        behavior: 'smooth',
      });
    }
  }, [currentStep]);

  const handleDotClick = (index: number) => {
    if (index >= 0 && index < slideCount) {
      goToStep(index as OnboardingStep);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Slides container */}
      <div
        ref={containerRef}
        className="flex w-full overflow-x-hidden scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>

      {/* Progress dots */}
      <div className="mt-8">
        <CarouselDots
          activeIndex={currentStep}
          count={slideCount}
          onDotClick={handleDotClick}
        />
      </div>
    </div>
  );
}

