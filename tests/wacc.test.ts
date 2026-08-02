import { describe, it, expect } from 'vitest';
import { calculateWacc, WaccInputs } from '../src/lib/finance/wacc';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

/**
 * These inputs must stay in sync with the defaults on /external-data. They are the published
 * derivation of NovaRetail GCC's 11.50% hurdle rate.
 */
const HURDLE_RATE_DERIVATION: WaccInputs = {
  riskFreeRate: 0.042,
  beta: 1.15,
  equityRiskPremium: 0.06,
  countryRiskPremium: 0.0075, // UAE sovereign / jurisdictional risk
  projectExecutionPremium: 0.035, // greenfield, first-of-a-kind robotics MFC
  eiborBenchmark: 0.0379, // live 3-month EIBOR
  creditSpread: 0.025,
  taxRate: 0.09,
  debtWeight: 0.40,
};

describe('WACC & CAPM Cost of Debt Calculator', () => {
  it('builds the cost of equity from CAPM plus country and execution premiums', () => {
    // r_e = R_f + beta * ERP + CRP + execution premium
    //     = 0.042 + 1.15 * 0.06 + 0.0075 + 0.035
    //     = 0.042 + 0.069 + 0.0075 + 0.035 = 0.1535 (15.35%)
    const res = calculateWacc(HURDLE_RATE_DERIVATION);
    expect(res.costOfEquity).toBeCloseTo(0.1535, 6);
  });

  it('derives the after-tax cost of debt from EIBOR plus spread', () => {
    const res = calculateWacc(HURDLE_RATE_DERIVATION);

    expect(res.preTaxCostOfDebt).toBeCloseTo(0.0629, 6); // 3.79% + 2.50% = 6.29%
    expect(res.afterTaxCostOfDebt).toBeCloseTo(0.057239, 6); // 6.29% * (1 - 0.09) = 5.7239%
  });

  it('applies the target capital structure weights', () => {
    const res = calculateWacc(HURDLE_RATE_DERIVATION);

    expect(res.debtWeight).toBeCloseTo(0.40, 6);
    expect(res.equityWeight).toBeCloseTo(0.60, 6);
  });

  it('reconciles to the 11.50% model hurdle rate', () => {
    const res = calculateWacc(HURDLE_RATE_DERIVATION);

    // WACC = 0.60 * 15.35% + 0.40 * 5.7239% = 9.210% + 2.28956% = 11.49956% ~ 11.50%
    expect(res.calculatedWacc).toBeCloseTo(0.1149956, 7);
    expect(res.calculatedWacc).toBeCloseTo(0.115, 4);
    expect(parseFloat((res.calculatedWacc * 100).toFixed(2))).toBe(11.5);
  });

  it('matches the discount rate actually used by the financial model', () => {
    const res = calculateWacc(HURDLE_RATE_DERIVATION);

    // The calculator must not test a number the engine then ignores.
    expect(res.calculatedWacc).toBeCloseTo(DEFAULT_FINANCIAL_ASSUMPTIONS.discountRate, 4);
  });

  it('clamps capital-structure weights to [0, 1]', () => {
    const res = calculateWacc({ ...HURDLE_RATE_DERIVATION, debtWeight: 1.4 });

    expect(res.debtWeight).toBe(1);
    expect(res.equityWeight).toBe(0);
    expect(res.calculatedWacc).toBeCloseTo(res.afterTaxCostOfDebt, 10);
  });
});
