/**
 * GOLDEN-VALUE REGRESSION TEST - ENGINE GROUND TRUTH
 * ==================================================
 *
 * The numbers pinned in this file ARE the published figures of the CapExIQ / NovaRetail GCC
 * micro-fulfilment appraisal. They are produced by the finance engine from
 * `DEFAULT_FINANCIAL_ASSUMPTIONS` and are reproduced verbatim in:
 *
 *   - the individual written report,
 *   - the executive board presentation deck,
 *   - the board investment PDF,
 *   - every markdown methodology/reconciliation document in the repo root.
 *
 * Every other test in this suite asserts loose inequalities (`expect(npv).toBeGreaterThan(5e6)`
 * while the true NPV is 12.08M). Those tests stay green while the model drifts by 50%. This file
 * exists to close that gap: it asserts the EXACT values, so any change in engine behaviour is
 * caught immediately rather than silently invalidating the published documents.
 *
 * IF THIS TEST FAILS:
 *   Do NOT simply update the expected numbers to make it pass. A failure means the model output
 *   has moved, so every published figure in the report, deck and board PDF is now WRONG. Either
 *   revert the engine change, or - if the change is deliberate and correct - update these golden
 *   values AND regenerate/re-check all downstream documents so they agree with the engine again.
 *
 * All monetary values are in AED.
 */

import { describe, it, expect } from 'vitest';
import { calculateFinancialMetrics } from '../src/lib/finance/metrics';
import { calculateCashFlowSchedule } from '../src/lib/finance/cashflow';
import { evaluateAllScenarios, calculateExpectedNpv } from '../src/lib/finance/scenarios';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

/** Golden free-cash-flow profile: Year 0 outlay plus six operating years. */
const GOLDEN_FREE_CASH_FLOWS = [
  -24000000, 7398000, 7724690, 8066186, 8423154, 8796293, 13186330,
];

describe('GOLDEN: base case engine ground truth', () => {
  const schedule = calculateCashFlowSchedule(DEFAULT_FINANCIAL_ASSUMPTIONS);
  const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS, schedule);

  it('pins the initial investment structure', () => {
    expect(metrics.totalInitialCapex).toBe(22000000);
    expect(metrics.initialWorkingCapital).toBe(2000000);
    expect(metrics.totalInitialOutlay).toBe(24000000);
  });

  it('pins NPV at AED 12,083,628', () => {
    expect(metrics.npv).toBeCloseTo(12083628, 0);
  });

  it('pins IRR at 26.300%', () => {
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.26300, 4);
  });

  it('pins MIRR at 19.340%', () => {
    // `mirr` is `number | null` (null for degenerate cash-flow profiles); the base case is
    // well-formed, so it must be a real number.
    expect(metrics.mirr).not.toBeNull();
    expect(metrics.mirr as number).toBeCloseTo(0.19340, 4);
  });

  it('pins the profitability index at 1.5035', () => {
    expect(metrics.profitabilityIndex).toBeCloseTo(1.5035, 4);
  });

  it('pins the payback periods', () => {
    expect(metrics.paybackPeriodYears).not.toBeNull();
    expect(metrics.paybackPeriodYears as number).toBeCloseTo(3.10, 2);

    expect(metrics.discountedPaybackPeriodYears).not.toBeNull();
    expect(metrics.discountedPaybackPeriodYears as number).toBeCloseTo(3.98, 2);
  });

  it('pins the capital-committee decision at Approve', () => {
    expect(metrics.decisionStatus).toBe('Approve');
  });

  it('pins the full free-cash-flow schedule', () => {
    const fcfs = schedule.map((row) => row.freeCashFlow);

    expect(fcfs).toHaveLength(GOLDEN_FREE_CASH_FLOWS.length);
    GOLDEN_FREE_CASH_FLOWS.forEach((expected, year) => {
      expect(fcfs[year]).toBeCloseTo(expected, 0);
    });
  });

  it('pins the schedule length at 7 rows (Year 0 plus 6 operating years)', () => {
    expect(schedule).toHaveLength(7);
    expect(schedule[0].year).toBe(0);
    expect(schedule[6].year).toBe(6);
  });

  it('pins straight-line annual depreciation at AED 3,333,333.33', () => {
    // (AED 22,000,000 depreciable capex - AED 2,000,000 salvage) / 6 years.
    expect(schedule[1].depreciation).toBeCloseTo(3333333.33, 2);
    expect(schedule[6].depreciation).toBeCloseTo(3333333.33, 2);
  });
});

describe('GOLDEN: three-scenario appraisal ground truth', () => {
  const scenarios = evaluateAllScenarios(DEFAULT_FINANCIAL_ASSUMPTIONS);

  it('pins the Optimistic scenario', () => {
    const { metrics } = scenarios.Optimistic;
    expect(metrics.npv).toBeCloseTo(19013977, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.3359, 4);
    expect(metrics.decisionStatus).toBe('Approve');
  });

  it('pins the Base scenario', () => {
    const { metrics } = scenarios.Base;
    expect(metrics.npv).toBeCloseTo(12083628, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.2630, 4);
    expect(metrics.decisionStatus).toBe('Approve');
  });

  it('pins the Pessimistic scenario as a Reject', () => {
    const { metrics } = scenarios.Pessimistic;
    expect(metrics.npv).toBeCloseTo(-4940625, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.0823, 4);
    expect(metrics.decisionStatus).toBe('Reject');
  });

  it('pins the probability-weighted expected NPV at AED 9,560,152', () => {
    // Default committee weights: 50% Base, 25% Optimistic, 25% Pessimistic.
    expect(calculateExpectedNpv(scenarios)).toBeCloseTo(9560152, 0);
  });
});
