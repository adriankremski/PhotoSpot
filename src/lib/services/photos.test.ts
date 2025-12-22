/**
 * Tests for photos service layer
 */

import { describe, it, expect, vi } from 'vitest';
import { getPublicPhotos, PhotoServiceError } from './photos';
import type { SupabaseClient } from '../../db/supabase.client';
import type { PhotoCategory, Season, TimeOfDay } from '../../types';

/**
 * Creates a mock Supabase client for photo retrieval operations
 */
function createMockSupabaseClient(overrides?: {
  queryData?: any[];
  queryError?: any;
  count?: number;
}): SupabaseClient {
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
    rpc: vi.fn(),
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
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Beautiful Landscape',
    description: 'A stunning view of the mountains',
    category: 'landscape' as PhotoCategory,
    season: 'summer' as Season,
    time_of_day: 'golden_hour_morning' as TimeOfDay,
    file_url: 'https://example.com/photo.jpg',
    location_public: JSON.stringify({
      type: 'Point',
      coordinates: [-122.4, 37.8],
    }),
    user_id: '456e4567-e89b-12d3-a456-426614174001',
    author_name: 'John Doe',
    author_avatar: 'https://example.com/avatar.jpg',
    tags: ['nature', 'mountains'],
    created_at: '2024-01-01T00:00:00Z',
    favorites_count: 42,
    cluster_id: null,
    ...overrides,
  };
}

