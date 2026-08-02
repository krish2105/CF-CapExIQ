import { describe, it, expect } from 'vitest';
import { calculateCashFlowSchedule } from '../src/lib/finance/cashflow';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

describe('Cash Flow Engine', () => {
  it('calculates Year 0 initial outlay correctly', () => {
    const schedule = calculateCashFlowSchedule(DEFAULT_FINANCIAL_ASSUMPTIONS);
    const year0 = schedule[0];

    expect(year0.year).toBe(0);
    expect(year0.freeCashFlow).toBe(-24000000); // -(18m + 2.5m + 1.2m + 0.3m + 2.0m)
    expect(year0.presentValue).toBe(-24000000);
    expect(year0.discountFactor).toBe(1.0);
  });

  it('calculates Year 1 operating benefits and cash flow correctly', () => {
    const schedule = calculateCashFlowSchedule(DEFAULT_FINANCIAL_ASSUMPTIONS);
    const year1 = schedule[1];

    expect(year1.year).toBe(1);
    expect(year1.operatingSavings).toBe(7500000);
    expect(year1.incrementalMargin).toBe(2500000);
    expect(year1.totalOperatingBenefits).toBe(10000000);
    expect(year1.additionalOpEx).toBe(2200000);
    expect(year1.ebitda).toBe(7800000); // 10.0m - 2.2m

    // Depreciation = (22.0m - 2.0m) / 6 = 3,333,333.33
    expect(year1.depreciation).toBeCloseTo(3333333.33, 1);
    expect(year1.ebit).toBeCloseTo(4466666.67, 1);

    // Tax (9%) = 4,466,666.67 * 0.09 = 402,000.00
    expect(year1.tax).toBeCloseTo(402000, 1);
    expect(year1.nopat).toBeCloseTo(4064666.67, 1);

    // OCF = EBITDA - Tax = 7,800,000 - 402,000 = 7,398,000
    expect(year1.operatingCashFlow).toBeCloseTo(7398000, 1);
    expect(year1.freeCashFlow).toBeCloseTo(7398000, 1);
  });

  it('includes salvage value and working capital recovery in Year 6 terminal cash flow', () => {
    const schedule = calculateCashFlowSchedule(DEFAULT_FINANCIAL_ASSUMPTIONS);
    const year6 = schedule[6];

    expect(year6.year).toBe(6);
    expect(year6.salvageValue).toBe(2000000);
    expect(year6.workingCapitalRecovery).toBe(2000000);
    expect(year6.terminalCashFlow).toBe(4000000);
    expect(year6.freeCashFlow).toBeGreaterThan(year6.operatingCashFlow);
    expect(year6.freeCashFlow).toBeCloseTo(year6.operatingCashFlow + 4000000, 1);
  });
});
