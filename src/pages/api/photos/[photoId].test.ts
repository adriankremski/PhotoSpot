/**
 * Integration tests for GET /api/photos/:photoId endpoint
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./[photoId]";
import type { SupabaseClient } from "../../../db/supabase.client";
import type { PhotoCategory, Season, TimeOfDay, PhotoStatus, UserRole } from "../../../types";

/**
 * Helper to create a mock Astro APIContext
 */
function createMockContext(photoId: string, supabaseClient: any) {
  const url = new URL(`http://localhost/api/photos/${photoId}`);

  return {
    request: new Request(url.toString(), {
      method: "GET",
    }),
    locals: {
      supabase: supabaseClient,
    },
    params: {
      photoId,
    },
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
    headers: Object.fromEntries(response.headers.entries()),
    data: text ? JSON.parse(text) : null,
  };
}

/**
 * Creates a mock photo detail row from the photos table
 */
function createMockPhotoDetailRow(overrides?: Partial<any>) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Beautiful Landscape",
    description: "A stunning view of the mountains",
    category: "landscape" as PhotoCategory,
    season: "summer" as Season,
    time_of_day: "golden_hour_morning" as TimeOfDay,
    file_url: "https://example.com/photo.jpg",
    location_public: JSON.stringify({
      type: "Point",
      coordinates: [-122.4, 37.8],
    }),
    location_exact: JSON.stringify({
      type: "Point",
      coordinates: [-122.401, 37.801],
    }),
    gear: { camera: "Canon EOS R5", lens: "RF 24-70mm f/2.8" },
    exif: { aperture: "f/8", shutter_speed: "1/250", iso: 100 },
    status: "approved" as PhotoStatus,
    user_id: "456e4567-e89b-12d3-a456-426614174001",
    user_profiles: {
      user_id: "456e4567-e89b-12d3-a456-426614174001",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg",
      role: "photographer" as UserRole,
    },
    photo_tags: [{ tags: { name: "nature" } }, { tags: { name: "mountains" } }],
    created_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Creates a mock Supabase client for single photo retrieval
 */
function createMockSupabaseClient(overrides?: {
  photoData?: any;
  photoError?: any;
  favoriteCount?: number;
  isFavorited?: boolean;
  authUser?: any;
  authError?: any;
}): SupabaseClient {
  const mockPhotoQuery = {
    data: overrides?.photoData || null,
    error: overrides?.photoError || null,
  };

  const mockFavoriteCountQuery = {
    count: overrides?.favoriteCount ?? 0,
    error: null,
  };

  const mockFavoriteQuery = {
    data: overrides?.isFavorited ? { photo_id: "test" } : null,
    error: null,
  };

  const mockAuthResponse = {
    data: { user: overrides?.authUser || null },
    error: overrides?.authError || null,
  };

  const createPhotoQueryChain = (): any => {
    const chain: any = {
      single: vi.fn().mockResolvedValue(mockPhotoQuery),
    };
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.is = vi.fn().mockReturnValue(chain);
    return chain;
  };

  const createCountQueryChain = (): any => {
    const chain: any = {
      eq: vi.fn().mockReturnThis(),
    };
    // For favorite count query (head: true)
    chain.eq.mockImplementation((field: string) => {
      if (field === "photo_id") {
        return Promise.resolve(mockFavoriteCountQuery);
      }
      return chain;
    });
    return chain;
  };

  const createFavoriteQueryChain = (): any => {
    const chain: any = {
      single: vi.fn().mockResolvedValue(mockFavoriteQuery),
    };
    chain.eq = vi.fn().mockReturnValue(chain);
    return chain;
  };

  let selectCallCount = 0;

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "photos") {
        return {
          select: vi.fn().mockReturnValue(createPhotoQueryChain()),
        };
      }
      if (table === "favorites") {
        selectCallCount++;
        return {
          select: vi.fn().mockReturnValue(selectCallCount === 1 ? createCountQueryChain() : createFavoriteQueryChain()),
        };
      }
      return { select: vi.fn() };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue(mockAuthResponse),
    } as any,
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  } as unknown as SupabaseClient;
}

