import { FinancialAssumptions, FinancialMetrics, YearlyCashFlow } from '../types/finance';
import { calculateCashFlowSchedule } from './cashflow';

/**
 * Capital-committee decision thresholds.
 *
 * These were previously magic numbers buried inside `determineDecisionStatus`. They are exported
 * so that the UI, the documentation and the tests all read the same policy in one place.
 *
 * NOTE ON SCALE: the outright-reject test is expressed as a RATIO of the total initial outlay,
 * not as an absolute AED amount. A fixed "-AED 2,000,000 = Reject" rule is meaningless across
 * project sizes - it rejects a trivially small loss on a AED 500M programme while waving through
 * a catastrophic loss on a AED 3M one. Expressing it relative to the outlay keeps the policy
 * proportionate at any project size.
 */
export const DECISION_THRESHOLDS = {
  /**
   * Outright reject when NPV falls below this fraction of the total initial outlay
   * (capex + initial working capital). -0.10 => "NPV worse than -10% of money at risk".
   * Example: a AED 24,000,000 outlay rejects below -AED 2,400,000.
   */
  rejectNpvToOutlayRatio: -0.10,

  /** Minimum Profitability Index required for a clean Approve (PV of inflows per AED invested). */
  minProfitabilityIndexForApproval: 1.05,

  /** Maximum undiscounted payback, in years, tolerated by management's liquidity window. */
  maxPaybackYearsForApproval: 4.5,
} as const;

export function calculateFinancialMetrics(
  assumptions: FinancialAssumptions,
  yearlyCashFlows?: YearlyCashFlow[]
): FinancialMetrics {
  const schedule = yearlyCashFlows || calculateCashFlowSchedule(assumptions);
  const fcfs = schedule.map((item) => item.freeCashFlow);
  const r = assumptions.discountRate;

  const totalCapex =
    assumptions.automationEquipment +
    assumptions.installationIntegration +
    assumptions.softwareCybersecurity +
    assumptions.trainingLaunch;
  const initialWorkingCapital = assumptions.initialWorkingCapital;
  const totalInitialOutlay = totalCapex + initialWorkingCapital;

  // 1. NPV
  const npv = schedule.reduce((sum, item) => sum + item.presentValue, 0);

  // 2. IRR with Newton-Raphson & Bisection Fallback
  const { irr, irrWarning } = calculateIRR(fcfs);

  // 3. MIRR
  const mirr = calculateMIRR(
    fcfs,
    assumptions.financeRateMIRR,
    assumptions.reinvestmentRateMIRR
  );

  // 4. Profitability Index (PI)
  const pvInflows = schedule.slice(1).reduce((sum, item) => sum + item.presentValue, 0);
  const profitabilityIndex = totalInitialOutlay > 0 ? pvInflows / totalInitialOutlay : 0;

  // 5. Total Project Inflows, Net Flow, Average Annual Flow
  const futureInflows = schedule.slice(1).reduce((sum, item) => sum + item.freeCashFlow, 0);
  const totalProjectNetCashFlow = futureInflows - totalInitialOutlay;
  const projectLife = schedule.length - 1;
  const averageAnnualCashFlow = projectLife > 0 ? futureInflows / projectLife : 0;

  // 6. ROI (Return on Investment %) = Total Net Gain / Initial Outlay * 100
  const roiPct = totalInitialOutlay > 0 ? (totalProjectNetCashFlow / totalInitialOutlay) * 100 : 0;

  // 7. Payback Period (Undiscounted)
  const paybackPeriodYears = calculatePayback(schedule, false);

  // 8. Discounted Payback Period
  const discountedPaybackPeriodYears = calculatePayback(schedule, true);

  // 9. Break-even Year (Integer or fractional year where cumulative FCF >= 0)
  const breakEvenYear = paybackPeriodYears !== null ? Math.ceil(paybackPeriodYears) : null;

  // 10. Break-even Initial Investment
  const breakEvenInitialInvestment = pvInflows;

  // 11. Max Tolerable Investment Cost Overrun %
  const maxInvestmentCostOverrunPct =
    totalInitialOutlay > 0 ? ((breakEvenInitialInvestment - totalInitialOutlay) / totalInitialOutlay) * 100 : 0;

  // 12. Break-even Annual Operating Benefit & Max Shortfall %
  const { breakEvenAnnualOperatingBenefit, maxOperatingBenefitShortfallPct } =
    calculateBreakEvenBenefit(assumptions);

  // 13. Decision Status
  const decisionStatus = determineDecisionStatus(npv, irr, r, profitabilityIndex, paybackPeriodYears, totalInitialOutlay);

  return {
    totalInitialCapex: totalCapex,
    initialWorkingCapital,
    totalInitialOutlay,
    npv,
    irr,
    irrWarning,
    mirr,
    profitabilityIndex,
    roiPct,
    paybackPeriodYears,
    discountedPaybackPeriodYears,
    breakEvenAnnualOperatingBenefit,
    breakEvenInitialInvestment,
    maxInvestmentCostOverrunPct,
    maxOperatingBenefitShortfallPct,
    totalProjectCashInflow: futureInflows,
    totalProjectNetCashFlow,
    averageAnnualCashFlow,
    breakEvenYear,
    valueCreatedAboveHurdleRate: npv,
    decisionStatus,
  };
}

