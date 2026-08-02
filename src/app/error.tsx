'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js App Error caught:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="h-12 w-12 rounded-card bg-warning/10 border border-warning/30 flex items-center justify-center text-warning">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Application Encountered a Temporary Error</h2>
      <p className="text-xs text-muted-foreground max-w-md">
        {error?.message || 'An unexpected client runtime error occurred. Click below to recover the session.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-card bg-primary hover:opacity-90/90 text-primary-foreground text-xs font-bold flex items-center gap-2 transition-all"
      >
        <RefreshCw className="h-4 w-4" /> Reset Application Session
      </button>
    </div>
  );
}
