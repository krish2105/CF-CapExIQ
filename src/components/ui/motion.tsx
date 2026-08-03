'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ==========================================================================
   Motion primitives — CSS + IntersectionObserver baseline.

   These carry the whole app. framer-motion is layered only on the editorial
   register (landing, presentation) where choreography justifies the bundle.

   Every primitive short-circuits under prefers-reduced-motion: content
   renders immediately at its final state, no animation frames scheduled.
   ========================================================================== */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/* --------------------------------------------------------------------------
   Reveal — scroll-triggered entrance.
   -------------------------------------------------------------------------- */

type RevealVariant = 'up' | 'fade' | 'scale';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger offset in ms. Use index * 60 inside grids. */
  delay?: number;
  variant?: RevealVariant;
  className?: string;
  /** Render as a different element (default: div). */
  as?: 'div' | 'section' | 'li' | 'tr' | 'article' | 'header';
  /** Fraction of the element that must be visible before firing. */
  threshold?: number;
}

/**
 * Reveal delay as a class rather than an inline custom property.
 *
 * Setting `--reveal-delay` through `style={{}}` renders a `style=""` attribute
 * into the server HTML, which CSP `style-src` governs and a nonce cannot cover.
 * The call sites use a small, fixed set of delays, so the value fits in a class
 * — which is what allows 'unsafe-inline' to come off style-src.
 *
 * An unrecognised delay falls back to no stagger rather than losing the reveal
 * altogether, and `tests/cspStyles.test.ts` fails when a call site asks for one
 * that has no class.
 */
export const REVEAL_DELAYS = [80, 140, 500] as const;

export function revealDelayClass(delay: number): string {
  return (REVEAL_DELAYS as readonly number[]).includes(delay) ? `reveal-delay-${delay}` : '';
}

export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  className = '',
  as: Tag = 'div',
  threshold = 0.12,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    const node = ref.current;
    if (!node) return;

    // Already in view on mount (above the fold) — fire immediately.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced, threshold]);

  return (
    <Tag
      ref={ref as never}
      data-reveal={variant === 'up' ? '' : variant}
      data-revealed={revealed ? 'true' : 'false'}
      className={[revealDelayClass(delay), className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}

/* --------------------------------------------------------------------------
   CountUp — animated numerals for stat displays.

   Uses requestAnimationFrame with an ease-out cubic. Formatting is delegated
   so the same component drives AED, percentages, multiples, and years.
   -------------------------------------------------------------------------- */

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
  /** Delay before the count begins, to sync with a card's Reveal. */
  delay?: number;
}

export function CountUp({
  value,
  format = (n) => n.toFixed(0),
  durationMs = 1100,
  className = '',
  delay = 0,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const [pulsing, setPulsing] = useState(false);
  const reduced = usePrefersReducedMotion();
  const frameRef = useRef<number>();
  const fromRef = useRef(value);
  const mountedRef = useRef(false);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const easeOutCubic = useCallback((t: number) => 1 - Math.pow(1 - t, 3), []);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    // First paint counts up from zero; subsequent changes tween from the
    // previous value so scenario switches read as a transition, not a reset.
    const from = mountedRef.current ? fromRef.current : 0;
    const isUpdate = mountedRef.current && from !== value;
    mountedRef.current = true;

    // Brief highlight so a scenario/role switch reads as "this number just
    // moved," not a silent reflow — mirrors the numeral's own tween timing.
    if (isUpdate) {
      setPulsing(true);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setPulsing(false), durationMs + delay);
    }

    const start = performance.now() + delay;
    const delta = value - from;

    const tick = (now: number) => {
      if (now < start) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min((now - start) / durationMs, 1);
      setDisplay(from + delta * easeOutCubic(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs, delay, reduced, easeOutCubic]);

  useEffect(() => () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  }, []);

  return (
    <span
      className={`numeral ${pulsing ? 'numeral-pulse' : ''} ${className}`}
      suppressHydrationWarning
    >
      {format(display)}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Stagger — wraps a list of children, applying an incremental Reveal delay.
   -------------------------------------------------------------------------- */

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  step?: number;
  baseDelay?: number;
  variant?: RevealVariant;
}

export function Stagger({
  children,
  className = '',
  step = 60,
  baseDelay = 0,
  variant = 'up',
}: StaggerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) =>
        child == null ? child : (
          <Reveal delay={baseDelay + i * step} variant={variant}>
            {child}
          </Reveal>
        )
      )}
    </div>
  );
}
