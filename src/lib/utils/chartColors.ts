import { useTheme } from 'next-themes';

export interface ThemeChartColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  purple: string;
}

export function useThemeChartColors(): ThemeChartColors {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (isDark) {
    return {
      grid: '#1e293b',
      axis: '#94a3b8',
      tooltipBg: '#0f172a',
      tooltipBorder: '#334155',
      tooltipText: '#f8fafc',
      primary: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#f43f5e',
      purple: '#a855f7',
    };
  }

  return {
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltipBg: '#ffffff',
    tooltipBorder: '#cbd5e1',
    tooltipText: '#0f172a',
    primary: '#0284c7',
    success: '#059669',
    warning: '#d97706',
    danger: '#e11d48',
    purple: '#7c3aed',
  };
}
