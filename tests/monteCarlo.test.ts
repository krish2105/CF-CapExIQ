import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation } from '../src/lib/finance/monteCarlo';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

describe('Monte Carlo Probabilistic Risk Simulation Engine', () => {
  it('produces 100% reproducible results given identical seed', () => {
    const run1 = runMonteCarloSimulation(DEFAULT_FINANCIAL_ASSUMPTIONS, { iterations: 1000, seed: 12345 });
    const run2 = runMonteCarloSimulation(DEFAULT_FINANCIAL_ASSUMPTIONS, { iterations: 1000, seed: 12345 });

    expect(run1.meanNpv).toBe(run2.meanNpv);
    expect(run1.p10Npv).toBe(run2.p10Npv);
    expect(run1.p90Npv).toBe(run2.p90Npv);
    expect(run1.probNegativeNpvPct).toBe(run2.probNegativeNpvPct);
  });

  it('calculates statistics correctly over 1000 iterations', () => {
    const summary = runMonteCarloSimulation(DEFAULT_FINANCIAL_ASSUMPTIONS, { iterations: 1000, seed: 54321 });

    expect(summary.iterations).toBe(1000);
    expect(summary.meanNpv).toBeGreaterThan(0);
    expect(summary.p10Npv).toBeLessThan(summary.p90Npv);
    expect(summary.histogramData.length).toBe(12);
    expect(summary.cumulativeCurveData.length).toBe(20);
  });
});
