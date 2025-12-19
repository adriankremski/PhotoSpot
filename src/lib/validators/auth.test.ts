/**
 * Tests for authentication validation schemas
 */

import { describe, it, expect } from 'vitest';
import { registerUserSchema, loginSchema, passwordResetSchema } from './auth';

describe('registerUserSchema', () => {
  describe('valid inputs', () => {
    it('should validate correct registration data with flat role format', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
        expect(result.data.role).toBe('photographer');
      }
    });

    it('should validate correct registration data with nested role format', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            role: 'enthusiast' as const,
          },
        },
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options?.data?.role).toBe('enthusiast');
      }
    });

    it('should accept photographer role', () => {
      const input = {
        email: 'photographer@example.com',
        password: 'securePass1',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept enthusiast role', () => {
      const input = {
        email: 'enthusiast@example.com',
        password: 'securePass1',
        role: 'enthusiast' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept password with minimum requirements', () => {
      const input = {
        email: 'test@example.com',
        password: 'pass1234', // 8 chars, has letter and number
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept complex password', () => {
      const input = {
        email: 'test@example.com',
        password: 'MySecureP@ssw0rd123!',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid email', () => {
    it('should reject invalid email format', () => {
      const input = {
        email: 'not-an-email',
        password: 'password123',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('email');
        expect(result.error.errors[0].message).toContain('Invalid email');
      }
    });

    it('should reject empty email', () => {
      const input = {
        email: '',
        password: 'password123',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const input = {
        email: 'test@',
        password: 'password123',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid password', () => {
    it('should reject password shorter than 8 characters', () => {
      const input = {
        email: 'test@example.com',
        password: 'pass1',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('password');
        expect(result.error.errors[0].message).toContain('at least 8 characters');
      }
    });

    it('should reject password without letters', () => {
      const input = {
        email: 'test@example.com',
        password: '12345678',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.errors.find((e) => e.path.includes('password'));
        expect(passwordError?.message).toContain('at least one letter');
      }
    });

    it('should reject password without numbers', () => {
      const input = {
        email: 'test@example.com',
        password: 'passwordonly',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.errors.find((e) => e.path.includes('password'));
        expect(passwordError?.message).toContain('at least one number');
      }
    });

    it('should reject empty password', () => {
      const input = {
        email: 'test@example.com',
        password: '',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid role', () => {
    it('should reject invalid role value', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        role: 'admin',
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing role in both formats', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const roleError = result.error.errors.find((e) => e.path.includes('role'));
        expect(roleError?.message).toContain('Role must be provided');
      }
    });

    it('should reject empty role string', () => {
      const input = {
        email: 'test@example.com',
        password: 'password123',
        role: '',
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('missing fields', () => {
    it('should reject missing email', () => {
      const input = {
        password: 'password123',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const input = {
        email: 'test@example.com',
        role: 'photographer' as const,
      };

      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const input = {
      email: 'test@example.com',
      password: 'anypassword',
    };

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const input = {
      email: 'not-an-email',
      password: 'anypassword',
    };

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const input = {
      email: 'test@example.com',
      password: '',
    };

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const input = {};

    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('passwordResetSchema', () => {
  it('should validate correct email', () => {
    const input = {
      email: 'test@example.com',
    };

    const result = passwordResetSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const input = {
      email: 'not-an-email',
    };

    const result = passwordResetSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const input = {
      email: '',
    };

    const result = passwordResetSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing email', () => {
    const input = {};

    const result = passwordResetSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

