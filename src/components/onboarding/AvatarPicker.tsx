/**
 * AvatarPicker component - handles avatar upload to Supabase Storage
 */

import { useState, useRef } from "react";
import { supabaseClient } from "@/db/supabase.client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AvatarPickerProps } from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabaseClient.storage.from("avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabaseClient.storage.from("avatars").getPublicUrl(data.path);

      onChange(publicUrl);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar preview */}
      <Avatar className="h-24 w-24">
        <AvatarImage src={value || undefined} alt="Avatar preview" />
        <AvatarFallback className="bg-blue-100 text-2xl text-blue-600">{isUploading ? "..." : "?"}</AvatarFallback>
      </Avatar>

      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Upload avatar"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleButtonClick} disabled={isUploading}>
          {isUploading ? "Uploading..." : value ? "Change Photo" : "Upload Photo"}
        </Button>
        {value && !isUploading && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            Remove
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">Max 5MB. JPEG, PNG, or WebP.</p>
    </div>
  );
}
