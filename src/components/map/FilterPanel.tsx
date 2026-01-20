/**
 * FilterPanel Component
 *
 * Collapsible panel with filter controls for category, season, time of day,
 * and photographer-only toggle. Responsive: floating panel on desktop,
 * slide-up drawer on mobile.
 */

import { useState, useEffect } from "react";
import type { PhotoFilters, PhotoCategory, Season, TimeOfDay } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { countActiveFilters } from "@/lib/utils/filterHelpers";

interface FilterPanelProps {
  filters: PhotoFilters;
  onFiltersChange: (filters: PhotoFilters) => void;
  onReset: () => void;
  isLoading?: boolean;
}

const CATEGORIES: (PhotoCategory | "all")[] = [
  "all",
  "landscape",
  "portrait",
  "street",
  "architecture",
  "nature",
  "wildlife",
  "macro",
  "aerial",
  "astrophotography",
  "urban",
  "seascape",
  "other",
];

const SEASONS: (Season | "all")[] = ["all", "spring", "summer", "autumn", "winter"];

const TIME_OF_DAY_OPTIONS: (TimeOfDay | "all")[] = [
  "all",
  "golden_hour_morning",
  "morning",
  "midday",
  "afternoon",
  "golden_hour_evening",
  "blue_hour",
  "night",
];

/**
 * Formats time of day option for display
 */
function formatTimeOfDay(time: TimeOfDay | "all"): string {
  if (time === "all") return "All Times";
  return time
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats category for display
 */
function formatCategory(category: PhotoCategory | "all"): string {
  if (category === "all") return "All Categories";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Formats season for display
 */
function formatSeason(season: Season | "all"): string {
  if (season === "all") return "All Seasons";
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/**
 * FilterPanel - Collapsible filter controls
 */
export function FilterPanel({ filters, onFiltersChange, onReset, isLoading }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [localFilters, setLocalFilters] = useState<PhotoFilters>(filters);

  // Sync local filters with prop filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const activeFilterCount = countActiveFilters(localFilters);

  /**
   * Handles category change
   */
  const handleCategoryChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      category: value === "all" ? null : (value as PhotoCategory),
    }));
  };

  /**
   * Handles season change
   */
  const handleSeasonChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      season: value === "all" ? null : (value as Season),
    }));
  };

  /**
   * Handles time of day change
   */
  const handleTimeOfDayChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      time_of_day: value === "all" ? null : (value as TimeOfDay),
    }));
  };

  /**
   * Handles photographer only toggle
   */
  const handlePhotographerOnlyChange = (checked: boolean) => {
    setLocalFilters((prev) => ({
      ...prev,
      photographer_only: checked,
    }));
  };

  /**
   * Applies filters
   */
  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  /**
   * Resets filters
   */
  const handleReset = () => {
    const emptyFilters: PhotoFilters = {
      category: null,
      season: null,
      time_of_day: null,
      photographer_only: false,
    };
    setLocalFilters(emptyFilters);
    onReset();
  };

  return (
    <div className="absolute left-4 top-4 z-10 w-72 rounded-lg bg-card shadow-lg lg:left-4 lg:top-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-md p-1 hover:bg-accent"
          aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="space-y-4 p-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category-select" className="text-sm font-medium">
              Category
            </Label>
            <select
              id="category-select"
              value={localFilters.category || "all"}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </div>

          {/* Season */}
          <div className="space-y-2">
            <Label htmlFor="season-select" className="text-sm font-medium">
              Season
            </Label>
            <select
              id="season-select"
              value={localFilters.season || "all"}
              onChange={(e) => handleSeasonChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
            >
              {SEASONS.map((season) => (
                <option key={season} value={season}>
                  {formatSeason(season)}
                </option>
              ))}
            </select>
          </div>

          {/* Time of Day */}
          <div className="space-y-2">
            <Label htmlFor="time-select" className="text-sm font-medium">
              Time of Day
            </Label>
            <select
              id="time-select"
              value={localFilters.time_of_day || "all"}
              onChange={(e) => handleTimeOfDayChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
            >
              {TIME_OF_DAY_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {formatTimeOfDay(time)}
                </option>
              ))}
            </select>
          </div>

          {/* Photographer Only */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="photographer-only"
              checked={localFilters.photographer_only}
              onChange={(e) => handlePhotographerOnlyChange(e.target.checked)}
              className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading}
            />
            <Label htmlFor="photographer-only" className="text-sm font-medium">
              Photographers Only
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} disabled={isLoading} className="flex-1" size="sm">
              {isLoading ? "Loading..." : "Apply Filters"}
            </Button>
            <Button onClick={handleReset} disabled={isLoading} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
