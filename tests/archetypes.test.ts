/**
 * ARCHETYPE TEMPLATE SYSTEM TESTS
 * ===============================
 *
 * One describe block per archetype. Every expected value is derived by hand in the comment above
 * the assertion, from the archetype's default drivers, so a failure tells you WHICH piece of
 * business logic moved rather than just that a number changed.
 *
 * The final block is the regression that matters most: `automation` + the NovaRetail
 * micro-fulfilment drivers must reproduce `DEFAULT_FINANCIAL_ASSUMPTIONS` field for field and the
 * published golden free-cash-flow schedule to the AED.
 *
 * All monetary values are AED.
 */

import { describe, it, expect } from 'vitest';
import { buildAnnualFCF } from '../src/lib/archetypes/buildAnnualFCF';
import { ARCHETYPE_CONFIGS, computeHeadlineKpi } from '../src/lib/archetypes/configs';
import { PROJECT_ARCHETYPES } from '../src/lib/archetypes/types';
import type { ProjectArchetype } from '../src/lib/archetypes/types';
import { calculateCashFlowSchedule } from '../src/lib/finance/cashflow';
import { calculateFinancialMetrics } from '../src/lib/finance/metrics';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';
import type { FinancialAssumptions, YearlyCashFlow } from '../src/lib/types/finance';

/** Builds an archetype from its own shipped defaults and runs it through the untouched engine. */
function appraise<K extends ProjectArchetype>(key: K): {
  assumptions: FinancialAssumptions;
  schedule: YearlyCashFlow[];
} {
  const config = ARCHETYPE_CONFIGS[key];
  const assumptions = buildAnnualFCF(config.defaultDrivers, key, config.defaultCommon);
  return { assumptions, schedule: calculateCashFlowSchedule(assumptions) };
}

/* =========================================================================================== */
/* 1. NEW BRANCH                                                                                */
/* =========================================================================================== */

describe('archetype: new-branch', () => {
  const { assumptions, schedule } = appraise('new-branch');
  const drivers = ARCHETYPE_CONFIGS['new-branch'].defaultDrivers;

  it('maps fit-out, equipment and pre-opening to capex and inventory to working capital', () => {
    // Year 0 outlay = 3,800,000 + 900,000 + 500,000 fit-out/equipment/pre-opening
    //               + 1,600,000 opening inventory (working capital)
    //               = 6,800,000
    expect(assumptions.automationEquipment).toBe(3_800_000);
    expect(assumptions.installationIntegration).toBe(900_000);
    expect(assumptions.trainingLaunch).toBe(500_000);
    expect(assumptions.initialWorkingCapital).toBe(1_600_000);
    expect(schedule[0].freeCashFlow).toBe(-6_800_000);

    // 90% of the opening inventory is released at the end of the lease term.
    expect(assumptions.workingCapitalRecovery).toBeCloseTo(1_440_000, 2);
  });

  it('counts only the non-cannibalised gross margin as an incremental benefit', () => {
    // Year 1 = steady sales 13,500,000 x ramp 0.60 x gross margin 0.38 x (1 - 0.10 cannibalisation)
    //        = 8,100,000 x 0.38 x 0.90 = 2,770,200
    expect(schedule[1].incrementalMargin).toBeCloseTo(2_770_200, 2);

    // Year 2 = 13,500,000 x 0.85 x 0.38 x 0.90 = 3,924,450
    expect(schedule[2].incrementalMargin).toBeCloseTo(3_924_450, 2);

    // Year 3 (ramp complete) = 13,500,000 x 1.00 x 0.38 x 0.90 = 4,617,000
    expect(schedule[3].incrementalMargin).toBeCloseTo(4_617_000, 2);

    // Year 4 = first year of mature growth: 13,500,000 x 1.03 x 0.38 x 0.90 = 4,755,510
    expect(schedule[4].incrementalMargin).toBeCloseTo(4_755_510, 2);

    // A branch has no cost-savings benefit line at all.
    expect(assumptions.year1OperatingSavings).toBe(0);
  });

  it('escalates branch operating cost geometrically and gives a wafer-thin Year 1', () => {
    // Year 2 opex = 2,650,000 x 1.035 = 2,742,750
    expect(schedule[2].additionalOpEx).toBeCloseTo(2_742_750, 2);

    // Year 1 EBITDA = 2,770,200 - 2,650,000 = 120,200. The ramp barely covers the cost base.
    expect(schedule[1].ebitda).toBeCloseTo(120_200, 2);
  });

  it('is marginal at the default assumptions', () => {
    // Depreciation = (5,200,000 depreciable capex - 350,000 residual) / 7 years = 692,857.14
    expect(schedule[1].depreciation).toBeCloseTo(692_857.14, 2);

    const metrics = calculateFinancialMetrics(assumptions, schedule);
    // Just below breakeven at the 12.5% retail hurdle: the whole case is the cannibalisation rate.
    expect(metrics.npv).toBeCloseTo(-101_571, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.1214, 4);
  });

  it('reports breakeven store count as its headline KPI', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // Steady-state (Year 7) branch EBITDA = 1,938,947.56.
    // Shared network overhead 6,500,000 / 1,938,947.56 = 3.35 -> 4 branches.
    expect(kpi.value).toBe(4);
  });
});

