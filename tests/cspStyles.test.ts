import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { REVEAL_DELAYS, revealDelayClass } from '@/components/ui/motion';
import { CHART_BODY_HEIGHTS, chartBodyClass } from '@/components/ui/charts';

/**
 * Guards for `style-src` without 'unsafe-inline'.
 *
 * A `style=""` attribute in server-rendered markup is governed by style-src,
 * and a nonce cannot cover it — a nonce applies to `<style>` ELEMENTS, not
 * attributes. Since CSP3 ignores 'unsafe-inline' whenever a nonce is present,
 * one reintroduced inline style does not merely weaken the policy: it renders
 * unstyled, in production, on whichever page nobody checked.
 */

const SRC = path.resolve(__dirname, '../src');
const CSS = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(full) ? [full] : [];
  });
}

/** Source with comments stripped — the rule must not fire on prose about it. */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('no inline styles in server-rendered markup', () => {
  const files = walk(SRC);

  /**
   * The single exception, and it is load-bearing that it stays single.
   *
   * The chart tooltip is rendered by Recharts only while a pointer is over the
   * chart, so it never reaches server-rendered HTML; React applies styles on
   * the client through CSSOM, which CSP does not intercept. Verified by
   * hovering a real chart under the strict policy — zero violations.
   */
  const ALLOWED = [/components[\\/]ui[\\/]charts\.tsx$/];

  it('has at most one file using style={{}}, and it is the documented one', () => {
    const offenders = files
      .filter((f) => /style=\{\{/.test(codeOf(f)))
      .map((f) => f.replace(/.*[\\/]src[\\/]/, 'src/'));

    const unexpected = offenders.filter(
      (f) => !ALLOWED.some((re) => re.test(f.replace(/\//g, path.sep)))
    );
    expect(unexpected).toEqual([]);
  });

  it('keeps the exception to the client-only tooltip', () => {
    const charts = codeOf(path.join(SRC, 'components/ui/charts.tsx'));
    const uses = charts.match(/style=\{\{/g) ?? [];
    // One more here means something server-rendered picked up an inline style.
    expect(uses).toHaveLength(1);
    expect(charts).toMatch(/style=\{\{ backgroundColor: entry\.color \}\}/);
  });
});

describe('bounded value sets have a class for every value', () => {
  it.each(REVEAL_DELAYS)('reveal delay %ims', (delay) => {
    // A call site asking for an unmapped delay would silently lose its
    // stagger; this is what makes the constraint visible at build time.
    expect(revealDelayClass(delay)).toBe(`reveal-delay-${delay}`);
    expect(CSS).toContain(`.reveal-delay-${delay}`);
  });

  it.each(CHART_BODY_HEIGHTS)('chart body height %ipx', (height) => {
    expect(chartBodyClass(height)).toBe(`chart-body-${height}`);
    expect(CSS).toContain(`.chart-body-${height}`);
  });

  it('falls back rather than rendering unstyled', () => {
    // An unmapped height must still produce a sized chart, not a collapsed one.
    expect(chartBodyClass(999)).toBe('chart-body-280');
    expect(revealDelayClass(999)).toBe('');
  });

  it('covers every delay and height the components actually request', () => {
    const files = walk(SRC);
    const requested = new Set<string>();

    for (const file of files) {
      const code = codeOf(file);
      for (const m of code.matchAll(/delay=\{(\d+)\}/g)) requested.add(`delay:${m[1]}`);
      for (const m of code.matchAll(/height=\{(\d+)\}/g)) requested.add(`height:${m[1]}`);
    }

    const missing = [...requested].filter((r) => {
      const [kind, value] = r.split(':');
      const n = Number(value);
      return kind === 'delay'
        ? !(REVEAL_DELAYS as readonly number[]).includes(n)
        : !(CHART_BODY_HEIGHTS as readonly number[]).includes(n);
    });

    // Adding a call site with a new value is fine — but it has to come with a
    // class, or it degrades silently.
    expect(missing).toEqual([]);
  });
});

describe('the replacement classes exist', () => {
  it.each([
    'svg-defs-host',
    'brand-wash',
    'brand-wash-lg',
    'tracking-section',
    'sparkline-draw',
    'scroll-progress-bar',
    'voice-bar',
  ])('.%s is defined', (cls) => {
    expect(CSS).toContain(`.${cls}`);
  });
});
