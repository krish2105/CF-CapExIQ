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
      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Application Encountered a Temporary Error</h2>
      <p className="text-xs text-muted-foreground max-w-md">
        {error?.message || 'An unexpected client runtime error occurred. Click below to recover the session.'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center gap-2 transition-all shadow-md"
      >
        <RefreshCw className="h-4 w-4" /> Reset Application Session
      </button>
    </div>
  );
}