/* =========================================================================================== */
/* 2. MACHINERY                                                                                 */
/* =========================================================================================== */

describe('archetype: machinery', () => {
  const { assumptions, schedule } = appraise('machinery');
  const drivers = ARCHETYPE_CONFIGS.machinery.defaultDrivers;

  it('uses the engine native geometric form with no per-year index', () => {
    // Labour and scrap savings and the throughput contribution all escalate at a constant rate, so
    // no `annualBenefitProfile` is needed - and sensitivity sweeps on the growth fields still work.
    expect(assumptions.annualBenefitProfile).toBeUndefined();
    expect(assumptions.annualSavingsGrowth).toBe(0.03);
    expect(assumptions.annualMarginGrowth).toBe(0.04);
  });

  it('derives the savings line from labour hours and scrap', () => {
    // 9,600 hrs x AED 85/hr = 816,000 labour + 240,000 scrap/rework = 1,056,000
    expect(assumptions.year1OperatingSavings).toBe(1_056_000);

    // 42,000 incremental units x AED 11.50 contribution = 483,000
    expect(assumptions.year1ContributionMargin).toBe(483_000);

    // Year 1 EBITDA = 1,056,000 + 483,000 - 310,000 maintenance/power = 1,229,000
    expect(schedule[1].ebitda).toBeCloseTo(1_229_000, 2);
  });

  it('computes Year 1 free cash flow through the untouched engine', () => {
    // Depreciation = (4,200,000 + 480,000 + 260,000 + 90,000 - 550,000 residual) / 8
    //              = (5,030,000 - 550,000) / 8 = 560,000
    expect(schedule[1].depreciation).toBeCloseTo(560_000, 2);

    // EBIT = 1,229,000 - 560,000 = 669,000; tax @ 9% = 60,210
    // OCF  = EBITDA - tax = 1,229,000 - 60,210 = 1,168,790
    expect(schedule[1].tax).toBeCloseTo(60_210, 2);
    expect(schedule[1].freeCashFlow).toBeCloseTo(1_168_790, 2);
  });

  it('creates value and repays inside 45% of the asset life', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    expect(metrics.npv).toBeCloseTo(1_566_327, 0);
    expect(metrics.decisionStatus).toBe('Approve');

    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // Payback 4.2349 years / 10-year engineering life = 0.4235
    expect(kpi.value).not.toBeNull();
    expect(kpi.value as number).toBeCloseTo(0.4235, 4);
  });
});

/* =========================================================================================== */
/* 3. NEW PRODUCT                                                                               */
/* =========================================================================================== */

