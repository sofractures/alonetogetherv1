// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sampling rate for performance monitoring
  // 0.1 = 10% of transactions captured in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Disable in development by default
  enabled: process.env.NODE_ENV === "production",

  // Set environment
  environment: process.env.NODE_ENV,

  // Release tracking (set during build)
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter sensitive data from being sent to Sentry
  beforeSend(event) {
    // Remove any email addresses from the event
    if (event.user) {
      delete event.user.email;
    }
    
    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-auth-token'];
    }

    return event;
  },
});

