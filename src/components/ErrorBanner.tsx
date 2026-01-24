/**
 * Error banner component for displaying contextual error messages
 * Uses shadcn/ui Alert component with accessibility support
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export type LoginViewError =
  | { code: "UNAUTHORIZED"; message: string }
  | { code: "VALIDATION_ERROR"; message: string; details?: Record<string, unknown> }
  | { code: "RATE_LIMIT_EXCEEDED"; message: string }
  | { code: "INTERNAL_ERROR"; message: string };

interface ErrorBannerProps {
  error: LoginViewError | null;
  onClose?: () => void;
  "data-test-id"?: string;
}

export function ErrorBanner({ error, onClose, "data-test-id": dataTestId }: ErrorBannerProps) {
  if (!error) return null;

  const getErrorTitle = (code: string): string => {
    switch (code) {
      case "UNAUTHORIZED":
        return "Authentication Failed";
      case "VALIDATION_ERROR":
        return "Invalid Input";
      case "RATE_LIMIT_EXCEEDED":
        return "Too Many Attempts";
      case "INTERNAL_ERROR":
        return "Server Error";
      default:
        return "Error";
    }
  };

  return (
    <Alert variant="destructive" role="alert" className="mb-4" data-test-id={dataTestId}>
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertTitle data-test-id={dataTestId ? `${dataTestId}-title` : undefined}>
        {getErrorTitle(error.code)}
      </AlertTitle>
      <AlertDescription data-test-id={dataTestId ? `${dataTestId}-message` : undefined}>
        {error.message}
        {onClose && (
          <button onClick={onClose} className="ml-2 underline hover:no-underline" aria-label="Dismiss error">
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}
