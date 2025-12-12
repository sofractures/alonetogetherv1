"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ 
        backgroundColor: '#000', 
        color: '#e5ddc7', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: '1rem',
      }}>
        <div style={{ 
          textAlign: 'center', 
          maxWidth: '500px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          backgroundColor: 'rgba(0,0,0,0.8)',
        }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            marginBottom: '1rem',
            letterSpacing: '0.05em',
          }}>
            Something went wrong
          </h1>
          <p style={{ 
            color: 'rgba(229, 221, 199, 0.7)', 
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            We&apos;re sorry, but something unexpected happened. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#fff',
              color: '#000',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

