/**
 * Login form component with validation and error handling
 * Uses react-hook-form with Zod validation for inline field validation
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner, type LoginViewError } from "./ErrorBanner";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import type { LoginCommand, AuthResponse, ApiError } from "@/types";

interface LoginFormProps {
  onSuccess?: (resp: AuthResponse) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<LoginViewError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginInput) => {
    // Clear previous errors
    setApiError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data satisfies LoginCommand),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();

        // Map API errors to view errors
        const viewError = mapApiErrorToViewError(error, response.status);
        setApiError(viewError);

        // For rate limiting, disable form for 1 minute
        if (viewError.code === "RATE_LIMIT_EXCEEDED") {
          setTimeout(() => {
            setApiError(null);
          }, 60000);
        }

        return;
      }

      const authResponse: AuthResponse = await response.json();

      // Handle successful login
      if (onSuccess) {
        onSuccess(authResponse);
      } else {
        // Default redirect behavior
        const isOnboarded = authResponse.user.user_metadata?.onboarded === true;
        window.location.href = isOnboarded ? "/map" : "/onboarding";
      }
    } catch (error) {
      console.error("Login error:", error);
      setApiError({
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = () => {
    // Clear API errors when user starts typing
    if (apiError) {
      setApiError(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-lg border bg-card p-8 shadow-sm" data-test-id="login-form-card">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-card-foreground">Welcome Back</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <ErrorBanner error={apiError} data-test-id="login-error-banner" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-test-id="login-form">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              data-test-id="login-email-input"
              {...register("email", {
                onChange: handleFieldChange,
              })}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert" data-test-id="email-error-message">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="pr-10"
                data-test-id="login-password-input"
                {...register("password", {
                  onChange: handleFieldChange,
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-test-id="login-password-toggle"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="text-sm text-destructive"
                role="alert"
                data-test-id="password-error-message"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isSubmitting || apiError?.code === "RATE_LIMIT_EXCEEDED"}
            data-test-id="login-submit-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              data-test-id="login-register-link"
            >
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Maps API errors to view-specific error format
 */
function mapApiErrorToViewError(error: ApiError, status: number): LoginViewError {
  const errorMessage = error.error.message;

  switch (status) {
    case 400:
      return {
        code: "VALIDATION_ERROR",
        message: errorMessage || "Please check your input and try again.",
        details: error.error.details,
      };
    case 401:
      return {
        code: "UNAUTHORIZED",
        message: errorMessage || "Invalid email or password.",
      };
    case 429:
      return {
        code: "RATE_LIMIT_EXCEEDED",
        message: errorMessage || "Too many login attempts. Please try again later.",
      };
    default:
      return {
        code: "INTERNAL_ERROR",
        message: errorMessage || "An unexpected error occurred. Please try again.",
      };
  }
}
