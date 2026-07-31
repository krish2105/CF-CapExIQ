import { StrategicDimension, StrategicScorecardResult } from '../types/finance';

export const DEFAULT_STRATEGIC_DIMENSIONS: StrategicDimension[] = [
  { id: 'dim-1', name: 'Revenue Growth', description: 'Supports omnichannel order fulfillment and same-day delivery growth', score: 4, weightPct: 15 },
  { id: 'dim-2', name: 'Customer Experience', description: 'Reduces fulfillment lag from 24h to 2h, boosting Net Promoter Score', score: 5, weightPct: 15 },
  { id: 'dim-3', name: 'Operational Efficiency', description: 'Automates picking and sorting, cutting picking labor by 65%', score: 5, weightPct: 15 },
  { id: 'dim-4', name: 'Competitive Advantage', description: 'Establishes micro-fulfilment barrier to entry against regional competitors', score: 4, weightPct: 10 },
  { id: 'dim-5', name: 'Strategic Market Access', description: 'Enables rapid expansion into high-density urban UAE zones', score: 3, weightPct: 10 },
  { id: 'dim-6', name: 'Technology Enablement', description: 'Modernizes Warehouse Control System (WCS) and robotics stack', score: 4, weightPct: 10 },
  { id: 'dim-7', name: 'Risk Reduction', description: 'Mitigates manual warehouse labor availability and wage inflation risk', score: 4, weightPct: 5 },
  { id: 'dim-8', name: 'Business Resilience', description: 'Provides scalable peak holiday order processing capacity', score: 4, weightPct: 5 },
  { id: 'dim-9', name: 'Sustainability', description: 'Optimizes warehouse energy efficiency and packaging waste', score: 3, weightPct: 5 },
  { id: 'dim-10', name: 'Organizational Capability', description: 'Develops internal UAE robotics engineering and automation expertise', score: 4, weightPct: 10 },
];

export function calculateStrategicScorecard(
  dimensions: StrategicDimension[],
  npv: number
): StrategicScorecardResult {
  const totalWeight = dimensions.reduce((acc, d) => acc + d.weightPct, 0) || 100;
  const weightedSum = dimensions.reduce((acc, d) => acc + d.score * (d.weightPct / totalWeight), 0);
  const weightedScore = parseFloat(weightedSum.toFixed(2));

  let category: 'Exceptional' | 'Strong' | 'Moderate' | 'Weak' = 'Weak';
  if (weightedScore >= 4.2) category = 'Exceptional';
  else if (weightedScore >= 3.5) category = 'Strong';
  else if (weightedScore >= 2.5) category = 'Moderate';

  let tradeoffNotice: string | undefined = undefined;
  if (npv < 0 && weightedScore >= 3.5) {
    tradeoffNotice = `Strategic Trade-off Warning: Project generates a negative NPV (AED ${(npv / 1000000).toFixed(2)}M) but exhibits a Strong Strategic Score (${weightedScore}/5.0). Approving this project requires explicit Board authorization accepting strategic value over short-term financial returns.`;
  }

  return {
    weightedScore,
    dimensions,
    strategicFitCategory: category,
    tradeoffNotice,
  };
}
