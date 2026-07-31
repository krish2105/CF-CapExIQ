export interface PhasedPathResult {
  pathName: string;
  initialOutlay: number;
  expectedNpv: number;
  capitalAtRiskYear0: number;
  downsideProtectionPct: number;
  recommendationNote: string;
}

export function evaluatePhasedInvestmentPaths(baseNpv: number, baseOutlay: number): PhasedPathResult[] {
  return [
    {
      pathName: 'Full Immediate Investment',
      initialOutlay: baseOutlay,
      expectedNpv: baseNpv,
      capitalAtRiskYear0: baseOutlay,
      downsideProtectionPct: 0,
      recommendationNote: 'Maximum financial return if demand materializes as base case forecast.',
    },
    {
      pathName: 'Phased Implementation (Phase 1 Pilot + Gate)',
      initialOutlay: 14000000,
      expectedNpv: baseNpv * 0.85,
      capitalAtRiskYear0: 14000000,
      downsideProtectionPct: 41.7, // (24M - 14M)/24M = 41.7% protected
      recommendationNote: 'Limits initial capital exposure to AED 14.0M while gathering live throughput data before committing Phase 2 (AED 10.0M).',
    },
    {
      pathName: 'Delay Project 12 Months',
      initialOutlay: baseOutlay * 1.03, // 3% inflation
      expectedNpv: baseNpv * 0.75, // Discounted 1 year
      capitalAtRiskYear0: 0,
      downsideProtectionPct: 100,
      recommendationNote: 'Waits for supplier price stabilization and further e-commerce market demand validation.',
    },
  ];
}
