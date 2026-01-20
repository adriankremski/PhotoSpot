/**
 * MetadataForm Component
 *
 * Form for collecting photo metadata: title, description, category, season, time of day, tags, and gear.
 */

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FIELD_CONSTRAINTS } from "@/types";
import type { MetadataFormProps, MetadataState } from "./types";

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = [
  { value: "landscape", label: "Landscape" },
  { value: "portrait", label: "Portrait" },
  { value: "street", label: "Street" },
  { value: "architecture", label: "Architecture" },
  { value: "nature", label: "Nature" },
  { value: "wildlife", label: "Wildlife" },
  { value: "macro", label: "Macro" },
  { value: "aerial", label: "Aerial" },
  { value: "astrophotography", label: "Astrophotography" },
  { value: "urban", label: "Urban" },
  { value: "seascape", label: "Seascape" },
  { value: "other", label: "Other" },
];

const SEASONS = [
  { value: "", label: "Not specified" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter" },
];

const TIMES_OF_DAY = [
  { value: "", label: "Not specified" },
  { value: "golden_hour_morning", label: "Golden Hour (Morning)" },
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "afternoon", label: "Afternoon" },
  { value: "golden_hour_evening", label: "Golden Hour (Evening)" },
  { value: "blue_hour", label: "Blue Hour" },
  { value: "night", label: "Night" },
];

// ============================================================================
// Component
// ============================================================================

export function MetadataForm({ value, onChange, errors }: MetadataFormProps) {
  const [tagInput, setTagInput] = useState("");

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = useCallback(
    (field: keyof MetadataState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onChange({ [field]: event.target.value });
      },
    [onChange]
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();

    if (!trimmed) return;

    if (value.tags.length >= FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO) {
      alert(`Maximum ${FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO} tags allowed`);
      return;
    }

    if (trimmed.length > FIELD_CONSTRAINTS.TAG_NAME_MAX) {
      alert(`Tag must not exceed ${FIELD_CONSTRAINTS.TAG_NAME_MAX} characters`);
      return;
    }

    if (value.tags.includes(trimmed)) {
      alert("Tag already added");
      return;
    }

    onChange({ tags: [...value.tags, trimmed] });
    setTagInput("");
  }, [tagInput, value.tags, onChange]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onChange({ tags: value.tags.filter((tag) => tag !== tagToRemove) });
    },
    [value.tags, onChange]
  );

  const handleTagInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleGearChange = useCallback(
    (field: "camera" | "lens") => (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        gear: {
          ...value.gear,
          [field]: event.target.value,
        },
      });
    },
    [value.gear, onChange]
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Title (Required) */}
      <div>
        <Label htmlFor="title">
          Title <span className="text-red-600">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          value={value.title}
          onChange={handleChange("title")}
          placeholder="Give your photo a memorable title"
          maxLength={FIELD_CONSTRAINTS.PHOTO_TITLE_MAX}
          required
          className={errors?.title ? "border-red-500" : ""}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{errors?.title && <span className="text-red-600">{errors.title}</span>}</span>
          <span>
            {value.title.length} / {FIELD_CONSTRAINTS.PHOTO_TITLE_MAX}
          </span>
        </div>
      </div>

      {/* Description (Optional) */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={value.description}
          onChange={handleChange("description")}
          placeholder="Describe your photo, the story behind it, or technical details"
          maxLength={FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX}
          rows={4}
          className={errors?.description ? "border-red-500" : ""}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{errors?.description && <span className="text-red-600">{errors.description}</span>}</span>
          <span>
            {value.description.length} / {FIELD_CONSTRAINTS.PHOTO_DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      {/* Category (Required) */}
      <div>
        <Label htmlFor="category">
          Category <span className="text-red-600">*</span>
        </Label>
        <select
          id="category"
          value={value.category}
          onChange={handleChange("category")}
          required
          className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${
            errors?.category ? "border-red-500" : ""
          }`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors?.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      {/* Season and Time of Day (Optional) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="season">Season</Label>
          <select
            id="season"
            value={value.season}
            onChange={handleChange("season")}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2"
          >
            {SEASONS.map((season) => (
              <option key={season.value} value={season.value}>
                {season.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="time_of_day">Time of Day</Label>
          <select
            id="time_of_day"
            value={value.time_of_day}
            onChange={handleChange("time_of_day")}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2"
          >
            {TIMES_OF_DAY.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags (Optional) */}
      <div>
        <Label htmlFor="tag-input">
          Tags <span className="text-xs text-gray-500">(max {FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO})</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="tag-input"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add a tag and press Enter"
            maxLength={FIELD_CONSTRAINTS.TAG_NAME_MAX}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTag}
            disabled={!tagInput.trim() || value.tags.length >= FIELD_CONSTRAINTS.MAX_TAGS_PER_PHOTO}
          >
            Add
          </Button>
        </div>

        {/* Tag List */}
        {value.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-blue-900"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Camera Gear (Optional) */}
      <div>
        <Label className="mb-2 block">Camera Gear</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="camera" className="text-xs text-gray-600">
              Camera
            </Label>
            <Input
              id="camera"
              type="text"
              value={value.gear.camera || ""}
              onChange={handleGearChange("camera")}
              placeholder="e.g., Canon EOS R5"
            />
          </div>
          <div>
            <Label htmlFor="lens" className="text-xs text-gray-600">
              Lens
            </Label>
            <Input
              id="lens"
              type="text"
              value={value.gear.lens || ""}
              onChange={handleGearChange("lens")}
              placeholder="e.g., RF 24-70mm f/2.8"
            />
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">These fields may be pre-filled from your photo's EXIF data</p>
      </div>
    </div>
  );
}
