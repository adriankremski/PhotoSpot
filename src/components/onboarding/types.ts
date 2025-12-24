/**
 * Types for Onboarding Flow
 */

import type { UserRole, CreateProfileCommand, UserProfileDto } from '@/types';

/**
 * Onboarding step numbers
 */
export type OnboardingStep = 0 | 1 | 2;

/**
 * Profile form values for the optional profile setup
 */
export interface ProfileFormValues {
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  company_name?: string | null; // photographer only
  website_url?: string | null; // photographer only
  social_links?: Record<string, string> | null; // photographer only
}

/**
 * API request type for creating profile
 */
export type ApiCreateProfileRequest = CreateProfileCommand;

/**
 * API response type for profile creation
 */
export interface ApiCreateProfileResponse {
  message: string;
  profile: UserProfileDto;
}

/**
 * Social link entry for the dynamic list
 */
export interface SocialLinkEntry {
  id: string;
  label: string;
  url: string;
}

/**
 * Onboarding context value
 */
export interface OnboardingContextValue {
  currentStep: OnboardingStep;
  next: () => void;
  prev: () => void;
  goToStep: (step: OnboardingStep) => void;
}

/**
 * Props for OnboardingPage component
 */
export interface OnboardingPageProps {
  userId: string;
  userRole: UserRole;
}

/**
 * Props for OnboardingSlide component
 */
export interface OnboardingSlideProps {
  title: string;
  description: string;
  illustration: React.ReactNode;
}

/**
 * Props for CarouselDots component
 */
export interface CarouselDotsProps {
  activeIndex: number;
  count: number;
  onDotClick: (index: number) => void;
}

/**
 * Props for ConditionalFooter component
 */
export interface ConditionalFooterProps {
  step: OnboardingStep;
  isProfileMissing: boolean;
  onFinish: () => void;
  userId: string;
  role: UserRole;
}

/**
 * Props for ProfileSetupForm component
 */
export interface ProfileSetupFormProps {
  userId: string;
  role: UserRole;
  onSuccess: () => void;
}

/**
 * Props for AvatarPicker component
 */
export interface AvatarPickerProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

/**
 * Props for PhotographerFields component
 */
export interface PhotographerFieldsProps {
  companyName: string;
  websiteUrl: string;
  socialLinks: SocialLinkEntry[];
  onCompanyNameChange: (value: string) => void;
  onWebsiteUrlChange: (value: string) => void;
  onSocialLinksChange: (links: SocialLinkEntry[]) => void;
  errors?: {
    company_name?: string;
    website_url?: string;
    social_links?: string;
  };
}

