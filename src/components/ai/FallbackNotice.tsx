'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Declares that the panel below it is canned data, not analysis.
 *
 * The structured AI routes fall back to hard-coded constants whenever the
 * provider is unconfigured, unreachable or unparseable. Those constants carry
 * specific NPV figures, named board members and explicit verdicts, and they
 * used to render identically to a real generation. A reader had no way to
 * tell that "APPROVE WITH GATES, 2 approve / 2 conditional" was a literal in
 * the source rather than an evaluation of their model.
 *
 * Deliberately not a dismissible toast: the claim it qualifies stays on
 * screen, so the qualification has to as well.
 */
export function FallbackNotice({
  isFallback,
  reason,
  className,
}: {
  isFallback?: boolean;
  reason?: string;
  className?: string;
}) {
  if (!isFallback) return null;

  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-card border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 ${className ?? ''}`}
      data-no-reveal
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div className="min-w-0 text-xs leading-relaxed">
        <p className="font-semibold text-foreground">
          Illustrative values — not generated from your model
        </p>
        <p className="text-muted-foreground mt-0.5">
          The AI provider was unavailable
          {reason ? ` (${reason})` : ''}, so these are pre-set placeholder figures. Do not
          present them as analysis or cite them in a board paper.
        </p>
      </div>
    </div>
  );
}
