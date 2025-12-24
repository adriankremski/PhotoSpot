/**
 * CarouselDots component - displays progress dots for the carousel
 */

import type { CarouselDotsProps } from './types';

export function CarouselDots({ activeIndex, count, onDotClick }: CarouselDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          className={`h-2 w-2 rounded-full transition-all ${
            index === activeIndex
              ? 'w-8 bg-blue-600'
              : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
          }`}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : 'false'}
        />
      ))}
    </div>
  );
}