describe('archetype: new-product', () => {
  const { assumptions, schedule } = appraise('new-product');
  const drivers = ARCHETYPE_CONFIGS['new-product'].defaultDrivers;

  it('builds contribution from the unit life cycle net of cannibalisation', () => {
    // Year 1 = 100,000 units x (48 - 28) = 2,000,000 gross contribution
    //          less 100,000 x 0.15 x AED 13 = 195,000 cannibalisation
    //          = 1,805,000
    expect(schedule[1].incrementalMargin).toBeCloseTo(1_805_000, 2);

    // Year 3: price eroded twice -> 48 x 0.97^2 = 45.1632, contribution 17.1632
    //         205,000 x 17.1632 = 3,518,456 less 205,000 x 0.15 x 13 = 399,750
    //         = 3,118,706
    expect(schedule[3].incrementalMargin).toBeCloseTo(3_118_706, 2);
  });

  it('emits a per-year index because a life cycle is not a growth rate', () => {
    const index = assumptions.annualBenefitProfile?.contributionMarginIndex;
    expect(index).toBeDefined();
    expect(index).toHaveLength(6);
    // Anchored on Year 1, peaks in Year 3 and then declines - a geometric series cannot do this.
    expect((index as number[])[0]).toBe(1);
    expect((index as number[])[2]).toBeCloseTo(3_118_706 / 1_805_000, 9);
    expect((index as number[])[5]).toBeLessThan(1);
  });

  it('is value destroying at the base case', () => {
    // Depreciation = (1,800,000 + 2,400,000 + 1,200,000 - 220,000) / 6 = 863,333.33
    expect(schedule[1].depreciation).toBeCloseTo(863_333.33, 2);

    const metrics = calculateFinancialMetrics(assumptions, schedule);
    expect(metrics.npv).toBeCloseTo(-547_730, 0);
    expect(metrics.irr).not.toBeNull();
    // 10.43% against a 13.5% new-product hurdle.
    expect(metrics.irr as number).toBeCloseTo(0.1043, 4);
    expect(metrics.npv).toBeLessThan(0);
  });

  it('reports breakeven units as its headline KPI', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // Net contribution per unit = 48 - 28 - (0.15 x 13) = 18.05
    // (950,000 fixed + 863,333.33 depreciation) / 18.05 = 100,461.7 -> 100,462 units
    expect(kpi.value).toBe(100_462);
  });
});

/* =========================================================================================== */
/* 4. AI PLATFORM                                                                               */
/* =========================================================================================== */

describe('archetype: ai-platform', () => {
  const { assumptions, schedule } = appraise('ai-platform');
  const drivers = ARCHETYPE_CONFIGS['ai-platform'].defaultDrivers;

  it('recognises revenue as retained ARR plus half of new bookings', () => {
    // Year 1: opening ARR 0, so revenue = 1,800,000 x 0.5 = 900,000. Closing ARR = 1,800,000.
    expect(schedule[1].incrementalMargin).toBeCloseTo(900_000, 2);

    // Year 2: retained = 1,800,000 x (1 - 0.12) = 1,584,000
    //         plus 3,200,000 x 0.5 = 1,600,000  ->  3,184,000
    expect(schedule[2].incrementalMargin).toBeCloseTo(3_184_000, 2);

    // Year 3: closing ARR after Y2 = 1,584,000 + 3,200,000 = 4,784,000
    //         retained = 4,784,000 x 0.88 = 4,209,920 plus 4,600,000 x 0.5 = 2,300,000
    //         = 6,509,920
    expect(schedule[3].incrementalMargin).toBeCloseTo(6_509_920, 2);
  });

  it('scales the cost line with usage plus a bookings-driven acquisition spend', () => {
    // Year 1 opex = revenue 900,000 x 0.32 inference = 288,000
    //             + platform run cost 1,900,000
    //             + S&M 1,800,000 new ARR x 0.70 = 1,260,000
    //             = 3,448,000
    expect(schedule[1].additionalOpEx).toBeCloseTo(3_448_000, 2);

    // Year 2 opex = 3,184,000 x 0.30 = 955,200 + 1,900,000 x 1.06 = 2,014,000
    //             + 3,200,000 x 0.70 = 2,240,000  ->  5,209,200
    expect(schedule[2].additionalOpEx).toBeCloseTo(5_209_200, 2);

    // Year 1 EBITDA = 900,000 - 3,448,000 = -2,548,000. Loss-making while the base is built.
    expect(schedule[1].ebitda).toBeCloseTo(-2_548_000, 2);
  });

  it('barely earns its cost of capital despite strong headline unit economics', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    // Effectively zero NPV at the 16% technology hurdle over 8 years.
    expect(metrics.npv).toBeCloseTo(-8_123, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.1599, 4);

    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // LTV:CAC = gross margin 0.68 / (churn 0.12 x CAC ratio 0.70) = 8.0952
    expect(kpi.value).not.toBeNull();
    expect(kpi.value as number).toBeCloseTo(8.0952, 4);
  });
});

/* =========================================================================================== */
/* 5. FACILITY EXPANSION                                                                        */
/* =========================================================================================== */

