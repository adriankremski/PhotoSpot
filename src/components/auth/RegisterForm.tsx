/**
 * RegisterForm component
 * Main registration form that collects credentials and role
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { RoleSelector } from "./RoleSelector";
import { PasswordInput } from "./PasswordInput";
import { useRegisterUser } from "./useRegisterUser";
import type { UserRole } from "@/types";

export function RegisterForm() {
  const { values, errors, loading, handleChange, handleSubmit } = useRegisterUser();

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Display form-level errors */}
      {errors.form && (
        <ErrorBanner
          error={{
            code: "VALIDATION_ERROR",
            message: errors.form,
          }}
        />
      )}

      {/* Email input */}
      <div>
        <label
          htmlFor="email"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
          className={`mt-2 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-2 text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password input with visibility toggle and tooltip */}
      <PasswordInput
        value={values.password}
        onChange={(value) => handleChange("password", value)}
        error={errors.password}
        disabled={loading}
      />

      {/* Role selector */}
      <RoleSelector value={values.role} onChange={(role: UserRole) => handleChange("role", role)} error={errors.role} />

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <span
              className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
