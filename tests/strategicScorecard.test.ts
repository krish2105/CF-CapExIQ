import { describe, it, expect } from 'vitest';
import { DEFAULT_STRATEGIC_DIMENSIONS, calculateStrategicScorecard } from '../src/lib/finance/strategicScorecard';

describe('Strategic-Fit Scorecard Engine', () => {
  it('calculates weighted strategic score correctly', () => {
    const res = calculateStrategicScorecard(DEFAULT_STRATEGIC_DIMENSIONS, 12083628);

    expect(res.weightedScore).toBeGreaterThanOrEqual(3.5);
    expect(res.strategicFitCategory).toBe('Strong');
    expect(res.tradeoffNotice).toBeUndefined();
  });

  it('triggers trade-off notice when NPV < 0 and Strategic Score is high', () => {
    const res = calculateStrategicScorecard(DEFAULT_STRATEGIC_DIMENSIONS, -1500000);

    expect(res.tradeoffNotice).toBeDefined();
    expect(res.tradeoffNotice).toContain('Strategic Trade-off Warning');
  });
});
