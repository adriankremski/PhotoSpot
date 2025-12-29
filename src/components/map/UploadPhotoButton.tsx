/**
 * UploadPhotoButton Component
 * 
 * Floating action button (FAB) that navigates to the photo upload page.
 * Only visible to authenticated users with photographer role.
 */

import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';

interface UploadPhotoButtonProps {
  userRole: UserRole | null;
  isAuthenticated: boolean;
}

/**
 * UploadPhotoButton - FAB for photographers to upload photos
 */
export function UploadPhotoButton({ userRole, isAuthenticated }: UploadPhotoButtonProps) {
  // Only show to authenticated photographers
  if (!isAuthenticated || userRole !== 'photographer') {
    return null;
  }

  return (
    <a
      href="/upload"
      className="fixed bottom-6 right-6 z-20 lg:bottom-8 lg:right-8"
      aria-label="Upload photo"
    >
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-110 lg:h-16 lg:w-16"
      >
        <Camera className="h-6 w-6 lg:h-7 lg:w-7" />
      </Button>
    </a>
  );
}

