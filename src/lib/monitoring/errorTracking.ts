/**
 * Error Tracking and Monitoring Utilities
 *
 * Centralized error tracking for production monitoring.
 * Integrates with Sentry or similar services.
 */

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  FATAL = "fatal",
}

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Tracked error structure
 */
export interface TrackedError {
  message: string;
  severity: ErrorSeverity;
  error?: Error;
  context?: ErrorContext;
}

/**
 * Initialize error tracking
 *
 * In production, this would initialize Sentry or similar service.
 * Example:
 *
 * import * as Sentry from '@sentry/browser';
 *
 * Sentry.init({
 *   dsn: import.meta.env.PUBLIC_SENTRY_DSN,
 *   environment: import.meta.env.MODE,
 *   tracesSampleRate: 1.0,
 * });
 */
export function initErrorTracking(): void {
  if (import.meta.env.PROD) {
    // Initialize error tracking service in production
    console.log("[ErrorTracking] Initializing error tracking for production");

    // TODO: Initialize Sentry or other service
    // Sentry.init({ ... });
  } else {
    console.log("[ErrorTracking] Running in development mode - errors will be logged to console");
  }
}

/**
 * Track an error
 *
 * @param trackedError - Error to track
 */
export function trackError(trackedError: TrackedError): void {
  const { message, severity, error, context } = trackedError;

  // Add timestamp if not provided
  const fullContext: ErrorContext = {
    ...context,
    timestamp: context?.timestamp || new Date().toISOString(),
  };

  // In development, log to console
  if (import.meta.env.DEV) {
    console.error("[ErrorTracking]", {
      message,
      severity,
      error,
      context: fullContext,
    });
    return;
  }

  // In production, send to error tracking service
  try {
    // TODO: Send to Sentry or other service
    // Sentry.captureException(error || new Error(message), {
    //   level: severity as Sentry.SeverityLevel,
    //   contexts: { custom: fullContext },
    // });

    console.error("[ErrorTracking] Error tracked:", {
      message,
      severity,
      context: fullContext,
    });
  } catch (trackingError) {
    // Fail gracefully if error tracking itself fails
    console.error("[ErrorTracking] Failed to track error:", trackingError);
  }
}

/**
 * Track a warning
 *
 * @param message - Warning message
 * @param context - Optional context
 */
export function trackWarning(message: string, context?: ErrorContext): void {
  trackError({
    message,
    severity: ErrorSeverity.WARNING,
    context,
  });
}

/**
 * Track info event
 *
 * @param message - Info message
 * @param context - Optional context
 */
export function trackInfo(message: string, context?: ErrorContext): void {
  trackError({
    message,
    severity: ErrorSeverity.INFO,
    context,
  });
}

/**
 * Set user context for error tracking
 *
 * @param userId - User ID
 * @param email - User email (optional)
 */
export function setUserContext(userId: string, email?: string): void {
  if (import.meta.env.DEV) {
    console.log("[ErrorTracking] User context set:", { userId, email });
    return;
  }

  // TODO: Set user context in Sentry
  // Sentry.setUser({ id: userId, email });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (import.meta.env.DEV) {
    console.log("[ErrorTracking] User context cleared");
    return;
  }

  // TODO: Clear user context in Sentry
  // Sentry.setUser(null);
}

/**
 * Track performance metric
 *
 * @param metricName - Name of the metric
 * @param value - Metric value (e.g., duration in ms)
 * @param tags - Optional tags for categorization
 */
export function trackPerformance(metricName: string, value: number, tags?: Record<string, string>): void {
  if (import.meta.env.DEV) {
    console.log("[Performance]", { metricName, value, tags });
    return;
  }

  // TODO: Send to monitoring service
  // Sentry.metrics.distribution(metricName, value, { tags });
}

/**
 * Error boundary handler for React components
 *
 * @param error - Error that was caught
 * @param errorInfo - React error info
 */
export function handleComponentError(error: Error, errorInfo: { componentStack: string }): void {
  trackError({
    message: "React component error",
    severity: ErrorSeverity.ERROR,
    error,
    context: {
      component: errorInfo.componentStack.split("\n")[1]?.trim(),
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}

/**
 * Track API error
 *
 * @param endpoint - API endpoint
 * @param status - HTTP status code
 * @param message - Error message
 */
export function trackAPIError(endpoint: string, status: number, message: string): void {
  trackError({
    message: `API Error: ${endpoint}`,
    severity: status >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARNING,
    context: {
      action: "API_CALL",
      metadata: {
        endpoint,
        status,
        errorMessage: message,
      },
    },
  });
}

/**
 * Track map-specific errors
 *
 * @param action - Action that failed (e.g., 'load_photos', 'apply_filters')
 * @param error - Error object
 */
export function trackMapError(action: string, error: Error | string): void {
  trackError({
    message: `Map error: ${action}`,
    severity: ErrorSeverity.ERROR,
    error: typeof error === "string" ? new Error(error) : error,
    context: {
      component: "MapView",
      action,
    },
  });
}
