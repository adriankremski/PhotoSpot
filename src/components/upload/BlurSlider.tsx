/**
 * BlurSlider Component
 *
 * Toggle and slider for location blur settings.
 * Allows users to enable/disable location blurring and adjust radius (100-500m).
 */

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { LOCATION_BLUR } from "@/types";
import type { BlurSliderProps } from "./types";

export function BlurSlider({ enabled, radius, onBlurToggle, onRadiusChange }: BlurSliderProps) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="blur-toggle" className="text-sm font-medium">
            Blur Location
          </Label>
          <p className="text-xs text-gray-600">Protect your exact location by showing an approximate area instead</p>
        </div>
        <Switch id="blur-toggle" checked={enabled} onCheckedChange={onBlurToggle} />
      </div>

      {/* Radius Slider (only visible when blur is enabled) */}
      {enabled && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="blur-radius" className="text-sm font-medium">
              Blur Radius
            </Label>
            <span className="text-sm font-semibold text-blue-600">{radius}m</span>
          </div>

          <Slider
            id="blur-radius"
            min={LOCATION_BLUR.MIN_RADIUS_METERS}
            max={LOCATION_BLUR.MAX_RADIUS_METERS}
            step={50}
            value={[radius]}
            onValueChange={(values) => onRadiusChange(values[0])}
            className="w-full"
          />

          <div className="flex justify-between text-xs text-gray-500">
            <span>{LOCATION_BLUR.MIN_RADIUS_METERS}m</span>
            <span>{LOCATION_BLUR.MAX_RADIUS_METERS}m</span>
          </div>

          <p className="text-xs text-gray-600">
            Your photo will be displayed within a {radius}m radius of the actual location
          </p>
        </div>
      )}
    </div>
  );
}
