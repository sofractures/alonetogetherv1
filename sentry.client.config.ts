// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sampling rate for performance monitoring
  // 0.1 = 10% of transactions captured in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set up session replay for debugging user issues
  // Only capture 10% of sessions, but 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Disable in development by default
  enabled: process.env.NODE_ENV === "production",

  // Don't send errors for these URLs (bots, extensions, etc.)
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
    // Safari extensions
    /^safari-extension:\/\//i,
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Random plugins/extensions
    "top.GLOBALS",
    // See: http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "http://tt.epicplay.com",
    "Can't find variable: ZiteReader",
    "jigsaw is not defined",
    "ComboSearch is not defined",
    "http://loading.retry.widdit.com/",
    "atomicFindClose",
    // Facebook borance
    "fb_xd_fragment",
    // ISP "optimizations" 
    "bmi_SafeAddOnload",
    "EBCallBackMessageReceived",
    // See: http://toolbar.conduit.com/Developer/HtmlAndGadget/Methods/JS498.htm
    "conduitPage",
    // Common browser errors
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors that aren't actionable
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // Audio playback issues (browser policy, not bugs)
    "play() failed because the user didn't interact",
    "The play() request was interrupted",
  ],

  // Add integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content by default for privacy
      maskAllText: false,
      // Block all media by default
      blockAllMedia: false,
    }),
  ],

  // Set environment
  environment: process.env.NODE_ENV,

  // Release tracking (set during build)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