describe('archetype: facility-expansion', () => {
  const { assumptions, schedule } = appraise('facility-expansion');
  const drivers = ARCHETYPE_CONFIGS['facility-expansion'].defaultDrivers;

  it('prices capacity at utilisation x contribution and docks Year 1 for the delay', () => {
    // Year 1: 900,000 units x 0.45 utilisation x (1 - 3/12 delay = 0.75 availability)
    //         = 303,750 units x AED 12.50 = 3,796,875
    expect(schedule[1].incrementalMargin).toBeCloseTo(3_796_875, 2);

    // Year 2 (no delay): 900,000 x 0.70 = 630,000 units x 12.50 x 1.02 escalation = 8,032,500
    expect(schedule[2].incrementalMargin).toBeCloseTo(8_032_500, 2);
  });

  it('holds the final ramp value once the utilisation curve is exhausted', () => {
    // The ramp array has 4 entries but the appraisal runs 10 years; Years 5-10 hold 0.90.
    // Year 5 = 900,000 x 0.90 x 12.50 x 1.02^4 = 810,000 x 13.5306 = 10,959,625.62
    expect(schedule[5].incrementalMargin).toBeCloseTo(10_959_625.62, 2);
    expect(schedule).toHaveLength(11);
  });

  it('creates substantial value over a 10-year asset life', () => {
    // Depreciation = (14,000,000 + 8,500,000 + 1,200,000 + 800,000 - 4,500,000) / 10 = 2,000,000
    expect(schedule[1].depreciation).toBeCloseTo(2_000_000, 2);
    expect(schedule[0].freeCashFlow).toBe(-26_700_000);

    const metrics = calculateFinancialMetrics(assumptions, schedule);
    expect(metrics.npv).toBeCloseTo(7_282_840, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.1637, 4);

    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // Headline KPI is the utilisation the case assumes it reaches: 90%.
    expect(kpi.value).toBeCloseTo(0.9, 10);
  });
});

/* =========================================================================================== */
/* 6. ONLINE SERVICE                                                                            */
/* =========================================================================================== */

describe('archetype: online-service', () => {
  const { assumptions, schedule } = appraise('online-service');
  const drivers = ARCHETYPE_CONFIGS['online-service'].defaultDrivers;

  it('bills the average active base, counting new users for half a year', () => {
    // Year 1: opening 0, new 30,000 -> average active 15,000 x AED 178 ARPU = 2,670,000
    expect(schedule[1].incrementalMargin).toBeCloseTo(2_670_000, 2);

    // Year 2: opening base 30,000 x 0.72 retention = 21,600 retained
    //         average active = 21,600 + 40,000 x 0.5 = 41,600
    //         ARPU 178 x 1.04 = 185.12  ->  41,600 x 185.12 = 7,700,992
    expect(schedule[2].incrementalMargin).toBeCloseTo(7_700_992, 2);
  });

  it('charges acquisition spend in the year the users are bought', () => {
    // Year 1 opex = revenue 2,670,000 x 0.20 variable = 534,000
    //             + 30,000 new users x AED 120 CAC = 3,600,000
    //             + fixed platform 1,800,000
    //             = 5,934,000
    expect(schedule[1].additionalOpEx).toBeCloseTo(5_934_000, 2);

    // Year 1 EBITDA = 2,670,000 - 5,934,000 = -3,264,000
    expect(schedule[1].ebitda).toBeCloseTo(-3_264_000, 2);
  });

  it('is rejected at the default assumptions despite an acceptable CAC payback', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    expect(metrics.npv).toBeCloseTo(-1_485_933, 0);
    expect(metrics.decisionStatus).toBe('Reject');

    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // CAC payback = 120 / (178 x 0.80 / 12) = 120 / 11.8667 = 10.112 months
    expect(kpi.value).not.toBeNull();
    expect(kpi.value as number).toBeCloseTo(10.1124, 4);
  });
});

/* =========================================================================================== */
/* 7. MARKET ENTRY                                                                              */
/* =========================================================================================== */

