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

export function getDecisionBadgeColor(status: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject'): string {
  switch (status) {
    case 'Approve':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold';
    case 'Phased Implementation':
      return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 font-bold';
    case 'Delay Pending Evidence':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold';
    case 'Reject':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold';
  }
}

export function getRiskSeverityBadgeColor(severity: 'Critical' | 'High' | 'Medium' | 'Low'): string {
  switch (severity) {
    case 'Critical':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold';
    case 'High':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold';
    case 'Medium':
      return 'bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-500/40 font-bold';
    case 'Low':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40 font-bold';
  }
}
