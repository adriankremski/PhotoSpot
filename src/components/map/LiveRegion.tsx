/**
 * LiveRegion Component
 * 
 * Accessible live region for announcing dynamic content changes
 * to screen readers. Uses aria-live="polite" for non-intrusive announcements.
 */

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  clearAfter?: number; // Clear message after N milliseconds
}

/**
 * LiveRegion - Announces messages to screen readers
 */
export function LiveRegion({ message, clearAfter = 3000 }: LiveRegionProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to clear message
    if (message && clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * sr-only class should be defined in global CSS:
 * .sr-only {
 *   position: absolute;
 *   width: 1px;
 *   height: 1px;
 *   padding: 0;
 *   margin: -1px;
 *   overflow: hidden;
 *   clip: rect(0, 0, 0, 0);
 *   white-space: nowrap;
 *   border-width: 0;
 * }
 */

