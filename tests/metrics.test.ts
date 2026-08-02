import { describe, it, expect } from 'vitest';
import { calculateFinancialMetrics } from '../src/lib/finance/metrics';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

describe('Financial Metrics Engine', () => {
  it('calculates positive baseline NPV for NovaRetail GCC', () => {
    const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(metrics.totalInitialCapex).toBe(22000000);
    expect(metrics.initialWorkingCapital).toBe(2000000);
    expect(metrics.totalInitialOutlay).toBe(24000000);
    expect(metrics.npv).toBeGreaterThan(5000000);
  });

  it('calculates IRR and MIRR greater than WACC (11.5%)', () => {
    const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(metrics.irr).not.toBeNull();
    if (metrics.irr !== null) {
      expect(metrics.irr).toBeGreaterThan(DEFAULT_FINANCIAL_ASSUMPTIONS.discountRate);
      expect(metrics.irr).toBeGreaterThan(0.20);
    }

    expect(metrics.mirr).toBeGreaterThan(DEFAULT_FINANCIAL_ASSUMPTIONS.discountRate);
    expect(metrics.mirr).toBeLessThan(metrics.irr || 1.0);
  });

  it('calculates Profitability Index (PI) > 1.0 and ROI %', () => {
    const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(metrics.profitabilityIndex).toBeGreaterThan(1.25);
    expect(metrics.roiPct).toBeGreaterThan(50); // ROI > 50%
    expect(metrics.totalProjectCashInflow).toBeGreaterThan(metrics.totalInitialOutlay);
  });

  it('calculates payback period and break-even year within project life', () => {
    const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(metrics.paybackPeriodYears).not.toBeNull();
    if (metrics.paybackPeriodYears !== null) {
      expect(metrics.paybackPeriodYears).toBeGreaterThan(2.5);
      expect(metrics.paybackPeriodYears).toBeLessThan(4.5);
    }

    expect(metrics.breakEvenYear).toBe(4);
    expect(metrics.discountedPaybackPeriodYears).not.toBeNull();
  });

  it('handles extreme cash flow edge cases without NaN or Infinity', () => {
    const extremeAssumptions = {
      ...DEFAULT_FINANCIAL_ASSUMPTIONS,
      automationEquipment: 500000000, // Enormous capex
    };

    const metrics = calculateFinancialMetrics(extremeAssumptions);
    expect(isNaN(metrics.npv)).toBe(false);
    expect(isFinite(metrics.npv)).toBe(true);
    expect(metrics.decisionStatus).toBe('Reject');
  });
});
