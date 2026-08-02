import { useTheme } from 'next-themes';

/**
 * Chart colour resolution for the "Midnight Vault" system.
 *
 * Design note: the Slash reference forbids chromatic brand accents beyond
 * copper. That rule governs *branding*. It cannot govern *data encoding* —
 * NPV sign, decision status and risk severity are colour-coded across ~30
 * routes, and flattening them to monochrome would be a comprehension and
 * accessibility regression.
 *
 * The compromise: semantic colours survive, but are desaturated toward the
 * copper/sage/rust family so they read as ledger annotation rather than as
 * competing brand accents. Copper stays the primary series so the gilded
 * gradient remains the visual anchor.
 *
 * Values are duplicated from globals.css rather than read from the CSSOM
 * because Recharts needs concrete colour strings for SVG interpolation during
 * animation; `var(--x)` resolves inconsistently mid-tween in Recharts 2.
 */

export interface ThemeChartColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Copper — the anchor series. */
  primary: string;
  success: string;
  warning: string;
  danger: string;
  /** Cool neutral, replaces the old purple. */
  purple: string;
  neutral: string;
  /** Gilded gradient endpoints, for manual SVG defs. */
  gildStart: string;
  gildMid: string;
  gildEnd: string;
  /** Ordered categorical ramp for multi-series charts. */
  series: string[];
}

const DARK: ThemeChartColors = {
  grid: '#1c1d22',
  axis: '#777a88',
  tooltipBg: '#121317',
  tooltipBorder: '#2e3038',
  tooltipText: '#e2e3e9',
  primary: '#cc9166',
  success: '#7fae8b',
  warning: '#d2a862',
  danger: '#d0817a',
  purple: '#9aa4b8',
  neutral: '#5e616e',
  gildStart: '#ae9357',
  gildMid: '#fff0cc',
  gildEnd: '#bd9d4f',
  series: ['#cc9166', '#7fae8b', '#d2a862', '#9aa4b8', '#d0817a', '#acafb9'],
};

const LIGHT: ThemeChartColors = {
  grid: '#e4e0d9',
  axis: '#6b6862',
  tooltipBg: '#fffefc',
  tooltipBorder: '#cbc5bb',
  tooltipText: '#16151a',
  primary: '#965c28',
  success: '#3f7d55',
  warning: '#8c601b',
  danger: '#a63f3a',
  purple: '#5b5470',
  neutral: '#9b968e',
  gildStart: '#7e5a1f',
  gildMid: '#b3944a',
  gildEnd: '#8a6a2b',
  series: ['#965c28', '#3f7d55', '#8c601b', '#5b5470', '#a63f3a', '#6b6862'],
};

export function useThemeChartColors(): ThemeChartColors {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'light' ? LIGHT : DARK;
}

/** Non-hook access, for use outside React components. */
export function getChartColors(isDark: boolean): ThemeChartColors {
  return isDark ? DARK : LIGHT;
}

/** Colour a value by its sign — the most common encoding in this app. */
export function signColor(value: number, colors: ThemeChartColors): string {
  return value >= 0 ? colors.success : colors.danger;
}
