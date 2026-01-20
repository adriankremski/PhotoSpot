/**
 * UploadPhotoButton Component
 *
 * Floating action button (FAB) that opens the photo upload wizard.
 * Supports both modal (default) and page navigation modes.
 * Only visible to authenticated users.
 */

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UploadWizard } from "@/components/upload/UploadWizard";
import type { UserRole } from "@/types";

interface UploadPhotoButtonProps {
  userRole: UserRole | null;
  isAuthenticated: boolean;
  mode?: "modal" | "page"; // Default: modal
}

/**
 * UploadPhotoButton - FAB for uploading photos
 */
export function UploadPhotoButton({ userRole, isAuthenticated, mode = "modal" }: UploadPhotoButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show to authenticated users
  if (!isAuthenticated) {
    return null;
  }

  // Page mode: Navigate to upload page
  if (mode === "page") {
    return (
      <a href="/upload" className="fixed bottom-6 right-6 z-20 lg:bottom-8 lg:right-8" aria-label="Upload photo">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-110 lg:h-16 lg:w-16"
        >
          <Camera className="h-6 w-6 lg:h-7 lg:w-7" />
        </Button>
      </a>
    );
  }

  // Modal mode: Open wizard in dialog
  const handleSuccess = (photoId: string) => {
    setIsModalOpen(false);

    // Show success toast (simple alert for now)
    alert("Photo uploaded successfully!");

    // Optionally refresh the page to show new photo
    window.location.reload();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* FAB Button */}
      <Button
        size="lg"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-110 lg:bottom-8 lg:right-8 lg:h-16 lg:w-16"
        aria-label="Upload photo"
      >
        <Camera className="h-6 w-6 lg:h-7 lg:w-7" />
      </Button>

      {/* Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Upload Photo</DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="mt-4">
            <UploadWizard mode="modal" userRole={userRole} onSuccess={handleSuccess} onCancel={handleCancel} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
