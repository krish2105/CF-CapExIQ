import { describe, it, expect } from 'vitest';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/lib/data/defaultAssumptions';
import { attributeNpvVariance } from '@/lib/finance/varianceAttribution';
import { fitGrowth, forecastOperatingSavings } from '@/lib/finance/forecast';
import { detectAssumptionAnomalies } from '@/lib/finance/assumptionAnomaly';
import { selectFormula, countSignChanges, deriveContext } from '@/lib/finance/formulaSelection';
import type { FinancialAssumptions } from '@/lib/types/finance';

const base: FinancialAssumptions = { ...DEFAULT_FINANCIAL_ASSUMPTIONS };

describe('variance attribution', () => {
  it('reconciles exactly — contributions sum to the total change', () => {
    const worse: FinancialAssumptions = {
      ...base,
      year1OperatingSavings: base.year1OperatingSavings * 0.75,
      discountRate: 0.145,
    };
    const r = attributeNpvVariance(base, worse);
    const summed = r.contributions.reduce((s, c) => s + c.npvImpact, 0);

    expect(r.contributions.length).toBe(2);
    expect(summed).toBeCloseTo(r.totalChange, 6);
    // No unexplained plug — this is the property one-at-a-time attribution lacks.
    expect(Math.abs(r.unexplainedResidual)).toBeLessThan(1e-6);
  });

  it('identifies the benefit assumption as the dominant driver of the pessimistic swing', () => {
    const worse: FinancialAssumptions = {
      ...base,
      year1OperatingSavings: base.year1OperatingSavings * 0.75,
      discountRate: 0.145,
    };
    const r = attributeNpvVariance(base, worse);
    expect(r.contributions[0].key).toBe('year1OperatingSavings');
    expect(r.contributions[0].shareOfMovement).toBeGreaterThan(0.5);
    expect(r.totalChange).toBeLessThan(0);
  });

  it('returns no contributions when nothing changed', () => {
    const r = attributeNpvVariance(base, { ...base });
    expect(r.contributions).toHaveLength(0);
    expect(r.totalChange).toBeCloseTo(0, 8);
  });
});

describe('growth forecasting', () => {
  it('recovers a known growth rate from a clean series', () => {
    const series = [100, 104, 108.16, 112.4864, 116.985856];
    const fit = fitGrowth(series);
    expect(fit).not.toBeNull();
    expect(fit!.annualGrowth).toBeCloseTo(0.04, 6);
    expect(fit!.rSquared).toBeGreaterThan(0.999);
  });

  it('declines to fit a series that is too short rather than guessing', () => {
    const r = forecastOperatingSavings(base, [100, 110]);
    expect(r.fit).toBeNull();
    expect(r.points).toHaveLength(0);
    expect(r.declinedReason).toContain('At least');
  });

  it('widens the band with the horizon', () => {
    const noisy = [100, 118, 103, 139, 128, 165];
    const r = forecastOperatingSavings(base, noisy);
    expect(r.fit).not.toBeNull();
    const first = r.points[0];
    const last = r.points[r.points.length - 1];
    expect(last.p90 - last.p10).toBeGreaterThan(first.p90 - first.p10);
    r.points.forEach((p) => {
      expect(p.p10).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p90);
    });
  });
});

describe('assumption anomaly detection', () => {
  it('passes the audited base case with no critical flags', () => {
    const critical = detectAssumptionAnomalies(base).filter((a) => a.severity === 'Critical');
    expect(critical).toHaveLength(0);
  });

  it('flags recovering more working capital than was invested', () => {
    const bad = { ...base, workingCapitalRecovery: base.initialWorkingCapital * 2 };
    const ids = detectAssumptionAnomalies(bad).map((a) => a.id);
    expect(ids).toContain('ANOM-NWC-RECOVERY');
  });

  it('flags implausible growth', () => {
    const bad = { ...base, annualSavingsGrowth: 0.45 };
    expect(detectAssumptionAnomalies(bad).map((a) => a.id)).toContain('ANOM-annualSavingsGrowth');
  });

  it('sorts the most severe finding first', () => {
    const bad = {
      ...base,
      workingCapitalRecovery: base.initialWorkingCapital * 2,
      projectLifeYears: 20,
    };
    expect(detectAssumptionAnomalies(bad)[0].severity).toBe('Critical');
  });
});

describe('formula selection', () => {
  it('counts sign changes for the multiple-IRR condition', () => {
    expect(countSignChanges([-24, 7, 7, 8, 8, 9, 13])).toBe(1);
    expect(countSignChanges([-24, 7, -30, 8, 9])).toBe(3);
  });

  it('chooses EAA when lives are unequal, and warns that NPV is not comparable', () => {
    const a = selectFormula({
      comparingAlternatives: true,
      unequalLives: true,
      capitalRationed: false,
      nonConventionalCashFlows: false,
      liquidityConstrained: false,
    });
    expect(a.primary).toContain('Equivalent annual annuity');
    expect(a.cautions.some((c) => c.measure === 'Net present value')).toBe(true);
  });

  it('chooses profitability index under capital rationing', () => {
    const a = selectFormula({
      comparingAlternatives: true,
      unequalLives: false,
      capitalRationed: true,
      nonConventionalCashFlows: false,
      liquidityConstrained: false,
    });
    expect(a.primary).toBe('Profitability index');
  });

  it('defaults to NPV for the flagship single-project case', () => {
    const ctx = deriveContext(base, [-24000000, 7398000, 7724690, 8066186, 8423154, 8796293, 13186330]);
    expect(ctx.nonConventionalCashFlows).toBe(false);
    expect(selectFormula(ctx).primary).toBe('Net present value');
  });

  it('warns about IRR when the stream is non-conventional', () => {
    const a = selectFormula({
      comparingAlternatives: false,
      unequalLives: false,
      capitalRationed: false,
      nonConventionalCashFlows: true,
      liquidityConstrained: false,
    });
    expect(a.cautions.some((c) => c.measure === 'Internal rate of return')).toBe(true);
  });
});
