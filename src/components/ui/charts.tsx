'use client';

import React from 'react';
import { Card, cn } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/motion';

/* ==========================================================================
   Chart theming.

   The reference reserves the gilded gradient exclusively for data
   visualisation — it is the only place chromatic energy is permitted. These
   helpers make that gradient available as SVG defs that Recharts can
   reference by URL, plus themed axis/tooltip/grid props so all 27
   ResponsiveContainers in the app share one visual language.
   ========================================================================== */

export const GRADIENT_IDS = {
  gildedStroke: 'capex-gilded-stroke',
  gildedArea: 'capex-gilded-area',
  copperArea: 'capex-copper-area',
  successArea: 'capex-success-area',
  destructiveArea: 'capex-destructive-area',
  gildedBar: 'capex-gilded-bar',
  infoBar: 'capex-info-bar',
} as const;

/**
 * Drop this once inside any Recharts chart to make every gradient available.
 * Recharts hoists <defs> correctly when rendered as a chart child.
 */
export function ChartGradients() {
  return (
    <defs>
      {/* Gilded stroke — the 103deg gold-to-cream sweep from the reference,
          expressed as an SVG linearGradient (103deg ≈ x1/y1 → x2/y2 below). */}
      <linearGradient id={GRADIENT_IDS.gildedStroke} x1="0" y1="0" x2="1" y2="0.25">
        <stop offset="0%" stopColor="#ae9357" />
        <stop offset="40%" stopColor="#fff0cc" />
        <stop offset="70%" stopColor="#ae9357" />
        <stop offset="100%" stopColor="#bd9d4f" />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.gildedArea} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cc9166" stopOpacity={0.32} />
        <stop offset="55%" stopColor="#ae9357" stopOpacity={0.1} />
        <stop offset="100%" stopColor="#ae9357" stopOpacity={0} />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.copperArea} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.successArea} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.28} />
        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.destructiveArea} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.28} />
        <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.gildedBar} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0bb84" />
        <stop offset="100%" stopColor="#ae9357" />
      </linearGradient>

      <linearGradient id={GRADIENT_IDS.infoBar} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.95} />
        <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.5} />
      </linearGradient>
    </defs>
  );
}

export const gild = (id: keyof typeof GRADIENT_IDS) => `url(#${GRADIENT_IDS[id]})`;

/* --------------------------------------------------------------------------
   Shared Recharts prop bundles. Spread these rather than re-specifying
   stroke/fill on every chart — keeps 27 chart instances consistent.
   -------------------------------------------------------------------------- */

export const axisProps = {
  stroke: 'var(--chart-axis)',
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'var(--border)' },
} as const;

export const gridProps = {
  stroke: 'var(--chart-grid)',
  strokeDasharray: '2 6',
  vertical: false,
} as const;

export const tooltipProps = {
  cursor: { fill: 'var(--muted)', fillOpacity: 0.5 },
  contentStyle: {
    backgroundColor: 'var(--chart-tooltip)',
    border: '1px solid var(--border-strong)',
    borderRadius: '10px',
    color: 'var(--chart-tooltip-foreground)',
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
    boxShadow: 'none',
    padding: '10px 12px',
  },
  labelStyle: {
    color: 'var(--muted-foreground)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
  },
  itemStyle: {
    color: 'var(--chart-tooltip-foreground)',
    fontSize: '12px',
    padding: '1px 0',
  },
} as const;

export const legendProps = {
  wrapperStyle: {
    fontSize: '12px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--muted-foreground)',
    paddingTop: '8px',
  },
  iconType: 'circle' as const,
  iconSize: 7,
};

/** Recharts mount animation, tuned to match the CSS reveal easing. */
export const animProps = {
  isAnimationActive: true,
  animationDuration: 1200,
  animationEasing: 'ease-out' as const,
};

/* --------------------------------------------------------------------------
   ChartCard — consistent frame for every visualisation in the app.
   -------------------------------------------------------------------------- */

/**
 * Chart body height as a class rather than an inline style.
 *
 * `style={{ height }}` renders a `style=""` attribute into the server HTML,
 * which CSP `style-src` governs and a nonce cannot cover — a nonce applies to
 * <style> elements, not attributes. Expressing the height as one of a bounded
 * set of classes is what allows 'unsafe-inline' to come off style-src.
 *
 * An unmapped height falls back to the default rather than rendering
 * unstyled, and `tests/cspStyles.test.ts` fails when a call site asks for one
 * that has no class — so the constraint is enforced at build time instead of
 * discovered as a squashed chart.
 */
export const CHART_BODY_HEIGHTS = [232, 272, 280] as const;

export function chartBodyClass(height: number): string {
  return (CHART_BODY_HEIGHTS as readonly number[]).includes(height)
    ? `chart-body-${height}`
    : 'chart-body-280';
}

interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
  children: React.ReactNode;

  /** Chart body height in px. */
  height?: number;
  gilded?: boolean;
  delay?: number;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  actions,
  footnote,
  children,
  height = 280,
  gilded = false,
  delay = 0,
  className,
}: ChartCardProps) {
  return (
    <Reveal delay={delay} className={className}>
      <Card gilded={gilded} padding="none" className="h-full">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h4 className="text-[15px] font-medium text-foreground tracking-tight">{title}</h4>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        <div className={`px-2 pb-2 ${chartBodyClass(height)}`}>
          {children}
        </div>

        {footnote && (
          <div className="border-t border-border px-5 py-2.5">
            <p className="text-[11px] text-muted-foreground font-mono">{footnote}</p>
          </div>
        )}
      </Card>
    </Reveal>
  );
}

/* --------------------------------------------------------------------------
   Custom tooltip — used where the default needs richer formatting.
   -------------------------------------------------------------------------- */

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function LedgerTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatter?: (value: number | string, name: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-card border border-border-strong bg-popover px-3 py-2.5 min-w-[150px]">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {/*
                The one inline style left, and deliberately so.
                
                This tooltip is rendered by Recharts only while a pointer is
                over the chart, so it never appears in server-rendered markup.
                React applies styles on the client through CSSOM
                (`node.style.setProperty`), which CSP does not intercept — only
                a `style` attribute parsed from HTML is governed by style-src.
                
                The colour comes from Recharts' own series resolution rather
                than a palette this code owns, so a class map would have to
                mirror an upstream decision and would silently mis-colour a
                swatch whenever that changed. Verified against the strict
                policy in e2e/csp.spec.ts by hovering a real chart.
              */}
              <span
                className="h-1.5 w-1.5 rounded-pill shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="numeral font-medium text-popover-foreground">
              {formatter && entry.value !== undefined
                ? formatter(entry.value, String(entry.name ?? ''))
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Sparkline — inline micro-chart for stat cards. Pure SVG, no Recharts.
   -------------------------------------------------------------------------- */

export function Sparkline({
  data,
  width = 96,
  height = 28,
  tone = 'gilded',
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  tone?: 'gilded' | 'success' | 'destructive' | 'muted';
  className?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const stroke =
    tone === 'gilded'
      ? gild('gildedStroke')
      : tone === 'success'
      ? 'var(--chart-2)'
      : tone === 'destructive'
      ? 'var(--chart-5)'
      : 'var(--muted-foreground)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      {tone === 'gilded' && <ChartGradients />}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
className="sparkline-draw"
      />
    </svg>
  );
}