describe('archetype: market-entry', () => {
  const { assumptions, schedule } = appraise('market-entry');
  const drivers = ARCHETYPE_CONFIGS['market-entry'].defaultDrivers;

  it('applies the share curve to a growing market and haircuts repatriation', () => {
    // Year 1: 900,000,000 market x 0.007 share = 6,300,000 local revenue
    //         x 0.26 contribution = 1,638,000 x (1 - 0.04 FX haircut) = 1,572,480
    expect(schedule[1].incrementalMargin).toBeCloseTo(1_572_480, 2);

    // Year 3: market 900,000,000 x 1.06^2 = 1,011,240,000
    //         x 0.028 share = 28,314,720 x 0.26 = 7,361,827.20 x 0.96 = 7,067,354.11
    expect(schedule[3].incrementalMargin).toBeCloseTo(7_067_354.11, 2);
  });

  it('uses the entry jurisdiction tax rate rather than the UAE headline rate', () => {
    expect(assumptions.corporateTaxRate).toBe(0.2);
    expect(assumptions.discountRate).toBe(0.15);
  });

  it('is rejected inside the six-year window', () => {
    // Depreciation = (2,800,000 + 1,500,000 + 900,000 + 3,200,000 - 500,000) / 6 = 1,316,666.67
    expect(schedule[1].depreciation).toBeCloseTo(1_316_666.67, 2);
    expect(schedule[0].freeCashFlow).toBe(-10_900_000);

    const metrics = calculateFinancialMetrics(assumptions, schedule);
    expect(metrics.npv).toBeCloseTo(-2_212_636, 0);
    expect(metrics.decisionStatus).toBe('Reject');
  });

  it('reports the interpolated year in which local EBITDA turns positive', () => {
    const metrics = calculateFinancialMetrics(assumptions, schedule);
    const kpi = computeHeadlineKpi(drivers, metrics, schedule);
    // Year 2 EBITDA = -361,987.20, Year 3 EBITDA = +2,436,854.11.
    // Crossing fraction = 361,987.20 / (2,436,854.11 + 361,987.20) = 0.12933
    // Breakeven year = 2 + 0.12933 = 2.12933
    expect(kpi.value).not.toBeNull();
    expect(kpi.value as number).toBeCloseTo(2.1293, 4);
  });
});

/* =========================================================================================== */
/* 8. AUTOMATION - THE NOVARETAIL REGRESSION                                                    */
/* =========================================================================================== */

/** The published NovaRetail free-cash-flow profile: Year 0 outlay plus six operating years. */
const GOLDEN_FREE_CASH_FLOWS = [
  -24000000, 7398000, 7724690, 8066186, 8423154, 8796293, 13186330,
];

describe('archetype: automation (NovaRetail MFC regression)', () => {
  const config = ARCHETYPE_CONFIGS.automation;
  const assumptions = buildAnnualFCF(config.defaultDrivers, 'automation', config.defaultCommon);
  const schedule = calculateCashFlowSchedule(assumptions);
  const metrics = calculateFinancialMetrics(assumptions, schedule);

  it('derives the published benefit lines from physical drivers', () => {
    // 45 roles displaced x AED 120,000 fully loaded = 5,400,000
    // plus error and waste elimination                = 2,100,000
    //                              Year 1 savings     = 7,500,000
    expect(assumptions.year1OperatingSavings).toBe(7_500_000);

    // 500,000 incremental orders x AED 5.00 contribution = 2,500,000
    expect(assumptions.year1ContributionMargin).toBe(2_500_000);
    expect(assumptions.year1AdditionalOpEx).toBe(2_200_000);
  });

  it('emits no per-year index, which is what makes the reproduction bit-identical', () => {
    // Both benefit lines are genuinely geometric, so the archetype uses the engine's native
    // year-1 + growth form. No divide-then-multiply round trip is introduced anywhere.
    expect(assumptions.annualBenefitProfile).toBeUndefined();
  });

  it('reproduces DEFAULT_FINANCIAL_ASSUMPTIONS field for field', () => {
    expect(assumptions).toEqual(DEFAULT_FINANCIAL_ASSUMPTIONS);
  });

  it('reproduces the golden free-cash-flow schedule exactly', () => {
    const fcfs = schedule.map((row) => row.freeCashFlow);
    expect(fcfs).toHaveLength(GOLDEN_FREE_CASH_FLOWS.length);
    GOLDEN_FREE_CASH_FLOWS.forEach((expected, year) => {
      expect(fcfs[year]).toBeCloseTo(expected, 0);
    });
  });

  it('reproduces every published headline metric', () => {
    expect(metrics.totalInitialOutlay).toBe(24_000_000);
    expect(metrics.npv).toBeCloseTo(12_083_628, 0);
    expect(metrics.irr).not.toBeNull();
    expect(metrics.irr as number).toBeCloseTo(0.263, 4);
    expect(metrics.mirr).not.toBeNull();
    expect(metrics.mirr as number).toBeCloseTo(0.1934, 4);
    expect(metrics.profitabilityIndex).toBeCloseTo(1.5035, 4);
    expect(metrics.paybackPeriodYears as number).toBeCloseTo(3.1, 2);
    expect(metrics.discountedPaybackPeriodYears as number).toBeCloseTo(3.98, 2);
    expect(schedule[1].depreciation).toBeCloseTo(3_333_333.33, 2);
    expect(metrics.decisionStatus).toBe('Approve');
  });

  it('reports cost per unit reduction as its headline KPI', () => {
    const kpi = computeHeadlineKpi(config.defaultDrivers, metrics, schedule);
    // Baseline cost = 6,000,000 orders x AED 4.10 = 24,600,000
    // Post cost     = 24,600,000 - 7,500,000 saving + 2,200,000 run cost = 19,300,000
    // Post units    = 6,000,000 + 500,000 = 6,500,000  ->  AED 2.96923/unit
    // Reduction     = 1 - 2.96923 / 4.10 = 0.27580
    expect(kpi.value).not.toBeNull();
    expect(kpi.value as number).toBeCloseTo(0.2758, 4);
  });
});

