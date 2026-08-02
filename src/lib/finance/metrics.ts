import { FinancialAssumptions, FinancialMetrics, YearlyCashFlow } from '../types/finance';
import { calculateCashFlowSchedule } from './cashflow';

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
  const decisionStatus = determineDecisionStatus(npv, irr, r, profitabilityIndex, paybackPeriodYears);

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

function calculateMIRR(fcfs: number[], financeRate: number, reinvestmentRate: number): number {
  const n = fcfs.length - 1;
  if (n <= 0) return 0;

  let pvOutflows = 0;
  let tvInflows = 0;

  for (let t = 0; t <= n; t++) {
    if (fcfs[t] < 0) {
      pvOutflows += Math.abs(fcfs[t]) / Math.pow(1 + financeRate, t);
    } else {
      tvInflows += fcfs[t] * Math.pow(1 + reinvestmentRate, n - t);
    }
  }

  if (pvOutflows === 0) return 0;
  const mirrVal = Math.pow(tvInflows / pvOutflows, 1 / n) - 1;
  return isNaN(mirrVal) || !isFinite(mirrVal) ? 0 : mirrVal;
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

function calculateBreakEvenBenefit(assumptions: FinancialAssumptions): {
  breakEvenAnnualOperatingBenefit: number;
  maxOperatingBenefitShortfallPct: number;
} {
  const baseBenefits = assumptions.year1OperatingSavings + assumptions.year1ContributionMargin;
  let lowMult = 0.0;
  let highMult = 2.0;

  for (let i = 0; i < 50; i++) {
    const midMult = (lowMult + highMult) / 2;
    const testAssumptions: FinancialAssumptions = {
      ...assumptions,
      year1OperatingSavings: assumptions.year1OperatingSavings * midMult,
      year1ContributionMargin: assumptions.year1ContributionMargin * midMult,
    };
    const testSched = calculateCashFlowSchedule(testAssumptions);
    const testNpv = testSched.reduce((sum, item) => sum + item.presentValue, 0);

    if (Math.abs(testNpv) < 1) {
      const breakEvenBenefit = baseBenefits * midMult;
      const shortfallPct = baseBenefits > 0 ? ((baseBenefits - breakEvenBenefit) / baseBenefits) * 100 : 0;
      return {
        breakEvenAnnualOperatingBenefit: breakEvenBenefit,
        maxOperatingBenefitShortfallPct: shortfallPct,
      };
    }

    if (testNpv > 0) {
      highMult = midMult;
    } else {
      lowMult = midMult;
    }
  }

  const breakEvenBenefit = baseBenefits * ((lowMult + highMult) / 2);
  const shortfallPct = baseBenefits > 0 ? ((baseBenefits - breakEvenBenefit) / baseBenefits) * 100 : 0;
  return {
    breakEvenAnnualOperatingBenefit: breakEvenBenefit,
    maxOperatingBenefitShortfallPct: shortfallPct,
  };
}

function determineDecisionStatus(
  npv: number,
  irr: number | null,
  wacc: number,
  pi: number,
  paybackYears: number | null
): 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject' {
  if (npv < -2000000) return 'Reject';
  if (npv < 0) return 'Delay Pending Evidence';
  if (npv > 0 && irr !== null && irr >= wacc && pi >= 1.05 && paybackYears !== null && paybackYears <= 4.5) {
    return 'Approve';
  }
  return 'Phased Implementation';
}
