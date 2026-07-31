import { describe, it, expect } from 'vitest';
import { calculateWacc } from '../src/lib/finance/wacc';

describe('WACC & CAPM Cost of Debt Calculator', () => {
  it('calculates Cost of Equity using CAPM formula', () => {
    // r_e = R_f + beta * ERP = 0.042 + 1.15 * 0.06 = 0.042 + 0.069 = 0.111 (11.1%)
    const res = calculateWacc({
      riskFreeRate: 0.042,
      beta: 1.15,
      equityRiskPremium: 0.06,
      eiborBenchmark: 0.0485,
      creditSpread: 0.025,
      taxRate: 0.09,
      debtWeight: 0.40,
    });

    expect(res.costOfEquity).toBeCloseTo(0.111, 4);
    expect(res.preTaxCostOfDebt).toBeCloseTo(0.0735, 4); // 4.85% + 2.5% = 7.35%
    expect(res.afterTaxCostOfDebt).toBeCloseTo(0.066885, 4); // 7.35% * (1 - 0.09) = 6.6885%
    expect(res.calculatedWacc).toBeCloseTo(0.093354, 3); // 0.6 * 11.1% + 0.4 * 6.6885% = 9.335%
  });
});
