/**
 * Tests for User Profile API endpoints
 * 
 * Covers:
 * - GET /api/users/:userId/profile (existing)
 * - PATCH /api/users/:userId/profile (new)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './profile';
import type { APIContext } from 'astro';
import type { UpdateProfileResponse, UserProfileDto, UserRole } from '../../../../types';

// Mock the validators and services
vi.mock('../../../../lib/validators/params', () => ({
  userIdParamSchema: {
    parse: vi.fn(),
  },
}));

vi.mock('../../../../lib/validators/profile', () => ({
  validateProfileUpdate: vi.fn(),
}));

vi.mock('../../../../lib/services/user.service', () => ({
  getUserProfile: vi.fn(),
  UserServiceError: class UserServiceError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'UserServiceError';
    }
  },
}));

vi.mock('../../../../lib/services/profile', () => ({
  updateUserProfile: vi.fn(),
  ProfileServiceError: class ProfileServiceError extends Error {
    constructor(
      message: string,
      public code: string,
      public statusCode: number,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'ProfileServiceError';
    }
  },
}));

import { userIdParamSchema } from '../../../../lib/validators/params';
import { validateProfileUpdate } from '../../../../lib/validators/profile';
import { updateUserProfile, ProfileServiceError } from '../../../../lib/services/profile';
import { ZodError } from 'zod';

describe('PATCH /api/users/:userId/profile', () => {
  let mockContext: Partial<APIContext>;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockOtherUserId = '123e4567-e89b-12d3-a456-426614174001';

  const mockUpdatedProfile: UserProfileDto = {
    user_id: mockUserId,
    display_name: 'Updated Name',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Updated bio',
    role: 'photographer' as UserRole,
    company_name: 'Updated Company',
    website_url: 'https://updated.com',
    social_links: { instagram: 'https://instagram.com/updated' },
    photo_count: 10,
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockContext = {
      params: {
        userId: mockUserId,
      },
      request: new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'Test' }),
      }),
      locals: {
        supabase: {
          auth: {
            getUser: vi.fn().mockResolvedValue({
              data: {
                user: {
                  id: mockUserId,
                  email: 'test@example.com',
                  user_metadata: {
                    role: 'photographer',
                  },
                },
              },
              error: null,
            }),
          },
        } as any,
      },
    };

    // Default mock implementations
    (userIdParamSchema.parse as any).mockImplementation((params: any) => params);
    (validateProfileUpdate as any).mockImplementation((data: any) => data);
  });

  describe('Successful updates', () => {
    it('should return 200 with updated profile on successful update', async () => {
      const requestBody = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
      };

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      const response = await PATCH(mockContext as APIContext);
      const data = (await response.json()) as UpdateProfileResponse;

      expect(response.status).toBe(200);
      expect(data.message).toBe('Profile updated successfully');
      expect(data.profile).toEqual(mockUpdatedProfile);
    });

    it('should call validateProfileUpdate with correct role', async () => {
      const requestBody = {
        display_name: 'Updated Name',
      };

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      await PATCH(mockContext as APIContext);

      expect(validateProfileUpdate).toHaveBeenCalledWith(requestBody, 'photographer');
    });

    it('should call updateUserProfile with correct parameters', async () => {
      const requestBody = {
        display_name: 'Updated Name',
        bio: 'Updated bio',
      };

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      await PATCH(mockContext as APIContext);

      expect(updateUserProfile).toHaveBeenCalledWith(
        mockUserId,
        requestBody,
        mockContext.locals?.supabase,
        'photographer'
      );
    });

    it('should handle enthusiast role correctly', async () => {
      const requestBody = {
        display_name: 'Updated Name',
      };

      mockContext.locals!.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            user_metadata: {
              role: 'enthusiast',
            },
          },
        },
        error: null,
      });

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      await PATCH(mockContext as APIContext);

      expect(validateProfileUpdate).toHaveBeenCalledWith(requestBody, 'enthusiast');
    });

    it('should default to enthusiast role if role not in metadata', async () => {
      const requestBody = {
        display_name: 'Updated Name',
      };

      mockContext.locals!.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
            user_metadata: {},
          },
        },
        error: null,
      });

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      await PATCH(mockContext as APIContext);

      expect(validateProfileUpdate).toHaveBeenCalledWith(requestBody, 'enthusiast');
    });
  });

  describe('Authentication errors', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockContext.locals!.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('unauthorized');
      expect(data.error.message).toBe('Authentication required');
    });

    it('should return 401 when auth returns error', async () => {
      mockContext.locals!.supabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      const response = await PATCH(mockContext as APIContext);

      expect(response.status).toBe(401);
    });
  });

  describe('Authorization errors', () => {
    it('should return 403 when user tries to update another user\'s profile', async () => {
      mockContext.params!.userId = mockOtherUserId;

      mockContext.request = new Request('http://localhost/api/users/' + mockOtherUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('forbidden');
      expect(data.error.message).toBe('You can only update your own profile');
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when userId parameter is invalid', async () => {
      (userIdParamSchema.parse as any).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['userId'],
            message: 'Invalid UUID format',
          },
        ]);
      });

      mockContext.request = new Request('http://localhost/api/users/invalid-id/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('validation_error');
      expect(data.error.details.issues).toHaveLength(1);
    });

    it('should return 400 when request body is invalid JSON', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('invalid_json');
      expect(data.error.message).toBe('Invalid JSON in request body');
    });

    it('should return 400 when profile update validation fails', async () => {
      (validateProfileUpdate as any).mockImplementation(() => {
        throw new ZodError([
          {
            code: 'too_small',
            minimum: 1,
            type: 'string',
            inclusive: true,
            exact: false,
            path: ['display_name'],
            message: 'Display name is required',
          },
        ]);
      });

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: '' }),
      });

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('validation_error');
      expect(data.error.message).toBe('Invalid request data');
    });
  });

  describe('Profile service errors', () => {
    it('should return 404 when profile is not found', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      (updateUserProfile as any).mockRejectedValue(
        new ProfileServiceError('User profile not found', 'NOT_FOUND', 404)
      );

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('not_found');
    });

    it('should return 403 when enthusiast tries to update photographer-only fields', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: 'Company' }),
      });

      (updateUserProfile as any).mockRejectedValue(
        new ProfileServiceError(
          'Only photographers can update company_name, website_url, and social_links',
          'FORBIDDEN',
          403
        )
      );

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('forbidden');
    });

    it('should return 400 when no valid fields are provided', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      (updateUserProfile as any).mockRejectedValue(
        new ProfileServiceError('No valid fields provided for update', 'INVALID_INPUT', 400)
      );

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('invalid_input');
    });

    it('should return 500 on database error', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      (updateUserProfile as any).mockRejectedValue(
        new ProfileServiceError('Failed to update user profile', 'DATABASE_ERROR', 500)
      );

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('database_error');
    });
  });

  describe('Unexpected errors', () => {
    it('should return 500 on unexpected error', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: 'New Name' }),
      });

      (updateUserProfile as any).mockRejectedValue(new Error('Unexpected error'));

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('internal_error');
      expect(data.error.message).toBe('Internal server error');
      expect(data.error.details).toHaveProperty('traceId');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty request body', async () => {
      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      (validateProfileUpdate as any).mockReturnValue({});
      (updateUserProfile as any).mockRejectedValue(
        new ProfileServiceError('No valid fields provided for update', 'INVALID_INPUT', 400)
      );

      const response = await PATCH(mockContext as APIContext);

      expect(response.status).toBe(400);
    });

    it('should handle partial updates correctly', async () => {
      const requestBody = {
        bio: 'Updated bio only',
      };

      mockContext.request = new Request('http://localhost/api/users/' + mockUserId + '/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      (updateUserProfile as any).mockResolvedValue(mockUpdatedProfile);

      const response = await PATCH(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.profile).toEqual(mockUpdatedProfile);
    });
  });
});

