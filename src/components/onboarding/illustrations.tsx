/**
 * Placeholder illustrations for onboarding slides
 * These can be replaced with actual SVG illustrations or images later
 */

export function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="80" fill="#3B82F6" opacity="0.2" />
      <circle cx="100" cy="100" r="60" fill="#3B82F6" opacity="0.4" />
      <circle cx="100" cy="100" r="40" fill="#3B82F6" />
      <path
        d="M70 100 L100 70 L130 100 L100 130 Z"
        fill="white"
        opacity="0.9"
      />
    </svg>
  );
}

export function DiscoverIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="40" y="60" width="120" height="80" rx="8" fill="#3B82F6" opacity="0.2" />
      <rect x="50" y="70" width="100" height="60" rx="4" fill="#3B82F6" opacity="0.4" />
      <circle cx="100" cy="100" r="25" fill="#3B82F6" />
      <circle cx="100" cy="100" r="15" fill="white" opacity="0.9" />
      <path
        d="M100 85 L115 100 L100 115 L85 100 Z"
        fill="#3B82F6"
        opacity="0.8"
      />
    </svg>
  );
}

export function ShareIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="60" r="20" fill="#3B82F6" />
      <circle cx="60" cy="140" r="20" fill="#3B82F6" opacity="0.6" />
      <circle cx="140" cy="140" r="20" fill="#3B82F6" opacity="0.6" />
      <line x1="100" y1="80" x2="70" y2="130" stroke="#3B82F6" strokeWidth="4" />
      <line x1="100" y1="80" x2="130" y2="130" stroke="#3B82F6" strokeWidth="4" />
      <circle cx="100" cy="60" r="12" fill="white" opacity="0.9" />
      <circle cx="60" cy="140" r="12" fill="white" opacity="0.9" />
      <circle cx="140" cy="140" r="12" fill="white" opacity="0.9" />
    </svg>
  );
}

