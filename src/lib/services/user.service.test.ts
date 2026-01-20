/**
 * Tests for user service layer
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getUserProfile, UserServiceError } from "./user.service";
import type { SupabaseClient } from "../../db/supabase.client";
import type { UserRole } from "../../types";

/**
 * Creates a mock Supabase client for user profile RPC queries
 */
function createMockSupabaseClientForProfile(overrides?: { rpcData?: any; rpcError?: any }): SupabaseClient {
  const mockRpc = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: overrides?.rpcData || null,
      error: overrides?.rpcError || null,
    }),
  });

  return {
    from: vi.fn(),
    auth: {} as any,
    rpc: mockRpc,
    storage: {
      from: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

describe("getUserProfile", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockCurrentUserId = "123e4567-e89b-12d3-a456-426614174001";

  // Mock RPC response data (combines profile, user, and photo count)
  const mockRpcData = {
    user_id: mockUserId,
    display_name: "John Doe",
    avatar_url: "https://example.com/avatar.jpg",
    bio: "Professional photographer",
    company_name: "Doe Photography",
    website_url: "https://doephoto.com",
    social_links: {
      instagram: "@johndoe",
      twitter: "@johndoe",
    },
    role: "photographer" as UserRole,
    created_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    photo_count: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful retrieval", () => {
    it("should return full profile for owner viewing their own profile", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: mockRpcData,
      });

      const result = await getUserProfile(mockClient, mockUserId, mockUserId);

      expect(result).toEqual({
        user_id: mockUserId,
        display_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Professional photographer",
        role: "photographer",
        company_name: "Doe Photography",
        website_url: "https://doephoto.com",
        social_links: {
          instagram: "@johndoe",
          twitter: "@johndoe",
        },
        photo_count: 5,
        created_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should return full profile for others viewing photographer profile", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: mockRpcData,
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toEqual({
        user_id: mockUserId,
        display_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Professional photographer",
        role: "photographer",
        company_name: "Doe Photography",
        website_url: "https://doephoto.com",
        social_links: {
          instagram: "@johndoe",
          twitter: "@johndoe",
        },
        photo_count: 5,
        created_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should return limited profile for others viewing enthusiast profile", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: {
          ...mockRpcData,
          role: "enthusiast" as UserRole,
          company_name: "Should not be visible",
          website_url: "https://should-not-be-visible.com",
          photo_count: 3,
        },
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toEqual({
        user_id: mockUserId,
        display_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        bio: "Professional photographer",
        role: "enthusiast",
        photo_count: 3,
        created_at: "2024-01-01T00:00:00Z",
      });

      // Verify photographer-only fields are not included
      expect(result).not.toHaveProperty("company_name");
      expect(result).not.toHaveProperty("website_url");
      expect(result).not.toHaveProperty("social_links");
    });

    it("should work with null optional fields", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: {
          user_id: mockUserId,
          display_name: "Jane Doe",
          avatar_url: null,
          bio: null,
          company_name: null,
          website_url: null,
          social_links: null,
          role: "photographer" as UserRole,
          created_at: "2024-01-01T00:00:00Z",
          deleted_at: null,
          photo_count: 0,
        },
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toEqual({
        user_id: mockUserId,
        display_name: "Jane Doe",
        avatar_url: null,
        bio: null,
        role: "photographer",
        company_name: null,
        website_url: null,
        social_links: null,
        photo_count: 0,
        created_at: "2024-01-01T00:00:00Z",
      });
    });

    it("should work when not authenticated (null currentUserId)", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: mockRpcData,
      });

      const result = await getUserProfile(mockClient, mockUserId, null);

      expect(result).toBeTruthy();
      expect(result?.user_id).toBe(mockUserId);
    });
  });

  describe("user not found scenarios", () => {
    it("should return null when profile not found", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: null,
        rpcError: { code: "PGRST116", message: "No rows returned" },
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toBeNull();
    });

    it("should return null when user is soft-deleted", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: {
          ...mockRpcData,
          deleted_at: "2024-06-01T00:00:00Z",
        },
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toBeNull();
    });

    it("should return null when user data not found", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: null,
        rpcError: null,
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should throw UserServiceError on RPC query failure", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: null,
        rpcError: {
          code: "DATABASE_ERROR",
          message: "Connection failed",
        },
      });

      await expect(getUserProfile(mockClient, mockUserId, mockCurrentUserId)).rejects.toThrow(UserServiceError);

      await expect(getUserProfile(mockClient, mockUserId, mockCurrentUserId)).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        statusCode: 500,
        message: "Failed to fetch user profile",
      });
    });

    it("should handle database errors gracefully", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: null,
        rpcError: {
          code: "CONNECTION_ERROR",
          message: "Database connection failed",
        },
      });

      await expect(getUserProfile(mockClient, mockUserId, mockCurrentUserId)).rejects.toThrow(UserServiceError);

      await expect(getUserProfile(mockClient, mockUserId, mockCurrentUserId)).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        statusCode: 500,
        message: "Failed to fetch user profile",
      });
    });

    it("should return profile with photo count from RPC", async () => {
      const mockClient = createMockSupabaseClientForProfile({
        rpcData: {
          ...mockRpcData,
          photo_count: 10,
        },
      });

      const result = await getUserProfile(mockClient, mockUserId, mockCurrentUserId);

      expect(result).toBeTruthy();
      expect(result?.user_id).toBe(mockUserId);
      expect(result?.photo_count).toBe(10);
    });
  });
});
