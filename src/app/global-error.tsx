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
      <body className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4 max-w-md">
          <h2 className="text-xl font-bold text-rose-400">System Recoverable Error</h2>
          <p className="text-xs text-slate-300">
            {error?.message || 'A global error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            Reload CapExIQ Session
          </button>
        </div>
      </body>
    </html>
  );
}
