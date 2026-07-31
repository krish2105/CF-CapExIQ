import { describe, it, expect } from 'vitest';
import { DEFAULT_FUNDING_SOURCES, calculateFundingAnalysis } from '../src/lib/finance/funding';

describe('Funding & Debt Service Coverage Ratio Engine', () => {
  it('calculates DSCR and total funding requirements correctly', () => {
    const res = calculateFundingAnalysis(DEFAULT_FUNDING_SOURCES, 9500000);

    expect(res.totalFunding).toBe(24000000);
    expect(res.annualDebtService).toBeGreaterThan(0);
    expect(res.debtServiceCoverageRatio).toBeGreaterThan(1.25);
  });
});