/* =========================================================================================== */
/* Cross-cutting invariants                                                                     */
/* =========================================================================================== */

describe('archetype system invariants', () => {
  it('ships a config for every archetype key, with a matching driver discriminant', () => {
    expect(PROJECT_ARCHETYPES).toHaveLength(8);
    PROJECT_ARCHETYPES.forEach((key) => {
      const config = ARCHETYPE_CONFIGS[key];
      expect(config.key).toBe(key);
      expect(config.defaultDrivers.kind).toBe(key);
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.shortDescription.length).toBeGreaterThan(0);
      expect(config.distinctiveRisk.length).toBeGreaterThan(0);
      // Accent colours must be design-token hexes, not arbitrary CSS.
      expect(config.accentColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(config.relevantModules.length).toBeGreaterThan(0);
    });
  });

  it('produces a benefit index covering every operating year, anchored at 1.0', () => {
    PROJECT_ARCHETYPES.forEach((key) => {
      const config = ARCHETYPE_CONFIGS[key];
      const assumptions = buildAnnualFCF(config.defaultDrivers, key, config.defaultCommon);
      const profile = assumptions.annualBenefitProfile;
      if (!profile) return; // machinery and automation are geometric by design.

      const years = Math.round(config.defaultCommon.projectLifeYears);
      expect(profile.contributionMarginIndex).toHaveLength(years);
      expect(profile.additionalOpExIndex).toHaveLength(years);
      // Every one of these archetypes earns something in Year 1, so the anchor is Year 1 itself.
      expect((profile.contributionMarginIndex as number[])[0]).toBe(1);
      expect((profile.additionalOpExIndex as number[])[0]).toBe(1);
    });
  });

  it('produces a full schedule and a finite NPV for every archetype', () => {
    PROJECT_ARCHETYPES.forEach((key) => {
      const config = ARCHETYPE_CONFIGS[key];
      const assumptions = buildAnnualFCF(config.defaultDrivers, key, config.defaultCommon);
      const schedule = calculateCashFlowSchedule(assumptions);
      expect(schedule).toHaveLength(Math.round(config.defaultCommon.projectLifeYears) + 1);
      const metrics = calculateFinancialMetrics(assumptions, schedule);
      expect(Number.isFinite(metrics.npv)).toBe(true);
    });
  });

  it('spans the decision spectrum rather than approving everything', () => {
    const decisions = PROJECT_ARCHETYPES.map((key) => {
      const config = ARCHETYPE_CONFIGS[key];
      const assumptions = buildAnnualFCF(config.defaultDrivers, key, config.defaultCommon);
      return calculateFinancialMetrics(assumptions).decisionStatus;
    });
    // A template pack where every archetype is an Approve at its defaults is not credible.
    expect(new Set(decisions).size).toBeGreaterThanOrEqual(3);
    expect(decisions).toContain('Approve');
    expect(decisions).toContain('Reject');
  });

  it('rejects a driver/archetype mismatch instead of silently appraising the wrong project', () => {
    const machineryDrivers = ARCHETYPE_CONFIGS.machinery.defaultDrivers;
    expect(() =>
      // Deliberate mismatch: machinery drivers presented as an automation project.
      buildAnnualFCF(
        machineryDrivers as never,
        'automation',
        ARCHETYPE_CONFIGS.automation.defaultCommon,
      ),
    ).toThrow(/mismatch/);
  });
});
