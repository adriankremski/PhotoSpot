/**
 * Authentication validation schemas using Zod
 *
 * These schemas validate incoming authentication requests to ensure
 * data integrity and security before processing.
 */

import { z } from "zod";

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 letter
 * - At least 1 number
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * User role validation schema
 */
const userRoleSchema = z.enum(["photographer", "enthusiast"], {
  errorMap: () => ({ message: 'Role must be either "photographer" or "enthusiast"' }),
});

/**
 * Register user request validation schema
 *
 * Accepts two formats for developer experience:
 * 1. Flat format: { email, password, role }
 * 2. Nested format: { email, password, options: { data: { role } } }
 */
export const registerUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    role: userRoleSchema.optional(),
    options: z
      .object({
        data: z
          .object({
            role: userRoleSchema,
          })
          .optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Ensure role is provided in either flat or nested format
      return data.role !== undefined || data.options?.data?.role !== undefined;
    },
    {
      message: 'Role must be provided either as "role" or "options.data.role"',
      path: ["role"],
    }
  );

/**
 * Login request validation schema
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Password reset request validation schema
 */
export const passwordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Type inference helpers
 */
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
