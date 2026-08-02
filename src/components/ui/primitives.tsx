'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CountUp, Reveal } from '@/components/ui/motion';

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Card — surface level 1. Hairline border, 10px radius, no drop shadow.
   The reference forbids shadows for elevation; depth comes from surface
   colour steps and 1px borders.
   ========================================================================== */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Adds the gilded hairline along the top edge. Use sparingly. */
  gilded?: boolean;
  /** Lifts 2px on hover. Only for cards that are clickable or link out. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  gilded = false,
  interactive = false,
  padding = 'md',
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'glass-panel overflow-hidden',
        gilded && 'panel-gilded',
        interactive && 'panel-lift cursor-pointer',
        PADDING[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   SectionHeading — the serif/sans collision, applied consistently.

   `register` controls which side of the two-register system this heading
   belongs to. Editorial goes large (44–64px serif); app stays restrained
   (24–28px) so dense pages keep their density.
   ========================================================================== */

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  register?: 'app' | 'editorial';
  align?: 'left' | 'center';
  className?: string;
  /**
   * Heading level. Defaults to h2 for in-page sections; PageHeader passes
   * h1 so every route has exactly one top-level heading (WCAG 1.3.1 — the
   * app previously shipped zero h1 elements and jumped h2 → h4).
   */
  as?: 'h1' | 'h2' | 'h3';
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  actions,
  register = 'app',
  align = 'left',
  className,
  as: Heading = 'h2',
}: SectionHeadingProps) {
  const isEditorial = register === 'editorial';

  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-5',
        align === 'left'
          ? 'sm:flex-row sm:items-end sm:justify-between'
          : 'items-center text-center',
        className
      )}
    >
      <div className={cn('min-w-0', align === 'center' && 'max-w-2xl')}>
        {eyebrow && (
          <p
            className={cn(
              'eyebrow mb-3 flex items-center gap-2',
              align === 'center' && 'justify-center'
            )}
          >
            {icon}
            {eyebrow}
          </p>
        )}
        <Heading
          className={cn(
            'font-display text-foreground',
            isEditorial
              ? 'text-[clamp(32px,5vw,64px)] leading-[1.08]'
              : 'text-[clamp(24px,2.4vw,32px)] leading-[1.15]'
          )}
          style={{ letterSpacing: '0.01em' }}
        >
          {title}
        </Heading>
        {description && (
          <p
            className={cn(
              'text-muted-foreground mt-3',
              isEditorial ? 'text-body-sm max-w-prose' : 'text-sm max-w-2xl',
              align === 'center' && 'mx-auto'
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ==========================================================================
   Stat — large numerical proof point.
   Serif numeral + Inter caption, per the reference's Stat Display component.
   ========================================================================== */

export type StatTone = 'default' | 'positive' | 'negative' | 'warning' | 'accent' | 'gilded';

const TONE_TEXT: Record<StatTone, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
  accent: 'text-primary',
  gilded: 'gilded-text',
};

interface StatProps {
  label: string;
  /** Pass a number to animate it; pass a string to render it as-is. */
  value: number | string;
  format?: (n: number) => string;
  caption?: React.ReactNode;
  tone?: StatTone;
  /** Serif numerals at 28px+. Off by default in dense grids. */
  serif?: boolean;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  className?: string;
}

const STAT_SIZE = {
  sm: 'text-[20px]',
  md: 'text-[28px]',
  lg: 'text-[clamp(32px,3.4vw,44px)]',
};

export function Stat({
  label,
  value,
  format,
  caption,
  tone = 'default',
  serif = false,
  size = 'md',
  delay = 0,
  className,
}: StatProps) {
  // Guardrail from the reference: serif never renders below 28px.
  const useSerif = serif && size !== 'sm';

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <p
        className={cn(
          'numeral leading-none',
          STAT_SIZE[size],
          useSerif ? 'font-display font-normal' : 'font-sans font-medium tracking-tight',
          TONE_TEXT[tone]
        )}
        suppressHydrationWarning
      >
        {typeof value === 'number' ? (
          <CountUp value={value} format={format} delay={delay} />
        ) : (
          value
        )}
      </p>
      {caption && (
        <span className="text-[11px] font-mono text-muted-foreground">{caption}</span>
      )}
    </div>
  );
}

/**
 * Stat wrapped in a Card — the metric grid unit.
 *
 * `metric-frame` draws copper corner brackets on hover (an instrument-panel
 * affordance rather than a generic shadow); `card-sheen` runs a slow gilded
 * pass and is reserved for the single gilded emphasis tile so the effect
 * stays an accent instead of becoming wallpaper.
 */
export function StatCard(props: StatProps & { gilded?: boolean }) {
  const { gilded, delay = 0, ...stat } = props;
  return (
    <Card
      gilded={gilded}
      padding="sm"
      className={cn('panel-lift metric-frame', gilded && 'card-sheen')}
    >
      <Stat {...stat} delay={delay} />
    </Card>
  );
}

/* ==========================================================================
   Badge — pill status indicator.
   ========================================================================== */

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'accent';

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'border-border-strong text-muted-foreground bg-transparent',
  positive: 'border-success/40 text-success bg-success-soft',
  negative: 'border-destructive/40 text-destructive bg-destructive-soft',
  warning: 'border-warning/40 text-warning bg-warning-soft',
  info: 'border-info/40 text-info bg-info-soft',
  accent: 'border-primary/40 text-primary bg-accent',
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className,
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        BADGE_TONE[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ==========================================================================
   Pill button / toggle group — used for scenario and period filters.
   ========================================================================== */

interface PillGroupProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
}

export function PillGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: PillGroupProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border border-border bg-muted/60 p-1',
        className
      )}
      role="group"
      aria-label={label}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              'rounded-pill px-3 py-1 text-xs font-medium transition-all duration-200',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Ledger table — hairline dividers, no card container, tabular numerals.
   ========================================================================== */

interface Column<T> {
  key: string;
  header: string;
  /** Right-align and use tabular numerals. */
  numeric?: boolean;
  render: (row: T, index: number) => React.ReactNode;
  width?: string;
}

interface LedgerTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption?: string;
  /** Staggered row entrance. Disable for tables over ~40 rows. */
  animate?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function LedgerTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  animate = true,
  className,
  emptyMessage = 'No records.',
}: LedgerTableProps<T>) {
  const shouldAnimate = animate && rows.length <= 40;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="ledger-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={col.numeric ? 'text-right' : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={shouldAnimate ? 'row-enter' : undefined}
                style={
                  shouldAnimate
                    ? ({ animationDelay: `${i * 28}ms` } as React.CSSProperties)
                    : undefined
                }
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.numeric ? 'num' : undefined}>
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================================================================
   Misc
   ========================================================================== */

export function GildedRule({ className }: { className?: string }) {
  return <div className={cn('gilded-rule w-full', className)} aria-hidden="true" />;
}

export function Eyebrow({
  children,
  muted = false,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <p className={cn('eyebrow', muted && 'eyebrow-muted', className)}>{children}</p>
  );
}

/** Page header for app-register routes. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Reveal variant="fade">
      <header className="border-b border-border pb-5 mb-6 page-enter">
        <SectionHeading
          eyebrow={eyebrow}
          icon={icon}
          title={title}
          description={description}
          actions={actions}
          register="app"
          className="pb-0"
          as="h1"
        />
      </header>
    </Reveal>
  );
}

export { CountUp, Reveal };
