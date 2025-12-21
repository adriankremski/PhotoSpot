/**
 * Tests for profile validation schemas
 */

import { describe, it, expect } from 'vitest';
import { updateProfileSchema, validateProfileUpdate } from './profile';
import { ZodError } from 'zod';

describe('updateProfileSchema', () => {
  describe('display_name validation', () => {
    it('should accept valid display name', () => {
      const result = updateProfileSchema.parse({
        display_name: 'John Doe',
      });
      expect(result.display_name).toBe('John Doe');
    });

    it('should trim whitespace from display name', () => {
      const result = updateProfileSchema.parse({
        display_name: '  John Doe  ',
      });
      expect(result.display_name).toBe('John Doe');
    });

    it('should reject empty display name', () => {
      expect(() => {
        updateProfileSchema.parse({
          display_name: '',
        });
      }).toThrow(ZodError);
    });

    it('should reject display name that is too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => {
        updateProfileSchema.parse({
          display_name: longName,
        });
      }).toThrow(ZodError);
    });

    it('should accept display name at max length', () => {
      const maxName = 'a'.repeat(100);
      const result = updateProfileSchema.parse({
        display_name: maxName,
      });
      expect(result.display_name).toBe(maxName);
    });
  });

  describe('avatar_url validation', () => {
    it('should accept valid avatar URL', () => {
      const result = updateProfileSchema.parse({
        avatar_url: 'https://example.com/avatar.jpg',
      });
      expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should accept empty string for avatar URL', () => {
      const result = updateProfileSchema.parse({
        avatar_url: '',
      });
      expect(result.avatar_url).toBe('');
    });

    it('should reject invalid URL format', () => {
      expect(() => {
        updateProfileSchema.parse({
          avatar_url: 'not-a-url',
        });
      }).toThrow(ZodError);
    });
  });

  describe('bio validation', () => {
    it('should accept valid bio', () => {
      const result = updateProfileSchema.parse({
        bio: 'Professional photographer specializing in landscapes',
      });
      expect(result.bio).toBe('Professional photographer specializing in landscapes');
    });

    it('should accept empty string for bio', () => {
      const result = updateProfileSchema.parse({
        bio: '',
      });
      expect(result.bio).toBe('');
    });

    it('should reject bio that is too long', () => {
      const longBio = 'a'.repeat(501);
      expect(() => {
        updateProfileSchema.parse({
          bio: longBio,
        });
      }).toThrow(ZodError);
    });

    it('should accept bio at max length', () => {
      const maxBio = 'a'.repeat(500);
      const result = updateProfileSchema.parse({
        bio: maxBio,
      });
      expect(result.bio).toBe(maxBio);
    });
  });

  describe('company_name validation', () => {
    it('should accept valid company name', () => {
      const result = updateProfileSchema.parse({
        company_name: 'Doe Photography',
      });
      expect(result.company_name).toBe('Doe Photography');
    });

    it('should accept empty string for company name', () => {
      const result = updateProfileSchema.parse({
        company_name: '',
      });
      expect(result.company_name).toBe('');
    });

    it('should trim whitespace from company name', () => {
      const result = updateProfileSchema.parse({
        company_name: '  Doe Photography  ',
      });
      expect(result.company_name).toBe('Doe Photography');
    });

    it('should reject company name that is too long', () => {
      const longName = 'a'.repeat(101);
      expect(() => {
        updateProfileSchema.parse({
          company_name: longName,
        });
      }).toThrow(ZodError);
    });
  });

  describe('website_url validation', () => {
    it('should accept valid website URL', () => {
      const result = updateProfileSchema.parse({
        website_url: 'https://example.com',
      });
      expect(result.website_url).toBe('https://example.com');
    });

    it('should accept empty string for website URL', () => {
      const result = updateProfileSchema.parse({
        website_url: '',
      });
      expect(result.website_url).toBe('');
    });

    it('should reject invalid URL format', () => {
      expect(() => {
        updateProfileSchema.parse({
          website_url: 'not-a-url',
        });
      }).toThrow(ZodError);
    });
  });

  describe('social_links validation', () => {
    it('should accept valid social links', () => {
      const result = updateProfileSchema.parse({
        social_links: {
          instagram: 'https://instagram.com/johndoe',
          twitter: 'https://twitter.com/johndoe',
        },
      });
      expect(result.social_links).toEqual({
        instagram: 'https://instagram.com/johndoe',
        twitter: 'https://twitter.com/johndoe',
      });
    });

    it('should accept custom social links', () => {
      const result = updateProfileSchema.parse({
        social_links: {
          instagram: 'https://instagram.com/johndoe',
          tiktok: 'https://tiktok.com/@johndoe',
        },
      });
      expect(result.social_links).toEqual({
        instagram: 'https://instagram.com/johndoe',
        tiktok: 'https://tiktok.com/@johndoe',
      });
    });

    it('should reject invalid social link URLs', () => {
      expect(() => {
        updateProfileSchema.parse({
          social_links: {
            instagram: 'not-a-url',
          },
        });
      }).toThrow(ZodError);
    });
  });

  describe('strict mode validation', () => {
    it('should reject unknown fields', () => {
      expect(() => {
        updateProfileSchema.parse({
          display_name: 'John Doe',
          unknown_field: 'value',
        });
      }).toThrow(ZodError);
    });
  });

  describe('partial updates', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updateProfileSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept single field update', () => {
      const result = updateProfileSchema.parse({
        display_name: 'New Name',
      });
      expect(result).toEqual({
        display_name: 'New Name',
      });
    });

    it('should accept multiple field update', () => {
      const result = updateProfileSchema.parse({
        display_name: 'New Name',
        bio: 'New bio',
      });
      expect(result).toEqual({
        display_name: 'New Name',
        bio: 'New bio',
      });
    });
  });
});

