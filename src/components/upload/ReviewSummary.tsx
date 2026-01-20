/**
 * ReviewSummary Component
 *
 * Final review screen showing all collected data before submission.
 * Displays photo preview, metadata, location, and terms notice.
 */

import { MapPin, Camera, Tag, Calendar, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewSummaryProps } from "./types";
import { STEP_LABELS } from "./types";

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

export function ReviewSummary({ file, metadata, location }: ReviewSummaryProps) {
  // Generate static map image URL
  const getStaticMapUrl = () => {
    if (location.latitude === null || location.longitude === null) return null;

    const lng = location.longitude;
    const lat = location.latitude;
    const zoom = 12;
    const width = 600;
    const height = 300;

    // Add marker with custom pin
    const marker = `pin-l-camera+ff0000(${lng},${lat})`;

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${marker}/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
  };

  const staticMapUrl = getStaticMapUrl();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">Review Your Photo</h3>
            <p className="mt-1 text-sm text-blue-700">
              Please review all information before submitting. You can go back to edit any section.
            </p>
          </div>
        </div>
      </div>

      {/* Photo Preview */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Camera className="h-5 w-5" />
          Photo
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-300">
          <img src={file.previewUrl} alt="Preview" className="h-auto w-full max-h-[400px] object-contain bg-gray-50" />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{file.file.name}</span>
          <span className="mx-2">•</span>
          <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>

      {/* Metadata Section */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Tag className="h-5 w-5" />
          Details
        </h3>
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          {/* Title */}
          <div>
            <span className="text-sm font-medium text-gray-600">Title</span>
            <p className="mt-1 text-gray-900">{metadata.title}</p>
          </div>

          {/* Description */}
          {metadata.description && (
            <div>
              <span className="text-sm font-medium text-gray-600">Description</span>
              <p className="mt-1 text-gray-900">{metadata.description}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <span className="text-sm font-medium text-gray-600">Category</span>
            <p className="mt-1 capitalize text-gray-900">{metadata.category.replace("_", " ")}</p>
          </div>

          {/* Season & Time of Day */}
          <div className="grid grid-cols-2 gap-4">
            {metadata.season && (
              <div>
                <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Season
                </span>
                <p className="mt-1 capitalize text-gray-900">{metadata.season}</p>
              </div>
            )}
            {metadata.time_of_day && (
              <div>
                <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                  <Clock className="h-4 w-4" />
                  Time of Day
                </span>
                <p className="mt-1 capitalize text-gray-900">{metadata.time_of_day.replace(/_/g, " ")}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {metadata.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-600">Tags</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Camera Gear */}
          {(metadata.gear.camera || metadata.gear.lens) && (
            <div>
              <span className="text-sm font-medium text-gray-600">Camera Gear</span>
              <div className="mt-1 space-y-1">
                {metadata.gear.camera && (
                  <p className="text-gray-900">
                    <span className="text-gray-600">Camera:</span> {metadata.gear.camera}
                  </p>
                )}
                {metadata.gear.lens && (
                  <p className="text-gray-900">
                    <span className="text-gray-600">Lens:</span> {metadata.gear.lens}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Section */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5" />
          Location
        </h3>

        {/* Static Map Preview */}
        {staticMapUrl && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-300">
            <img src={staticMapUrl} alt="Location map" className="h-auto w-full" />
          </div>
        )}

        {/* Location Details */}
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <span className="text-sm font-medium text-gray-600">Coordinates</span>
            <p className="mt-1 font-mono text-sm text-gray-900">
              {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
            </p>
          </div>

          {/* Blur Settings */}
          <div>
            <span className="text-sm font-medium text-gray-600">Privacy Settings</span>
            {location.blur_location ? (
              <div className="mt-1">
                <p className="text-gray-900">Location blurred with {location.blur_radius}m radius</p>
                <p className="mt-1 text-xs text-gray-600">
                  Your exact location will be hidden. The photo will be displayed within a {location.blur_radius}m area.
                </p>
              </div>
            ) : (
              <p className="mt-1 text-gray-900">Exact location visible</p>
            )}
          </div>
        </div>
      </div>

      {/* EXIF Data (if available) */}
      {file.exif && Object.keys(file.exif).length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Camera className="h-5 w-5" />
            Camera Settings (EXIF)
          </h3>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm md:grid-cols-3">
            {file.exif.aperture && (
              <div>
                <span className="text-gray-600">Aperture</span>
                <p className="mt-1 font-medium text-gray-900">{file.exif.aperture}</p>
              </div>
            )}
            {file.exif.shutter_speed && (
              <div>
                <span className="text-gray-600">Shutter Speed</span>
                <p className="mt-1 font-medium text-gray-900">{file.exif.shutter_speed}</p>
              </div>
            )}
            {file.exif.iso && (
              <div>
                <span className="text-gray-600">ISO</span>
                <p className="mt-1 font-medium text-gray-900">{file.exif.iso}</p>
              </div>
            )}
            {file.exif.focal_length && (
              <div>
                <span className="text-gray-600">Focal Length</span>
                <p className="mt-1 font-medium text-gray-900">{file.exif.focal_length}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terms & Legal Notice */}
      <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
        <h3 className="font-semibold text-yellow-900">Before You Submit</h3>
        <ul className="mt-2 space-y-1 text-sm text-yellow-800">
          <li>• You confirm that you own the rights to this photo</li>
          <li>• The photo does not contain inappropriate or copyrighted content</li>
          <li>• The location information is accurate</li>
          <li>• You agree to share this photo publicly on PhotoSpot</li>
        </ul>
        <p className="mt-3 text-xs text-yellow-700">
          By submitting, you agree to our Terms of Service and Community Guidelines.
        </p>
      </div>
    </div>
  );
}