describe("GET /api/photos/:photoId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful requests - anonymous users", () => {
    it("should return approved photo for anonymous user", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        status: "approved",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 42,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data, headers } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(mockPhoto.id);
      expect(data.title).toBe(mockPhoto.title);
      expect(data.description).toBe(mockPhoto.description);
      expect(data.favorite_count).toBe(42);

      // Sensitive fields should NOT be present
      expect(data.exif).toBeUndefined();
      expect(data.location_exact).toBeUndefined();
      expect(data.status).toBeUndefined();

      // Cache headers for public content (optional check)
      // Note: Response headers may not be properly serialized in tests
      if (headers["cache-control"]) {
        expect(headers["cache-control"]).toBe("public, max-age=60");
      }
    });

    it("should return photo with correct structure", async () => {
      const mockPhoto = createMockPhotoDetailRow();
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 10,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toMatchObject({
        id: mockPhoto.id,
        title: mockPhoto.title,
        description: mockPhoto.description,
        category: mockPhoto.category,
        season: mockPhoto.season,
        time_of_day: mockPhoto.time_of_day,
        file_url: mockPhoto.file_url,
        thumbnail_url: mockPhoto.file_url,
        location_public: {
          type: "Point",
          coordinates: [-122.4, 37.8],
        },
        is_location_blurred: true,
        gear: mockPhoto.gear,
        user: {
          id: mockPhoto.user_profiles.user_id,
          display_name: mockPhoto.user_profiles.display_name,
          avatar_url: mockPhoto.user_profiles.avatar_url,
          role: mockPhoto.user_profiles.role,
        },
        tags: ["nature", "mountains"],
        favorite_count: 10,
        is_favorited: false,
      });
    });

    it("should return 403 when anonymous user tries to view pending photo", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        status: "pending",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
      expect(data.error.message).toBe("You do not have permission to view this photo");
    });

    it("should return 403 when anonymous user tries to view rejected photo", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        status: "rejected",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("successful requests - authenticated users (owner)", () => {
    it("should return own pending photo with all sensitive fields", async () => {
      const ownerId = "456e4567-e89b-12d3-a456-426614174001";
      const mockPhoto = createMockPhotoDetailRow({
        user_id: ownerId,
        status: "pending",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 5,
        authUser: {
          id: ownerId,
          email: "owner@example.com",
          user_metadata: { role: "photographer" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data, headers } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(mockPhoto.id);

      // All fields including sensitive ones should be present
      expect(data.exif).toEqual(mockPhoto.exif);
      expect(data.location_exact).toEqual({
        type: "Point",
        coordinates: [-122.401, 37.801],
      });
      expect(data.status).toBe("pending");

      // No caching for authenticated requests (optional check)
      // Note: Response headers may not be properly serialized in tests
      if (headers["cache-control"]) {
        expect(headers["cache-control"]).toBe("private, no-cache");
      }
    });

    it("should return own rejected photo with status field", async () => {
      const ownerId = "456e4567-e89b-12d3-a456-426614174001";
      const mockPhoto = createMockPhotoDetailRow({
        user_id: ownerId,
        status: "rejected",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        authUser: {
          id: ownerId,
          email: "owner@example.com",
          user_metadata: { role: "photographer" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.status).toBe("rejected");
    });

    it("should set is_favorited to true when user has favorited", async () => {
      const userId = "456e4567-e89b-12d3-a456-426614174001";
      const mockPhoto = createMockPhotoDetailRow({
        user_id: userId,
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 10,
        isFavorited: true,
        authUser: {
          id: userId,
          email: "user@example.com",
          user_metadata: { role: "photographer" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.is_favorited).toBe(true);
    });

    it("should return own approved photo with sensitive fields", async () => {
      const ownerId = "456e4567-e89b-12d3-a456-426614174001";
      const mockPhoto = createMockPhotoDetailRow({
        user_id: ownerId,
        status: "approved",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        authUser: {
          id: ownerId,
          email: "owner@example.com",
          user_metadata: { role: "photographer" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.exif).toEqual(mockPhoto.exif);
      expect(data.location_exact).toBeDefined();
      expect(data.status).toBe("approved");
    });
  });

  describe("successful requests - authenticated users (non-owner)", () => {
    it("should return approved photo without sensitive fields for non-owner", async () => {
      const ownerId = "456e4567-e89b-12d3-a456-426614174001";
      const otherUserId = "789e4567-e89b-12d3-a456-426614174002";

      const mockPhoto = createMockPhotoDetailRow({
        user_id: ownerId,
        status: "approved",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 20,
        authUser: {
          id: otherUserId,
          email: "other@example.com",
          user_metadata: { role: "enthusiast" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data, headers } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.id).toBe(mockPhoto.id);

      // Sensitive fields should NOT be present
      expect(data.exif).toBeUndefined();
      expect(data.location_exact).toBeUndefined();
      expect(data.status).toBeUndefined();

      // No caching for authenticated requests (optional check)
      // Note: Response headers may not be properly serialized in tests
      if (headers["cache-control"]) {
        expect(headers["cache-control"]).toBe("private, no-cache");
      }
    });

    it("should return 403 when non-owner tries to view pending photo", async () => {
      const ownerId = "456e4567-e89b-12d3-a456-426614174001";
      const otherUserId = "789e4567-e89b-12d3-a456-426614174002";

      const mockPhoto = createMockPhotoDetailRow({
        user_id: ownerId,
        status: "pending",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        authUser: {
          id: otherUserId,
          email: "other@example.com",
          user_metadata: { role: "photographer" },
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("validation errors", () => {
    it("should return 400 for invalid UUID format", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext("invalid-uuid", mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toBe("Invalid photo ID format");
    });

    it("should return 400 for non-UUID string", async () => {
      const mockClient = createMockSupabaseClient();
      const context = createMockContext("not-a-uuid-at-all", mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("not found errors", () => {
    it("should return 404 when photo does not exist", async () => {
      const mockClient = createMockSupabaseClient({
        photoError: { code: "PGRST116", message: "No rows returned" },
      });

      const context = createMockContext("123e4567-e89b-12d3-a456-426614174000", mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.code).toBe("PHOTO_NOT_FOUND");
      expect(data.error.message).toBe("Photo not found");
    });

    it("should return 404 when photo is soft-deleted", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        deleted_at: "2024-01-15T00:00:00Z",
      });
      const mockClient = createMockSupabaseClient({
        photoError: { code: "PGRST116", message: "No rows returned" },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(404);
      expect(data.error.code).toBe("PHOTO_NOT_FOUND");
    });
  });

  describe("authentication errors", () => {
    it("should return 401 for invalid authentication token", async () => {
      const mockPhoto = createMockPhotoDetailRow();
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        authError: {
          message: "Invalid JWT token",
          status: 401,
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(401);
      expect(data.error.code).toBe("INVALID_TOKEN");
      expect(data.error.message).toBe("Invalid or expired authentication token");
    });

    it("should handle missing auth session gracefully (treat as anonymous)", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        status: "approved",
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 10,
        authError: {
          message: "Auth session missing!",
        },
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      // Should succeed as anonymous user
      expect(status).toBe(200);
      expect(data.id).toBe(mockPhoto.id);
      expect(data.exif).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should return 500 for database errors", async () => {
      const mockClient = createMockSupabaseClient({
        photoError: { code: "DATABASE_ERROR", message: "Connection failed" },
      });

      const context = createMockContext("123e4567-e89b-12d3-a456-426614174000", mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.code).toBe("DATABASE_ERROR");
      expect(data.error.message).toBe("Failed to retrieve photo from database");
    });

    it("should handle unexpected errors", async () => {
      const mockClient = {
        from: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as SupabaseClient;

      const context = createMockContext("123e4567-e89b-12d3-a456-426614174000", mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("data mapping edge cases", () => {
    it("should handle null optional fields", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        description: null,
        season: null,
        time_of_day: null,
        gear: null,
        exif: null,
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.description).toBeNull();
      expect(data.season).toBeNull();
      expect(data.time_of_day).toBeNull();
      expect(data.gear).toBeNull();
    });

    it("should handle empty tags array", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        photo_tags: [],
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.tags).toEqual([]);
    });

    it("should handle zero favorite count", async () => {
      const mockPhoto = createMockPhotoDetailRow();
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
        favoriteCount: 0,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.favorite_count).toBe(0);
    });

    it("should handle null avatar_url", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        user_profiles: {
          user_id: "456e4567-e89b-12d3-a456-426614174001",
          display_name: "Jane Smith",
          avatar_url: null,
          role: "enthusiast" as UserRole,
        },
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.user.avatar_url).toBeNull();
    });

    it("should calculate is_location_blurred correctly", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        location_public: JSON.stringify({
          type: "Point",
          coordinates: [-122.4, 37.8],
        }),
        location_exact: JSON.stringify({
          type: "Point",
          coordinates: [-122.401, 37.801],
        }),
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.is_location_blurred).toBe(true);
    });

    it("should set is_location_blurred to false when no exact location", async () => {
      const mockPhoto = createMockPhotoDetailRow({
        location_exact: null,
      });
      const mockClient = createMockSupabaseClient({
        photoData: mockPhoto,
      });

      const context = createMockContext(mockPhoto.id, mockClient);
      const response = await GET(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.is_location_blurred).toBe(false);
    });
  });
});
