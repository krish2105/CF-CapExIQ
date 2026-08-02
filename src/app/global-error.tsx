'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-destructive">System Recoverable Error</h2>
          <p className="text-xs text-card-foreground">
            {error?.message || 'A global error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-card bg-info hover:bg-info text-white text-xs font-bold transition-all"
          >
            Reload CapExIQ Session
          </button>
        </div>
      </body>
    </html>
  );
}
