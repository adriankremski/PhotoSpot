/**
 * MapControls Component
 *
 * Additional map control buttons like "Locate Me" (geolocation),
 * "Reset View", and optional style switcher.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Locate, RotateCcw, Loader2 } from "lucide-react";

interface MapControlsProps {
  onLocateMe: () => void;
  onResetView: () => void;
  isLocating?: boolean;
}

/**
 * MapControls - Additional control buttons for the map
 */
export function MapControls({ onLocateMe, onResetView, isLocating }: MapControlsProps) {
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles locate me button click
   */
  const handleLocateClick = async () => {
    setError(null);

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    try {
      onLocateMe();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to get your location");
      }
    }
  };

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2 lg:bottom-4">
      {/* Locate Me Button */}
      <Button
        onClick={handleLocateClick}
        disabled={isLocating}
        variant="secondary"
        size="icon"
        className="h-10 w-10 rounded-full bg-card shadow-lg hover:bg-accent"
        aria-label="Locate me"
        title="Locate me"
      >
        {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Locate className="h-5 w-5" />}
      </Button>

      {/* Reset View Button */}
      <Button
        onClick={onResetView}
        variant="secondary"
        size="icon"
        className="h-10 w-10 rounded-full bg-card shadow-lg hover:bg-accent"
        aria-label="Reset view"
        title="Reset view"
      >
        <RotateCcw className="h-5 w-5" />
      </Button>

      {/* Error message */}
      {error && <div className="max-w-xs rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
    </div>
  );
}