describe('getPublicPhotos', () => {
  describe('successful queries', () => {
    it('should retrieve photos with default pagination', async () => {
      const mockPhotos = [createMockPhotoRow(), createMockPhotoRow({ id: '2' })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 2,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.limit).toBe(200);
      expect(result.meta.offset).toBe(0);
      expect(result.meta.has_more).toBe(false);
    });

    it('should map photo data correctly', async () => {
      const mockPhoto = createMockPhotoRow();
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      const photo = result.data[0];
      expect(photo.id).toBe(mockPhoto.id);
      expect(photo.title).toBe(mockPhoto.title);
      expect(photo.description).toBe(mockPhoto.description);
      expect(photo.category).toBe(mockPhoto.category);
      expect(photo.season).toBe(mockPhoto.season);
      expect(photo.time_of_day).toBe(mockPhoto.time_of_day);
      expect(photo.file_url).toBe(mockPhoto.file_url);
      expect(photo.user.id).toBe(mockPhoto.user_id);
      expect(photo.user.display_name).toBe(mockPhoto.author_name);
      expect(photo.user.avatar_url).toBe(mockPhoto.author_avatar);
      expect(photo.tags).toEqual(mockPhoto.tags);
      expect(photo.favorite_count).toBe(mockPhoto.favorites_count);
    });

    it('should handle pagination correctly', async () => {
      const mockPhotos = Array.from({ length: 50 }, (_, i) => 
        createMockPhotoRow({ id: `photo-${i}` })
      );
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 250, // Total 250 photos
      });

      const result = await getPublicPhotos(
        { limit: 50, offset: 0 },
        mockClient
      );

      expect(result.data).toHaveLength(50);
      expect(result.meta.total).toBe(250);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.offset).toBe(0);
      expect(result.meta.has_more).toBe(true);
    });

    it('should handle last page of pagination', async () => {
      const mockPhotos = Array.from({ length: 50 }, (_, i) => 
        createMockPhotoRow({ id: `photo-${i}` })
      );
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 250, // Total 250 photos
      });

      const result = await getPublicPhotos(
        { limit: 50, offset: 200 },
        mockClient
      );

      expect(result.data).toHaveLength(50);
      expect(result.meta.total).toBe(250);
      expect(result.meta.offset).toBe(200);
      expect(result.meta.has_more).toBe(false);
    });

    it('should handle empty results', async () => {
      const mockClient = createMockSupabaseClient({
        queryData: [],
        count: 0,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.has_more).toBe(false);
    });
  });

  describe('filtering', () => {
    it('should accept bbox filter', async () => {
      const mockPhotos = [createMockPhotoRow()];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const result = await getPublicPhotos(
        {
          bbox: [-122.5, 37.7, -122.3, 37.9],
          limit: 200,
          offset: 0,
        },
        mockClient
      );

      expect(result.data).toHaveLength(1);
    });

    it('should accept category filter', async () => {
      const mockPhotos = [createMockPhotoRow({ category: 'landscape' })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const result = await getPublicPhotos(
        {
          category: 'landscape' as PhotoCategory,
          limit: 200,
          offset: 0,
        },
        mockClient
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].category).toBe('landscape');
    });

    it('should accept season filter', async () => {
      const mockPhotos = [createMockPhotoRow({ season: 'summer' })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const result = await getPublicPhotos(
        {
          season: 'summer' as Season,
          limit: 200,
          offset: 0,
        },
        mockClient
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].season).toBe('summer');
    });

    it('should accept time_of_day filter', async () => {
      const mockPhotos = [createMockPhotoRow({ time_of_day: 'golden_hour_morning' })];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const result = await getPublicPhotos(
        {
          time_of_day: 'golden_hour_morning' as TimeOfDay,
          limit: 200,
          offset: 0,
        },
        mockClient
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].time_of_day).toBe('golden_hour_morning');
    });

    it('should accept multiple filters', async () => {
      const mockPhotos = [
        createMockPhotoRow({
          category: 'landscape',
          season: 'summer',
          time_of_day: 'golden_hour_morning',
        }),
      ];
      const mockClient = createMockSupabaseClient({
        queryData: mockPhotos,
        count: 1,
      });

      const result = await getPublicPhotos(
        {
          bbox: [-122.5, 37.7, -122.3, 37.9],
          category: 'landscape' as PhotoCategory,
          season: 'summer' as Season,
          time_of_day: 'golden_hour_morning' as TimeOfDay,
          limit: 50,
          offset: 0,
        },
        mockClient
      );

      expect(result.data).toHaveLength(1);
    });
  });

  describe('data mapping edge cases', () => {
    it('should handle null description', async () => {
      const mockPhoto = createMockPhotoRow({ description: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].description).toBeNull();
    });

    it('should handle null season', async () => {
      const mockPhoto = createMockPhotoRow({ season: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].season).toBeNull();
    });

    it('should handle null time_of_day', async () => {
      const mockPhoto = createMockPhotoRow({ time_of_day: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].time_of_day).toBeNull();
    });

    it('should handle null cluster_id', async () => {
      const mockPhoto = createMockPhotoRow({ cluster_id: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].cluster_id).toBeNull();
    });

    it('should handle empty tags array', async () => {
      const mockPhoto = createMockPhotoRow({ tags: [] });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].tags).toEqual([]);
    });

    it('should handle null avatar_url', async () => {
      const mockPhoto = createMockPhotoRow({ author_avatar: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].user.avatar_url).toBeNull();
    });

    it('should fallback to "Unknown" for null author_name', async () => {
      const mockPhoto = createMockPhotoRow({ author_name: null });
      const mockClient = createMockSupabaseClient({
        queryData: [mockPhoto],
        count: 1,
      });

      const result = await getPublicPhotos(
        { limit: 200, offset: 0 },
        mockClient
      );

      expect(result.data[0].user.display_name).toBe('Unknown');
    });
  });

  describe('error handling', () => {
    it('should throw PhotoServiceError on database error', async () => {
      const mockClient = createMockSupabaseClient({
        queryError: { message: 'Database connection failed' },
      });

      await expect(
        getPublicPhotos({ limit: 200, offset: 0 }, mockClient)
      ).rejects.toThrow(PhotoServiceError);
    });

    it('should include error details in PhotoServiceError', async () => {
      const mockClient = createMockSupabaseClient({
        queryError: { message: 'Database connection failed' },
      });

      try {
        await getPublicPhotos({ limit: 200, offset: 0 }, mockClient);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(PhotoServiceError);
        if (error instanceof PhotoServiceError) {
          expect(error.code).toBe('DATABASE_ERROR');
          expect(error.statusCode).toBe(500);
          expect(error.details?.supabaseError).toBe('Database connection failed');
        }
      }
    });

    it('should handle unexpected errors', async () => {
      const mockClient = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      } as unknown as SupabaseClient;

      await expect(
        getPublicPhotos({ limit: 200, offset: 0 }, mockClient)
      ).rejects.toThrow(PhotoServiceError);
    });
  });
});