function calculateIRR(fcfs: number[]): { irr: number | null; irrWarning?: string } {
  // Edge case 1: All non-negative or all non-positive cash flows
  const hasPositive = fcfs.some((f) => f > 0);
  const hasNegative = fcfs.some((f) => f < 0);
  if (!hasPositive || !hasNegative) {
    return { irr: null, irrWarning: 'IRR undefined: cash flows must contain at least one positive and one negative flow.' };
  }

  // Check sign changes
  let signChanges = 0;
  for (let i = 0; i < fcfs.length - 1; i++) {
    if ((fcfs[i] < 0 && fcfs[i + 1] > 0) || (fcfs[i] > 0 && fcfs[i + 1] < 0)) {
      signChanges++;
    }
  }

  let irrWarning: string | undefined;
  if (signChanges > 1) {
    irrWarning = `Multiple cash flow sign changes (${signChanges}) detected. Multiple IRRs may exist. NPV takes precedence.`;
  }

  // Newton-Raphson
  let rate = 0.15;
  const maxIter = 100;
  const tol = 1e-7;

  for (let iter = 0; iter < maxIter; iter++) {
    let npvVal = 0;
    let dNpv = 0;

    for (let t = 0; t < fcfs.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npvVal += fcfs[t] / denom;
      if (t > 0) {
        dNpv -= (t * fcfs[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npvVal) < tol) {
      return { irr: sanitizeRate(rate), irrWarning };
    }

    if (Math.abs(dNpv) < 1e-12) break;
    const nextRate = rate - npvVal / dNpv;

    // Guard: Math.pow(1 + rate, t) is undefined for rate <= -1 (division by zero / NaN for
    // fractional exponents). If Newton-Raphson overshoots past -100% we abandon it and hand the
    // problem to the bracketed bisection fallback below rather than iterating on NaN.
    if (!isFinite(nextRate) || nextRate <= -0.9999999) break;

    if (Math.abs(nextRate - rate) < tol) {
      return { irr: sanitizeRate(nextRate), irrWarning };
    }
    rate = nextRate;
  }

  // Fallback to Bisection search between -0.5 and 2.0
  let low = -0.5;
  let high = 2.0;
  let npvLow = calcNpvForRate(fcfs, low);
  let npvHigh = calcNpvForRate(fcfs, high);

  if (npvLow * npvHigh > 0) {
    return { irr: null, irrWarning: 'No real internal rate of return found within standard bounds (-50% to +200%).' };
  }

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npvMid = calcNpvForRate(fcfs, mid);
    if (Math.abs(npvMid) < tol || (high - low) / 2 < tol) {
      return { irr: sanitizeRate(mid), irrWarning };
    }
    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return { irr: sanitizeRate((low + high) / 2), irrWarning };
}

function sanitizeRate(rate: number): number | null {
  if (isNaN(rate) || !isFinite(rate)) return null;
  return rate;
}

function calcNpvForRate(fcfs: number[], rate: number): number {
  return fcfs.reduce((sum, fcf, t) => sum + fcf / Math.pow(1 + rate, t), 0);
}

/**
 * Modified IRR. Returns `null` - never 0 - for degenerate inputs. A hard 0 return renders in the
 * UI as a genuine "0.00% MIRR", which is indistinguishable from a real (terrible) result; `null`
 * renders as "N/A" and is honest about the metric being undefined.
 */
function calculateMIRR(fcfs: number[], financeRate: number, reinvestmentRate: number): number | null {
  const n = fcfs.length - 1;
  if (n <= 0) return null;

  let pvOutflows = 0;
  let tvInflows = 0;

  for (let t = 0; t <= n; t++) {
    if (fcfs[t] < 0) {
      pvOutflows += Math.abs(fcfs[t]) / Math.pow(1 + financeRate, t);
    } else {
      tvInflows += fcfs[t] * Math.pow(1 + reinvestmentRate, n - t);
    }
  }

  // No financed outflows => nothing to earn a return on. No terminal inflows => MIRR undefined
  // (the ratio is 0 and the n-th root of 0 is a meaningless -100%).
  if (pvOutflows <= 0 || tvInflows <= 0) return null;

  const mirrVal = Math.pow(tvInflows / pvOutflows, 1 / n) - 1;
  return isNaN(mirrVal) || !isFinite(mirrVal) ? null : mirrVal;
}

function calculatePayback(schedule: YearlyCashFlow[], discounted: boolean): number | null {
  for (let i = 1; i < schedule.length; i++) {
    const prevCum = discounted ? schedule[i - 1].cumulativeDiscountedCashFlow : schedule[i - 1].cumulativeCashFlow;
    const currCum = discounted ? schedule[i].cumulativeDiscountedCashFlow : schedule[i].cumulativeCashFlow;
    const periodFlow = discounted ? schedule[i].presentValue : schedule[i].freeCashFlow;

    if (currCum >= 0) {
      const remainingUnrecovered = Math.abs(prevCum);
      const fraction = periodFlow > 0 ? remainingUnrecovered / periodFlow : 0;
      return (i - 1) + fraction;
    }
  }
  return null;
}

/**
 * Solves for the Year-1 operating-benefit level at which NPV = 0, by bisecting a multiplier
 * applied to both benefit lines over the range [0, 2] x base benefits.
 *
 * Returns `null` for both outputs when the answer is not defined:
 *  - base benefits are zero (the shortfall percentage would be a divide-by-zero -> NaN in the UI);
 *  - NPV does not change sign across the bracket, so no break-even exists inside [0, 2]. Returning
 *    a bound in that case produced nonsense figures such as "-100%" / "-113%" tolerance.
 */
function calculateBreakEvenBenefit(assumptions: FinancialAssumptions): {
  breakEvenAnnualOperatingBenefit: number | null;
  maxOperatingBenefitShortfallPct: number | null;
} {
  const NOT_DEFINED = {
    breakEvenAnnualOperatingBenefit: null,
    maxOperatingBenefitShortfallPct: null,
  };

  const baseBenefits = assumptions.year1OperatingSavings + assumptions.year1ContributionMargin;

  // Divide-by-zero guard: with no base benefits there is nothing to scale and the shortfall
  // percentage is undefined.
  if (!(baseBenefits > 0)) return NOT_DEFINED;

  const npvAtMultiplier = (multiplier: number): number => {
    const testAssumptions: FinancialAssumptions = {
      ...assumptions,
      year1OperatingSavings: assumptions.year1OperatingSavings * multiplier,
      year1ContributionMargin: assumptions.year1ContributionMargin * multiplier,
    };
    return calculateCashFlowSchedule(testAssumptions).reduce((sum, item) => sum + item.presentValue, 0);
  };

  let lowMult = 0.0;
  let highMult = 2.0;

  let npvLow = npvAtMultiplier(lowMult);
  let npvHigh = npvAtMultiplier(highMult);

  // Bracket check: bisection is only valid if the root is enclosed.
  if (npvLow === 0) {
    return { breakEvenAnnualOperatingBenefit: 0, maxOperatingBenefitShortfallPct: 100 };
  }
  if (npvHigh === 0) {
    return { breakEvenAnnualOperatingBenefit: baseBenefits * highMult, maxOperatingBenefitShortfallPct: -100 };
  }
  if (npvLow * npvHigh > 0) return NOT_DEFINED;

  const toResult = (multiplier: number) => {
    const breakEvenBenefit = baseBenefits * multiplier;
    return {
      breakEvenAnnualOperatingBenefit: breakEvenBenefit,
      maxOperatingBenefitShortfallPct: ((baseBenefits - breakEvenBenefit) / baseBenefits) * 100,
    };
  };

  for (let i = 0; i < 100; i++) {
    const midMult = (lowMult + highMult) / 2;
    const testNpv = npvAtMultiplier(midMult);

    if (Math.abs(testNpv) < 1 || (highMult - lowMult) / 2 < 1e-9) {
      return toResult(midMult);
    }

    if (npvLow * testNpv < 0) {
      highMult = midMult;
      npvHigh = testNpv;
    } else {
      lowMult = midMult;
      npvLow = testNpv;
    }
  }

  return toResult((lowMult + highMult) / 2);
}

function determineDecisionStatus(
  npv: number,
  irr: number | null,
  wacc: number,
  pi: number,
  paybackYears: number | null,
  totalInitialOutlay: number
): 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject' {
  // Scale-relative reject gate. If the outlay is missing/zero the ratio is meaningless, so we
  // fall back to a plain "any value destruction is a reject" floor of AED 0.
  const rejectNpvFloor =
    totalInitialOutlay > 0 ? DECISION_THRESHOLDS.rejectNpvToOutlayRatio * totalInitialOutlay : 0;

  if (npv < rejectNpvFloor) return 'Reject';
  if (npv < 0) return 'Delay Pending Evidence';
  if (
    npv > 0 &&
    irr !== null &&
    irr >= wacc &&
    pi >= DECISION_THRESHOLDS.minProfitabilityIndexForApproval &&
    paybackYears !== null &&
    paybackYears <= DECISION_THRESHOLDS.maxPaybackYearsForApproval
  ) {
    return 'Approve';
  }
  return 'Phased Implementation';
}
