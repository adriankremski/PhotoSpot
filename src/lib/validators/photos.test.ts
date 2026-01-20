/**
 * Tests for photo validation schemas
 */

import { describe, it, expect } from "vitest";
import { photoQueryParamsSchema } from "./photos";
import { ZodError } from "zod";

describe("photoQueryParamsSchema", () => {
  describe("valid inputs", () => {
    it("should accept empty query params with defaults", () => {
      const result = photoQueryParamsSchema.parse({});
      expect(result.limit).toBe(200);
      expect(result.offset).toBe(0);
      expect(result.bbox).toBeUndefined();
      expect(result.category).toBeUndefined();
      expect(result.season).toBeUndefined();
      expect(result.time_of_day).toBeUndefined();
      expect(result.photographer_only).toBeUndefined();
    });

    it("should accept valid limit and offset", () => {
      const result = photoQueryParamsSchema.parse({
        limit: "50",
        offset: "100",
      });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100);
    });

    it("should accept numeric limit and offset", () => {
      const result = photoQueryParamsSchema.parse({
        limit: 100,
        offset: 50,
      });
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(50);
    });
  });

  describe("bbox validation", () => {
    it("should accept valid bounding box", () => {
      const result = photoQueryParamsSchema.parse({
        bbox: "-122.5,37.7,-122.3,37.9",
      });
      expect(result.bbox).toEqual([-122.5, 37.7, -122.3, 37.9]);
    });

    it("should accept bbox with whitespace", () => {
      const result = photoQueryParamsSchema.parse({
        bbox: " -122.5 , 37.7 , -122.3 , 37.9 ",
      });
      expect(result.bbox).toEqual([-122.5, 37.7, -122.3, 37.9]);
    });

    it("should reject bbox with fewer than 4 values", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-122.5,37.7,-122.3",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox with more than 4 values", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-122.5,37.7,-122.3,37.9,1",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox with invalid longitude range", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-200.5,37.7,-122.3,37.9",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox with invalid latitude range", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-122.5,100.7,-122.3,37.9",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox where minLng >= maxLng", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-122.3,37.7,-122.5,37.9",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox where minLat >= maxLat", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "-122.5,37.9,-122.3,37.7",
        });
      }).toThrow(ZodError);
    });

    it("should reject bbox with non-numeric values", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          bbox: "invalid,37.7,-122.3,37.9",
        });
      }).toThrow(ZodError);
    });

    it("should accept bbox at valid coordinate boundaries", () => {
      const result = photoQueryParamsSchema.parse({
        bbox: "-180,-90,180,90",
      });
      expect(result.bbox).toEqual([-180, -90, 180, 90]);
    });
  });

  describe("category validation", () => {
    it("should accept valid category", () => {
      const result = photoQueryParamsSchema.parse({
        category: "landscape",
      });
      expect(result.category).toBe("landscape");
    });

    it("should accept all valid categories", () => {
      const validCategories = [
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

      for (const category of validCategories) {
        const result = photoQueryParamsSchema.parse({ category });
        expect(result.category).toBe(category);
      }
    });

    it("should reject invalid category", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          category: "invalid_category",
        });
      }).toThrow(ZodError);
    });
  });

  describe("season validation", () => {
    it("should accept valid season", () => {
      const result = photoQueryParamsSchema.parse({
        season: "summer",
      });
      expect(result.season).toBe("summer");
    });

    it("should accept all valid seasons", () => {
      const validSeasons = ["spring", "summer", "autumn", "winter"];

      for (const season of validSeasons) {
        const result = photoQueryParamsSchema.parse({ season });
        expect(result.season).toBe(season);
      }
    });

    it("should reject invalid season", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          season: "fall",
        });
      }).toThrow(ZodError);
    });
  });

  describe("time_of_day validation", () => {
    it("should accept valid time of day", () => {
      const result = photoQueryParamsSchema.parse({
        time_of_day: "golden_hour_morning",
      });
      expect(result.time_of_day).toBe("golden_hour_morning");
    });

    it("should accept all valid time of day values", () => {
      const validTimes = [
        "golden_hour_morning",
        "morning",
        "midday",
        "afternoon",
        "golden_hour_evening",
        "blue_hour",
        "night",
      ];

      for (const time of validTimes) {
        const result = photoQueryParamsSchema.parse({ time_of_day: time });
        expect(result.time_of_day).toBe(time);
      }
    });

    it("should reject invalid time of day", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          time_of_day: "sunset",
        });
      }).toThrow(ZodError);
    });
  });

  describe("photographer_only validation", () => {
    it("should accept boolean true", () => {
      const result = photoQueryParamsSchema.parse({
        photographer_only: true,
      });
      expect(result.photographer_only).toBe(true);
    });

    it("should accept boolean false", () => {
      const result = photoQueryParamsSchema.parse({
        photographer_only: false,
      });
      expect(result.photographer_only).toBe(false);
    });

    it('should accept string "true"', () => {
      const result = photoQueryParamsSchema.parse({
        photographer_only: "true",
      });
      expect(result.photographer_only).toBe(true);
    });

    it('should accept string "false"', () => {
      const result = photoQueryParamsSchema.parse({
        photographer_only: "false",
      });
      expect(result.photographer_only).toBe(false);
    });

    it("should return undefined for other string values", () => {
      const result = photoQueryParamsSchema.parse({
        photographer_only: "invalid",
      });
      expect(result.photographer_only).toBeUndefined();
    });
  });

  describe("limit validation", () => {
    it("should use default limit of 200 when not provided", () => {
      const result = photoQueryParamsSchema.parse({});
      expect(result.limit).toBe(200);
    });

    it("should accept limit within valid range", () => {
      const result = photoQueryParamsSchema.parse({
        limit: "50",
      });
      expect(result.limit).toBe(50);
    });

    it("should accept maximum limit of 200", () => {
      const result = photoQueryParamsSchema.parse({
        limit: "200",
      });
      expect(result.limit).toBe(200);
    });

    it("should reject limit greater than 200", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          limit: "201",
        });
      }).toThrow(ZodError);
    });

    it("should reject limit less than 1", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          limit: "0",
        });
      }).toThrow(ZodError);
    });

    it("should reject negative limit", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          limit: "-10",
        });
      }).toThrow(ZodError);
    });

    it("should use default when limit is not a number", () => {
      const result = photoQueryParamsSchema.parse({
        limit: "invalid",
      });
      expect(result.limit).toBe(200);
    });
  });

  describe("offset validation", () => {
    it("should use default offset of 0 when not provided", () => {
      const result = photoQueryParamsSchema.parse({});
      expect(result.offset).toBe(0);
    });

    it("should accept valid offset", () => {
      const result = photoQueryParamsSchema.parse({
        offset: "100",
      });
      expect(result.offset).toBe(100);
    });

    it("should accept offset of 0", () => {
      const result = photoQueryParamsSchema.parse({
        offset: "0",
      });
      expect(result.offset).toBe(0);
    });

    it("should reject negative offset", () => {
      expect(() => {
        photoQueryParamsSchema.parse({
          offset: "-10",
        });
      }).toThrow(ZodError);
    });

    it("should use default when offset is not a number", () => {
      const result = photoQueryParamsSchema.parse({
        offset: "invalid",
      });
      expect(result.offset).toBe(0);
    });
  });

  describe("combined filters", () => {
    it("should accept multiple valid filters", () => {
      const result = photoQueryParamsSchema.parse({
        bbox: "-122.5,37.7,-122.3,37.9",
        category: "landscape",
        season: "summer",
        time_of_day: "golden_hour_morning",
        photographer_only: "true",
        limit: "50",
        offset: "100",
      });

      expect(result).toEqual({
        bbox: [-122.5, 37.7, -122.3, 37.9],
        category: "landscape",
        season: "summer",
        time_of_day: "golden_hour_morning",
        photographer_only: true,
        limit: 50,
        offset: 100,
      });
    });

    it("should handle mix of valid and optional filters", () => {
      const result = photoQueryParamsSchema.parse({
        category: "wildlife",
        limit: "100",
      });

      expect(result.category).toBe("wildlife");
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
      expect(result.bbox).toBeUndefined();
      expect(result.season).toBeUndefined();
    });
  });
});
