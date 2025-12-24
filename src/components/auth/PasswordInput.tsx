/**
 * PasswordInput component with visibility toggle
 * Includes password rules tooltip
 */

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PasswordRulesTooltip } from './PasswordRulesTooltip';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  error,
  id = 'password',
  name = 'password',
  placeholder = 'Enter your password',
  autoComplete = 'new-password',
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Password
        </label>
        <PasswordRulesTooltip />
      </div>

      <div className="relative mt-2">
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

