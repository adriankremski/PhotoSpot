/**
 * OnboardingPage component - Main container for the onboarding flow
 */

import { useState, useEffect } from 'react';
import { OnboardingProvider } from './useOnboarding';
import { OnboardingCarousel } from './OnboardingCarousel';
import { OnboardingSlide } from './OnboardingSlide';
import { ConditionalFooter } from './ConditionalFooter';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './useOnboarding';
import {
  WelcomeIllustration,
  DiscoverIllustration,
  ShareIllustration,
} from './illustrations';
import type { OnboardingPageProps } from './types';

/**
 * Inner component that uses the onboarding context
 */
function OnboardingContent({ userId, userRole }: OnboardingPageProps) {
  const { currentStep } = useOnboarding();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isProfileMissing, setIsProfileMissing] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Check if user has a profile
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/profile`);
        if (response.status === 404) {
          // Profile doesn't exist
          setIsProfileMissing(true);
        } else if (response.ok) {
          // Profile exists
          setIsProfileMissing(false);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        // Assume profile is missing on error
        setIsProfileMissing(true);
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkProfile();
  }, [userId]);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Update user metadata to mark onboarding as completed
      const response = await fetch('/api/auth/update-metadata', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      });

      if (response.ok) {
        // Redirect to home/map
        window.location.href = '/';
      } else {
        throw new Error('Failed to update onboarding status');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsCompleting(false);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-gray-900">
      {/* Skip button - fixed top-right */}
      <div className="absolute right-4 top-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={isCompleting || isCheckingProfile}
        >
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {isCheckingProfile ? (
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        ) : (
          <>
            <OnboardingCarousel slideCount={3}>
              {/* Slide 1: Welcome */}
              <OnboardingSlide
                title="Welcome to PhotoSpot"
                description={`Great to have you here${
                  userRole === 'photographer' ? ', photographer' : ''
                }! Discover amazing photo locations and share your own hidden gems with the community.`}
                illustration={<WelcomeIllustration />}
              />

              {/* Slide 2: Discover */}
              <OnboardingSlide
                title="Discover Perfect Locations"
                description="Browse thousands of photo spots around the world. Filter by season, time of day, and photography style to find your next perfect shot."
                illustration={<DiscoverIllustration />}
              />

              {/* Slide 3: Share */}
              <OnboardingSlide
                title="Share Your Spots"
                description="Upload your photos and help others discover amazing locations. Build your portfolio and connect with fellow photographers."
                illustration={<ShareIllustration />}
              />
            </OnboardingCarousel>

            {/* Conditional footer with navigation/profile form */}
            <ConditionalFooter
              step={currentStep}
              isProfileMissing={isProfileMissing}
              onFinish={handleComplete}
              userId={userId}
              role={userRole}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Main OnboardingPage component with provider
 */
export function Onboarding(props: OnboardingPageProps) {
  return (
    <OnboardingProvider>
      <OnboardingContent {...props} />
    </OnboardingProvider>
  );
}

