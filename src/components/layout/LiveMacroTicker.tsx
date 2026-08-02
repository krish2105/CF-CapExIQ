'use client';

import React, { useState, useEffect } from 'react';
import { LiveMacroResponse } from '@/app/api/ai/live-macro/route';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Check } from 'lucide-react';

/**
 * Live macro tape.
 *
 * Restyled as a true ticker: a single hairline band above the header, using a
 * marquee track rather than a horizontally-scrolling flex row. The previous
 * version used an indigo gradient, which introduced a second brand colour —
 * this one is monochrome with copper punctuation, per the reference's
 * single-accent rule.
 */
export function LiveMacroTicker() {
  const [macroData, setMacroData] = useState<LiveMacroResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [justRefreshed, setJustRefreshed] = useState(false);

  const fetchMacro = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/live-macro');
      if (res.ok) {
        const data: LiveMacroResponse = await res.json();
        setMacroData(data);
        setLastRefreshed(
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMacro();
  }, []);

  // Pre-fetch placeholder. Typed as the real response so the component cannot
  // read a field the route does not send.
  const PLACEHOLDER: LiveMacroResponse = {
    lastUpdated: '—',
    isLive: false,
    provenance: 'Loading reference indicators…',
    macroSentiment: 'STABLE WACC ENVIRONMENT',
    indicators: [],
    aiBriefing: '',
  };

  const displayData: LiveMacroResponse = macroData ?? PLACEHOLDER;

  const toneClass = (sentiment: string) =>
    sentiment === 'positive'
      ? 'text-success'
      : sentiment === 'risk'
      ? 'text-destructive'
      : 'text-muted-foreground';

  const TrendIcon = ({ trend }: { trend: string }) =>
    trend === 'up' ? (
      <TrendingUp className="h-3 w-3" />
    ) : trend === 'down' ? (
      <TrendingDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  // Duplicated so the marquee loops seamlessly at -50%.
  const tape = [...displayData.indicators, ...displayData.indicators];

  return (
    <div className="w-full bg-surface border-b border-border select-none no-print">
      <div className="flex items-center gap-4 h-8 px-4 lg:px-6">
        {/* Status */}
        {/* Labelled "Reference", not "Live": these are hand-transcribed
            point-in-time values, not a market feed. The pulsing dot and the
            word "Live" previously implied a data connection that has never
            existed. */}
        <div
          className="flex items-center gap-2 shrink-0"
          title={displayData.provenance}
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-muted-foreground" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hidden sm:inline">
            GCC Macro Reference · as of {displayData.lastUpdated}
          </span>
          <span className="hidden lg:inline text-[10px] font-mono text-primary">
            {displayData.macroSentiment}
          </span>
        </div>

        <div className="h-3.5 w-px bg-border shrink-0 hidden sm:block" />

        {/* Marquee tape */}
        <div className="flex-1 min-w-0 overflow-hidden" aria-hidden="true">
          <div className="ticker-track gap-6">
            {tape.map((ind, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-mono"
              >
                <span className="text-muted-foreground">{ind.name}</span>
                <span className="text-foreground font-medium numeral">{ind.value}</span>
                <span className={`flex items-center gap-0.5 ${toneClass(ind.sentiment)}`}>
                  <TrendIcon trend={ind.trend} />
                  {ind.change}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Screen-reader accessible copy of the same data */}
        <ul className="sr-only">
          {displayData.indicators.map((ind, idx) => (
            <li key={idx}>{`${ind.name}: ${ind.value}, change ${ind.change}`}</li>
          ))}
        </ul>

        {/* Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {lastRefreshed && (
            <span className="text-[10px] text-muted-foreground font-mono hidden xl:inline">
              {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchMacro}
            disabled={loading}
            aria-label="Refresh live macro rates and DEWA tariffs"
            title="Refresh live macro rates and DEWA tariffs"
            className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] font-medium transition-colors ${
              justRefreshed
                ? 'border-success/40 text-success bg-success-soft'
                : 'border-border-strong text-muted-foreground hover:text-foreground hover:border-foreground'
            }`}
          >
            {justRefreshed ? (
              <>
                <Check className="h-3 w-3" /> Synced
              </>
            ) : (
              <>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