describe('validateProfileUpdate', () => {
  describe('photographer role', () => {
    it('should allow all fields for photographers', () => {
      const input = {
        display_name: 'John Doe',
        bio: 'Photographer',
        company_name: 'Doe Photography',
        website_url: 'https://example.com',
        social_links: {
          instagram: 'https://instagram.com/johndoe',
        },
      };

      const result = validateProfileUpdate(input, 'photographer');
      expect(result).toEqual(input);
    });

    it('should allow partial updates for photographers', () => {
      const input = {
        company_name: 'New Company',
      };

      const result = validateProfileUpdate(input, 'photographer');
      expect(result).toEqual(input);
    });
  });

  describe('enthusiast role', () => {
    it('should allow basic fields for enthusiasts', () => {
      const input = {
        display_name: 'John Doe',
        bio: 'Photo enthusiast',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const result = validateProfileUpdate(input, 'enthusiast');
      expect(result).toEqual(input);
    });

    it('should reject company_name for enthusiasts', () => {
      const input = {
        display_name: 'John Doe',
        company_name: 'Company Name',
      };

      expect(() => {
        validateProfileUpdate(input, 'enthusiast');
      }).toThrow(ZodError);
    });

    it('should reject website_url for enthusiasts', () => {
      const input = {
        display_name: 'John Doe',
        website_url: 'https://example.com',
      };

      expect(() => {
        validateProfileUpdate(input, 'enthusiast');
      }).toThrow(ZodError);
    });

    it('should reject social_links for enthusiasts', () => {
      const input = {
        display_name: 'John Doe',
        social_links: {
          instagram: 'https://instagram.com/johndoe',
        },
      };

      expect(() => {
        validateProfileUpdate(input, 'enthusiast');
      }).toThrow(ZodError);
    });

    it('should provide clear error message for photographer-only fields', () => {
      const input = {
        company_name: 'Company Name',
      };

      try {
        validateProfileUpdate(input, 'enthusiast');
        expect.fail('Should have thrown an error');
      } catch (error) {
        if (error instanceof ZodError) {
          expect(error.errors[0].message).toContain('Only photographers');
        } else {
          throw error;
        }
      }
    });
  });

  describe('validation errors', () => {
    it('should throw ZodError for invalid data', () => {
      const input = {
        display_name: '', // Empty display name
      };

      expect(() => {
        validateProfileUpdate(input, 'photographer');
      }).toThrow(ZodError);
    });

    it('should throw ZodError for invalid URL', () => {
      const input = {
        website_url: 'not-a-url',
      };

      expect(() => {
        validateProfileUpdate(input, 'photographer');
      }).toThrow(ZodError);
    });
  });
});

