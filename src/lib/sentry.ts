// Sentry utilities for error tracking
import * as Sentry from "@sentry/nextjs";

/**
 * Captures an API error with context
 */
export function captureApiError(
  error: unknown,
  context: {
    route: string;
    method: string;
    memoryId?: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  Sentry.withScope((scope) => {
    scope.setTag("api_route", context.route);
    scope.setTag("http_method", context.method);
    
    if (context.memoryId) {
      scope.setTag("memory_id", context.memoryId);
    }
    
    if (context.userId) {
      // Don't expose actual user ID, just note that there was one
      scope.setTag("has_user", "true");
    }
    
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    
    Sentry.captureException(errorObj);
  });
}

/**
 * Captures a processing error (audio processing failures)
 */
export function captureProcessingError(
  error: unknown,
  context: {
    memoryId?: string;
    stage: "upload" | "download" | "process" | "save";
    extra?: Record<string, unknown>;
  }
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  Sentry.withScope((scope) => {
    scope.setTag("error_type", "audio_processing");
    scope.setTag("processing_stage", context.stage);
    
    if (context.memoryId) {
      scope.setTag("memory_id", context.memoryId);
    }
    
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    
    Sentry.captureException(errorObj);
  });
}

/**
 * Captures a client-side error with user context
 */
export function captureClientError(
  error: unknown,
  context: {
    component?: string;
    action?: string;
    extra?: Record<string, unknown>;
  }
) {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  Sentry.withScope((scope) => {
    scope.setTag("error_type", "client");
    
    if (context.component) {
      scope.setTag("component", context.component);
    }
    
    if (context.action) {
      scope.setTag("action", context.action);
    }
    
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    
    Sentry.captureException(errorObj);
  });
}

/**
 * Sets user context for Sentry (without exposing email)
 */
export function setUserContext(userId?: string, emailHash?: string) {
  if (userId || emailHash) {
    Sentry.setUser({
      id: userId || emailHash,
    });
  }
}

/**
 * Clears user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Adds a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

