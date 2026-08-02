import { calculateFinancialMetrics } from './metrics';
import { calculateCashFlowSchedule } from './cashflow';
import type { FinancialAssumptions } from '../types/finance';

/**
 * Driver attribution for a change in net present value.
 *
 * "The NPV fell by 3.2 million" is not an answer a capital committee can act
 * on; "it fell 3.2 million, of which 2.4 million is the benefit assumption and
 * 0.6 million the discount rate" is. This module decomposes the movement
 * between any two assumption sets into the contribution of each driver.
 *
 * METHOD, AND WHY IT IS NOT A SIMPLE ONE-AT-A-TIME SWEEP
 * The drivers interact — a lower benefit and a higher discount rate together
 * are not the sum of each applied alone — so one-at-a-time attribution does
 * not reconcile to the total and leaves an unexplained plug. This uses a
 * sequential (cumulative) walk: each driver is applied on top of the previous
 * one, so the contributions sum exactly to the observed change with no
 * residual. The trade-off is that a driver's attributed share depends on the
 * order of the walk, which is fixed and documented below rather than chosen
 * per call, so the same movement always decomposes the same way.
 *
 * The maths here is deterministic. The AI layer narrates the output; it does
 * not compute any part of it.
 */

/** Fixed walk order: largest structural levers first, financing last. */
const DRIVER_ORDER = [
  'automationEquipment',
  'installationIntegration',
  'softwareCybersecurity',
  'trainingLaunch',
  'initialWorkingCapital',
  'year1OperatingSavings',
  'year1ContributionMargin',
  'year1AdditionalOpEx',
  'annualSavingsGrowth',
  'annualMarginGrowth',
  'annualOpExGrowth',
  'projectLifeYears',
  'salvageValue',
  'workingCapitalRecovery',
  'corporateTaxRate',
  'discountRate',
] as const;

type DriverKey = (typeof DRIVER_ORDER)[number];

const DRIVER_LABELS: Record<DriverKey, string> = {
  automationEquipment: 'Automation equipment',
  installationIntegration: 'Installation and integration',
  softwareCybersecurity: 'Software and cyber-security',
  trainingLaunch: 'Training and launch',
  initialWorkingCapital: 'Initial working capital',
  year1OperatingSavings: 'Year-1 operating savings',
  year1ContributionMargin: 'Year-1 contribution margin',
  year1AdditionalOpEx: 'Year-1 incremental operating cost',
  annualSavingsGrowth: 'Savings growth rate',
  annualMarginGrowth: 'Margin growth rate',
  annualOpExGrowth: 'Operating cost growth rate',
  projectLifeYears: 'Project life',
  salvageValue: 'Salvage value',
  workingCapitalRecovery: 'Working capital recovery',
  corporateTaxRate: 'Corporate tax rate',
  discountRate: 'Discount rate (WACC)',
};

export interface DriverContribution {
  key: DriverKey;
  label: string;
  fromValue: number;
  toValue: number;
  /** NPV impact in AED. Negative destroys value. */
  npvImpact: number;
  /** Share of the total absolute movement, 0-1. */
  shareOfMovement: number;
}

export interface VarianceAttribution {
  baselineNpv: number;
  comparisonNpv: number;
  totalChange: number;
  /** Non-zero contributions, largest absolute impact first. */
  contributions: DriverContribution[];
  /** Always ~0 by construction — retained as an audit check. */
  unexplainedResidual: number;
}

function npvOf(a: FinancialAssumptions): number {
  return calculateFinancialMetrics(a, calculateCashFlowSchedule(a)).npv;
}

/**
 * Decompose the NPV movement from `baseline` to `comparison` by driver.
 *
 * Returns contributions that sum exactly to the total change; any residual is
 * reported rather than silently absorbed into the largest driver.
 */
export function attributeNpvVariance(
  baseline: FinancialAssumptions,
  comparison: FinancialAssumptions
): VarianceAttribution {
  const baselineNpv = npvOf(baseline);
  const comparisonNpv = npvOf(comparison);
  const totalChange = comparisonNpv - baselineNpv;

  const contributions: DriverContribution[] = [];
  let walking: FinancialAssumptions = { ...baseline };
  let runningNpv = baselineNpv;

  for (const key of DRIVER_ORDER) {
    const from = baseline[key];
    const to = comparison[key];
    if (typeof from !== 'number' || typeof to !== 'number' || from === to) continue;

    walking = { ...walking, [key]: to };
    const nextNpv = npvOf(walking);
    const impact = nextNpv - runningNpv;
    runningNpv = nextNpv;

    contributions.push({
      key,
      label: DRIVER_LABELS[key],
      fromValue: from,
      toValue: to,
      npvImpact: impact,
      shareOfMovement: 0,
    });
  }

  const totalAbs = contributions.reduce((sum, c) => sum + Math.abs(c.npvImpact), 0);
  for (const c of contributions) {
    c.shareOfMovement = totalAbs === 0 ? 0 : Math.abs(c.npvImpact) / totalAbs;
  }
  contributions.sort((a, b) => Math.abs(b.npvImpact) - Math.abs(a.npvImpact));

  return {
    baselineNpv,
    comparisonNpv,
    totalChange,
    contributions,
    unexplainedResidual: comparisonNpv - runningNpv,
  };
}
