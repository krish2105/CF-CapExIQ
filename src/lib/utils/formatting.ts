export function formatAED(value: number, decimals: number = 0): string {
  if (isNaN(value) || value === null) return 'AED 0';
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return formatter.format(value).replace('AED', 'AED ');
}

export function formatPercent(decimalValue: number | null, decimals: number = 2): string {
  if (decimalValue === null || isNaN(decimalValue)) return 'N/A';
  return (decimalValue * 100).toFixed(decimals) + '%';
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Status colouring for the "Midnight Vault" palette.
 *
 * These map onto the semantic tokens rather than raw Tailwind palette classes,
 * so they follow both themes automatically and stay inside the desaturated
 * sage/copper/rust family instead of reintroducing saturated brand colours.
 *
 * Colour is never the sole signal — every consumer pairs these with an icon
 * and a text label, which is what keeps the encoding WCAG 1.4.1 compliant.
 */
export function getDecisionBadgeColor(
  status: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject'
): string {
  switch (status) {
    case 'Approve':
      return 'bg-success-soft text-success border-success/40 font-semibold';
    case 'Phased Implementation':
      return 'bg-accent text-primary border-primary/40 font-semibold';
    case 'Delay Pending Evidence':
      return 'bg-warning-soft text-warning border-warning/40 font-semibold';
    case 'Reject':
      return 'bg-destructive-soft text-destructive border-destructive/40 font-semibold';
  }
}

export function getRiskSeverityBadgeColor(
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
): string {
  switch (severity) {
    case 'Critical':
      return 'bg-destructive-soft text-destructive border-destructive/40 font-semibold';
    case 'High':
      return 'bg-warning-soft text-warning border-warning/40 font-semibold';
    case 'Medium':
      return 'bg-accent text-primary border-primary/40 font-semibold';
    case 'Low':
      return 'bg-muted text-muted-foreground border-border-strong font-semibold';
  }
}

/** Compact AED for chart axes and dense cells: AED 12.1M, AED 840K. */
export function formatAEDCompact(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return 'AED 0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}AED ${(abs / 1_000_000_000).toFixed(decimals)}B`;
  if (abs >= 1_000_000) return `${sign}AED ${(abs / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000) return `${sign}AED ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}AED ${abs.toFixed(0)}`;
}

/** Millions, unlabelled — for axis ticks where the unit sits in the title. */
export function formatMillions(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0';
  return `${value.toFixed(decimals)}`;
}
