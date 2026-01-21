/**
 * Dropzone Component
 *
 * File upload with drag & drop support, image preview, and EXIF extraction.
 */

import { useCallback, useState, useRef } from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILE_UPLOAD_CONSTRAINTS } from "@/types";
import { validateFile } from "./validation";
import type { DropzoneProps, FileWithPreview, ExifData } from "./types";

export function Dropzone({ onFileAccepted, onValidationError }: DropzoneProps) {
  const [filePreview, setFilePreview] = useState<FileWithPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // EXIF Extraction
  // ============================================================================

  const extractExif = async (file: File): Promise<ExifData | undefined> => {
    try {
      // Dynamically import exifr only when needed
      const exifr = await import("exifr");
      const exifData = await exifr.parse(file, {
        pick: ["Make", "Model", "LensModel", "FNumber", "ExposureTime", "ISO", "FocalLength", "DateTimeOriginal"],
      });

      if (!exifData) return undefined;

      // Format EXIF data
      const formatted: ExifData = {};

      if (exifData.Make && exifData.Model) {
        formatted.camera = `${exifData.Make} ${exifData.Model}`.trim();
      }

      if (exifData.LensModel) {
        formatted.lens = exifData.LensModel;
      }

      if (exifData.FNumber) {
        formatted.aperture = `f/${exifData.FNumber}`;
      }

      if (exifData.ExposureTime) {
        formatted.shutter_speed =
          exifData.ExposureTime < 1 ? `1/${Math.round(1 / exifData.ExposureTime)}` : `${exifData.ExposureTime}s`;
      }

      if (exifData.ISO) {
        formatted.iso = exifData.ISO;
      }

      if (exifData.FocalLength) {
        formatted.focal_length = `${exifData.FocalLength}mm`;
      }

      if (exifData.DateTimeOriginal) {
        formatted.date_taken = new Date(exifData.DateTimeOriginal).toISOString();
      }

      return Object.keys(formatted).length > 0 ? formatted : undefined;
    } catch (err) {
      console.warn("Failed to extract EXIF data:", err);
      return undefined;
    }
  };

  // ============================================================================
  // File Processing
  // ============================================================================

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      // Validate file
      const validation = validateFile(file);
      if (!validation.success) {
        setError(validation.error || "Invalid file");
        onValidationError({ field: "file", message: validation.error || "Invalid file" });
        setIsProcessing(false);
        return;
      }

      try {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        // Extract EXIF data
        const exif = await extractExif(file);

        const fileWithPreview: FileWithPreview = {
          file,
          previewUrl,
          exif,
        };

        setFilePreview(fileWithPreview);
        onFileAccepted(fileWithPreview);
      } catch {
        setError("Failed to process file");
        onValidationError({ field: "file", message: "Failed to process file" });
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileAccepted, onValidationError]
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        if (files.length > 1) {
          setError("Please select only one file");
          onValidationError({ field: "file", message: "Please select only one file" });
          return;
        }
        processFile(files[0]);
      }
    },
    [processFile, onValidationError]
  );

  const handleRemoveFile = useCallback(() => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.previewUrl);
    }
    setFilePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [filePreview]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (filePreview) {
    return (
      <div className="space-y-4">
        {/* Image Preview */}
        <div className="relative overflow-hidden rounded-lg border border-gray-300">
          <img src={filePreview.previewUrl} alt="Preview" className="h-auto w-full max-h-[500px] object-contain" />
          <Button variant="outline" size="sm" className="absolute right-2 top-2 bg-white/90" onClick={handleRemoveFile}>
            <X className="mr-1 h-4 w-4" />
            Remove
          </Button>
        </div>

        {/* File Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">File Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 text-gray-900">{filePreview.file.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 text-gray-900">{(filePreview.file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </div>

        {/* EXIF Data */}
        {filePreview.exif && Object.keys(filePreview.exif).length > 0 && (
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">Camera Settings (EXIF)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {filePreview.exif.camera && (
                <div>
                  <span className="text-blue-700">Camera:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.camera}</span>
                </div>
              )}
              {filePreview.exif.lens && (
                <div>
                  <span className="text-blue-700">Lens:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.lens}</span>
                </div>
              )}
              {filePreview.exif.aperture && (
                <div>
                  <span className="text-blue-700">Aperture:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.aperture}</span>
                </div>
              )}
              {filePreview.exif.shutter_speed && (
                <div>
                  <span className="text-blue-700">Shutter:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.shutter_speed}</span>
                </div>
              )}
              {filePreview.exif.iso && (
                <div>
                  <span className="text-blue-700">ISO:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.iso}</span>
                </div>
              )}
              {filePreview.exif.focal_length && (
                <div>
                  <span className="text-blue-700">Focal Length:</span>
                  <span className="ml-2 text-blue-900">{filePreview.exif.focal_length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        className={`flex min-h-[400px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : error
              ? "border-red-300 bg-red-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
        role="button"
        tabIndex={0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        {isProcessing ? (
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            <p className="text-sm text-gray-600">Processing image...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-full bg-gray-200 p-4">
              {isDragging ? (
                <Upload className="h-12 w-12 text-blue-600" />
              ) : (
                <ImageIcon className="h-12 w-12 text-gray-400" />
              )}
            </div>

            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              {isDragging ? "Drop your photo here" : "Upload a Photo"}
            </h3>

            <p className="mb-4 text-sm text-gray-600">Drag and drop your photo here, or click to browse</p>

            <Button type="button" variant="outline" onClick={(e) => e.stopPropagation()}>
              Browse Files
            </Button>

            <p className="mt-4 text-xs text-gray-500">
              Supported formats: JPEG, PNG • Max size: {FILE_UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES / 1024 / 1024} MB
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_UPLOAD_CONSTRAINTS.ALLOWED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
