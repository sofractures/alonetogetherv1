"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md p-8 border border-white/20 rounded-lg bg-black/80">
        <h2 className="text-xl font-semibold mb-4 text-[#e5ddc7] tracking-wide">
          Something went wrong
        </h2>
        <p className="text-[#e5ddc7]/70 mb-6 leading-relaxed">
          We encountered an unexpected error. Our team has been notified and is working on it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-white text-black rounded font-medium hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 border border-white/30 text-[#e5ddc7] rounded font-medium hover:bg-white/10 transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

