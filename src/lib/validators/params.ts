/**
 * URL parameter validation schemas using Zod
 * 
 * These schemas validate URL parameters (path params and query params)
 * to ensure data integrity before processing.
 */

import { z } from 'zod';

/**
 * Validates a userId path parameter as a valid UUID v4
 */
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

/**
 * Type inference helper
 */
export type UserIdParam = z.infer<typeof userIdParamSchema>;

