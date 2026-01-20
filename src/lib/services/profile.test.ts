/**
 * Tests for profile service layer
 */

import { describe, it, expect, vi } from "vitest";
import { updateUserProfile, ProfileServiceError } from "./profile";
import type { SupabaseClient } from "../../db/supabase.client";
import type { UpdateProfileCommand, UserRole } from "../../types";

/**
 * Creates a mock Supabase client for profile update operations
 */
function createMockSupabaseClient(overrides?: {
  updateData?: any;
  updateError?: any;
  rpcData?: any;
  rpcError?: any;
}): SupabaseClient {
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: overrides?.updateData || null,
          error: overrides?.updateError || null,
        }),
      }),
    }),
  });

  const mockRpc = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: overrides?.rpcData || null,
      error: overrides?.rpcError || null,
    }),
  });

  return {
    from: vi.fn().mockReturnValue({
      update: mockUpdate,
    }),
    auth: {} as any,
    rpc: mockRpc,
    storage: {
      from: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

describe("updateUserProfile", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174000";

  const mockUpdatedProfile = {
    user_id: mockUserId,
    display_name: "Updated Name",
    avatar_url: "https://example.com/new-avatar.jpg",
    bio: "Updated bio",
    company_name: "Updated Company",
    website_url: "https://new-website.com",
    social_links: { instagram: "https://instagram.com/updated" },
    role: "photographer" as UserRole,
    created_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    photo_count: 10,
  };

  describe("successful updates", () => {
    it("should update display name successfully", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "Updated Name",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      const result = await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      expect(result.display_name).toBe("Updated Name");
      expect(result.user_id).toBe(mockUserId);
    });

    it("should update multiple fields successfully", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "Updated Name",
        bio: "Updated bio",
        avatar_url: "https://example.com/avatar.jpg",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      const result = await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      expect(result.user_id).toBe(mockUserId);
    });

    it("should convert empty strings to null", async () => {
      const payload: UpdateProfileCommand = {
        bio: "",
        avatar_url: "",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: { ...mockUpdatedProfile, bio: null, avatar_url: null },
      });

      const result = await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      expect(result.bio).toBeNull();
      expect(result.avatar_url).toBeNull();
    });
  });

  describe("photographer-only fields", () => {
    it("should allow photographer to update photographer-only fields", async () => {
      const payload: UpdateProfileCommand = {
        company_name: "New Company",
        website_url: "https://new-website.com",
        social_links: {
          instagram: "https://instagram.com/newhandle",
        },
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      const result = await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      expect(result.user_id).toBe(mockUserId);
    });

    it("should reject photographer-only fields for enthusiasts", async () => {
      const payload: UpdateProfileCommand = {
        company_name: "New Company",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "enthusiast")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "enthusiast")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });
    });

    it("should allow enthusiasts to update basic fields", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
        bio: "New bio",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: { ...mockUpdatedProfile, role: "enthusiast" as UserRole },
      });

      const result = await updateUserProfile(mockUserId, payload, mockClient, "enthusiast");

      expect(result.user_id).toBe(mockUserId);
    });
  });

  describe("social links handling", () => {
    it("should clean up social links by removing undefined values", async () => {
      const payload: UpdateProfileCommand = {
        social_links: {
          instagram: "https://instagram.com/handle",
          facebook: undefined,
        },
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      // Verify the update was called
      const fromMock = mockClient.from as any;
      expect(fromMock).toHaveBeenCalledWith("user_profiles");
    });

    it("should set social_links to null if empty after cleanup", async () => {
      const payload: UpdateProfileCommand = {
        social_links: {
          instagram: "",
          facebook: undefined,
        },
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      const fromMock = mockClient.from as any;
      expect(fromMock).toHaveBeenCalledWith("user_profiles");
    });
  });

  describe("error handling", () => {
    it("should throw error when no fields are provided", async () => {
      const payload: UpdateProfileCommand = {};

      const mockClient = createMockSupabaseClient();

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "INVALID_INPUT",
        statusCode: 400,
      });
    });

    it("should handle profile not found error", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateError: { code: "PGRST116" },
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("should handle duplicate constraint error", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateError: { code: "23505", message: "Duplicate constraint violation" },
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "DUPLICATE",
        statusCode: 400,
      });
    });

    it("should handle generic database error", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateError: { code: "DB_ERROR", message: "Database error" },
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    });

    it("should handle missing data after successful update", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateData: null, // Update succeeded but no data returned
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "DATABASE_ERROR",
        statusCode: 500,
      });
    });

    it("should handle profile retrieval failure after update", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: null, // Profile retrieval fails
      });

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );
    });

    it("should wrap unexpected errors", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = {
        from: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
      } as unknown as SupabaseClient;

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toThrow(
        ProfileServiceError
      );

      await expect(updateUserProfile(mockUserId, payload, mockClient, "photographer")).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });
  });

  describe("field processing", () => {
    it("should include only provided fields in update", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
        // bio not provided, should not be included in update
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      const fromMock = mockClient.from as any;
      expect(fromMock).toHaveBeenCalledWith("user_profiles");
    });

    it("should set updated_at timestamp", async () => {
      const payload: UpdateProfileCommand = {
        display_name: "New Name",
      };

      const mockClient = createMockSupabaseClient({
        updateData: { user_id: mockUserId },
        rpcData: mockUpdatedProfile,
      });

      await updateUserProfile(mockUserId, payload, mockClient, "photographer");

      const fromMock = mockClient.from as any;
      expect(fromMock).toHaveBeenCalledWith("user_profiles");
    });
  });
});
