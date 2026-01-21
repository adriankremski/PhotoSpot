/**
 * Integration tests for GET /api/photos endpoint
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./index";
import type { SupabaseClient } from "../../../db/supabase.client";

/**
 * Helper to create a mock Astro APIContext
 */
function createMockContext(queryParams: Record<string, string>, supabaseClient: any) {
  const url = new URL("http://localhost/api/photos");
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    request: new Request(url.toString(), {
      method: "GET",
    }),
    locals: {
      supabase: supabaseClient,
    },
    params: {},
    url,
    redirect: vi.fn(),
    cookies: {} as any,
    clientAddress: "127.0.0.1",
    generator: "test",
    props: {},
    site: new URL("http://localhost"),
  };
}

/**
 * Helper to parse response
 */
async function parseResponse(response: Response) {
  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
  };
}

/**
 * Creates a mock Supabase client for photo retrieval operations
 */
function createMockSupabaseClient(overrides?: { queryData?: any[]; queryError?: any; count?: number }): SupabaseClient {
  const mockOrderResult = {
    data: overrides?.queryData || [],
    error: overrides?.queryError || null,
    count: overrides?.count ?? 0,
  };

  const mockOrder = vi.fn().mockResolvedValue(mockOrderResult);

  // Create a builder that can chain methods
  const createChainableBuilder = (): any => {
    const builder: any = {
      order: mockOrder,
    };

    builder.range = vi.fn().mockReturnValue(builder);
    builder.filter = vi.fn().mockReturnValue(builder);
    builder.eq = vi.fn().mockReturnValue(builder);
    builder.is = vi.fn().mockReturnValue(builder);

    return builder;
  };

  const mockSelect = vi.fn().mockImplementation(() => createChainableBuilder());

  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect,
    }),
    auth: {} as any,
    rpc: vi.fn().mockResolvedValue({
      data: overrides?.queryData || [],
      error: overrides?.queryError || null,
    }),
    storage: {
      from: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

/**
 * Creates a mock photo row from public_photos_v
 */
function createMockPhotoRow(overrides?: Partial<any>) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Beautiful Landscape",
    description: "A stunning view of the mountains",
    category: "landscape",
    season: "summer",
    time_of_day: "golden_hour_morning",
    file_url: "https://example.com/photo.jpg",
    location_public: JSON.stringify({
      type: "Point",
      coordinates: [-122.4, 37.8],
    }),
    user_id: "456e4567-e89b-12d3-a456-426614174001",
    author_name: "John Doe",
    author_avatar: "https://example.com/avatar.jpg",
    tags: ["nature", "mountains"],
    created_at: "2024-01-01T00:00:00Z",
    favorites_count: 42,
    cluster_id: null,
    ...overrides,
  };
}

describe("GET /api/photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests", () => {
    it("should return photos with default pagination", async () => {
      const mockPhotos = [createMockPhotoRow(), createMockPhotoRow({ id: "2" })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 2,
      });

      const context = createMockContext({}, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.meta).toMatchObject({
        total: 2,
        limit: 200,
        offset: 0,
        has_more: false,
      });
    });

    it("should return photo with correct structure", async () => {
      const mockPhoto = createMockPhotoRow();
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const context = createMockContext({}, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      const photo = data.data[0];
      expect(photo).toMatchObject({
        id: mockPhoto.id,
        title: mockPhoto.title,
        description: mockPhoto.description,
        category: mockPhoto.category,
        season: mockPhoto.season,
        time_of_day: mockPhoto.time_of_day,
        file_url: mockPhoto.file_url,
        user: {
          id: mockPhoto.user_id,
          display_name: mockPhoto.author_name,
          avatar_url: mockPhoto.author_avatar,
        },
        tags: mockPhoto.tags,
        favorite_count: mockPhoto.favorites_count,
      });
    });

    it("should handle custom limit and offset", async () => {
      const mockPhotos = Array.from({ length: 50 }, (_, i) => createMockPhotoRow({ id: `photo-${i}` }));
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 250,
      });

      const context = createMockContext({ limit: "50", offset: "100" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.meta).toMatchObject({
        total: 250,
        limit: 50,
        offset: 100,
        has_more: true,
      });
    });

    it("should handle empty results", async () => {
      const mockClient = createMockSupabaseClient({
        queryData: [],
        count: 0,
      });

      const context = createMockContext({}, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.meta.total).toBe(0);
    });
  });

  describe("filtering", () => {
    it("should accept valid bounding box", async () => {
      const mockPhotos = [createMockPhotoRow()];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext({ bbox: "-122.5,37.7,-122.3,37.9" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("should accept category filter", async () => {
      const mockPhotos = [createMockPhotoRow({ category: "landscape" })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext({ category: "landscape" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data[0].category).toBe("landscape");
    });

    it("should accept season filter", async () => {
      const mockPhotos = [createMockPhotoRow({ season: "summer" })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext({ season: "summer" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data[0].season).toBe("summer");
    });

    it("should accept time_of_day filter", async () => {
      const mockPhotos = [createMockPhotoRow({ time_of_day: "golden_hour_morning" })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext({ time_of_day: "golden_hour_morning" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data[0].time_of_day).toBe("golden_hour_morning");
    });

    it("should accept photographer_only filter", async () => {
      const mockPhotos = [createMockPhotoRow()];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext({ photographer_only: "true" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("should accept multiple filters", async () => {
      const mockPhotos = [
        createMockPhotoRow({
          category: "landscape",
          season: "summer",
          time_of_day: "golden_hour_morning",
        }),
      ];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const context = createMockContext(
        {
          bbox: "-122.5,37.7,-122.3,37.9",
          category: "landscape",
          season: "summer",
          time_of_day: "golden_hour_morning",
          limit: "50",
        },
        mockClient
      );
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toHaveLength(1);
    });
  });

  describe("validation errors", () => {
    it("should return 400 for invalid bounding box format", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ bbox: "invalid" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toBe("Invalid query parameters");
    });

    it("should return 400 for invalid category", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ category: "invalid_category" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for invalid season", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ season: "invalid_season" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for invalid time_of_day", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ time_of_day: "sunset" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for limit greater than 200", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ limit: "201" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for negative limit", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ limit: "-10" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for negative offset", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ offset: "-10" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for bbox with minLng >= maxLng", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ bbox: "-122.3,37.7,-122.5,37.9" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should return 400 for bbox with minLat >= maxLat", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext({ bbox: "-122.5,37.9,-122.3,37.7" }, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("error handling", () => {
    it("should return 500 for database errors", async () => {
      const mockClient = createMockSupabaseClient({
        queryError: { message: "Database connection failed" },
      });

      const context = createMockContext({}, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.code).toBe("DATABASE_ERROR");
      expect(data.error.message).toBe("Failed to retrieve photos from database");
    });

    it("should handle unexpected errors", async () => {
      const mockClient = {
        from: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
      } as unknown as SupabaseClient;

      const context = createMockContext({}, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
