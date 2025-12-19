/**
 * Integration tests for POST /api/auth/register endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './register';
import {
  createMockSupabaseClient,
  createMockAuthResponse,
  createMockErrorResponse,
  mockSupabaseErrors,
} from '../../../test/mocks/supabase';

/**
 * Helper to create a mock Astro APIContext
 */
function createMockContext(body: any, supabaseClient: any) {
  return {
    request: new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
    locals: {
      supabase: supabaseClient,
    },
    params: {},
    url: new URL('http://localhost/api/auth/register'),
    redirect: vi.fn(),
    cookies: {} as any,
    clientAddress: '127.0.0.1',
    generator: 'test',
    props: {},
    site: new URL('http://localhost'),
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

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful registration', () => {
    it('should register a photographer with flat role format', async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockAuthResponse({
          email: 'photographer@example.com',
          role: 'photographer',
        }),
      });

      const context = createMockContext(
        {
          email: 'photographer@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data).toMatchObject({
        user: {
          id: 'test-user-id',
          email: 'photographer@example.com',
          user_metadata: {
            role: 'photographer',
          },
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
        },
      });
    });

    it('should register an enthusiast with nested role format', async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockAuthResponse({
          email: 'enthusiast@example.com',
          role: 'enthusiast',
        }),
      });

      const context = createMockContext(
        {
          email: 'enthusiast@example.com',
          password: 'password123',
          options: {
            data: {
              role: 'enthusiast',
            },
          },
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.user.user_metadata.role).toBe('enthusiast');
    });

    it('should return proper Content-Type header', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('validation errors', () => {
    it('should return 400 for invalid email', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'not-an-email',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data).toMatchObject({
        error: 'Invalid input',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            message: expect.stringContaining('Invalid email'),
          }),
        ]),
      });
    });

    it('should return 400 for short password', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'short1',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data).toMatchObject({
        error: 'Invalid input',
        details: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            message: expect.stringContaining('at least 8 characters'),
          }),
        ]),
      });
    });

    it('should return 400 for password without letters', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: '12345678',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details.some((d: any) => d.message.includes('letter'))).toBe(true);
    });

    it('should return 400 for password without numbers', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'passwordonly',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details.some((d: any) => d.message.includes('number'))).toBe(true);
    });

    it('should return 400 for invalid role', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
          role: 'admin',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data).toMatchObject({
        error: 'Invalid input',
      });
    });

    it('should return 400 for missing role', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details.some((d: any) => d.message.includes('Role must be provided'))).toBe(true);
    });

    it('should return 400 for missing email', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for missing password', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should return 400 for invalid JSON', async () => {
      const mockClient = createMockSupabaseClient();

      const context = {
        request: new Request('http://localhost/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json{',
        }),
        locals: {
          supabase: mockClient,
        },
      };

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should return 400 for empty request body', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext({}, mockClient);

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('authentication errors', () => {
    it('should return 409 when email already exists', async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.userAlreadyExists),
      });

      const context = createMockContext(
        {
          email: 'existing@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(409);
      expect(data).toMatchObject({
        error: 'Email already registered',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    });

    it('should return 400 for weak password from Supabase', async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.weakPassword),
      });

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data).toMatchObject({
        code: 'weak_password',
      });
    });

    it('should return 429 when rate limit exceeded', async () => {
      const mockClient = createMockSupabaseClient({
        signUpResponse: createMockErrorResponse(mockSupabaseErrors.rateLimitExceeded),
      });

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(429);
      expect(data).toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
      });
    });
  });

  describe('server errors', () => {
    it('should return 500 with trace ID for unexpected errors', async () => {
      const mockClient = createMockSupabaseClient();
      mockClient.auth.signUp = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(500);
      expect(data).toMatchObject({
        error: 'An unexpected error occurred during registration',
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long email addresses', async () => {
      const mockClient = createMockSupabaseClient();
      const longEmail = 'a'.repeat(100) + '@example.com';

      const context = createMockContext(
        {
          email: longEmail,
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status } = await parseResponse(response);

      // Should either succeed or fail validation, but not crash
      expect([200, 400]).toContain(status);
    });

    it('should handle special characters in password', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'test@example.com',
          password: 'P@ssw0rd!#$%^&*()',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it('should handle unicode characters in email', async () => {
      const mockClient = createMockSupabaseClient();

      const context = createMockContext(
        {
          email: 'tëst@example.com',
          password: 'password123',
          role: 'photographer',
        },
        mockClient
      );

      const response = await POST(context as any);
      const { status } = await parseResponse(response);

      // Should either succeed or fail validation
      expect([200, 400]).toContain(status);
    });
  });
});

