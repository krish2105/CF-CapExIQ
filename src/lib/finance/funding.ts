import { FundingSourceItem, FundingAnalysisResult } from '../types/finance';

export const DEFAULT_FUNDING_SOURCES: FundingSourceItem[] = [
  { type: 'Cash', amount: 9600000, percentage: 40, annualInterestRate: 0.0, termYears: 0 },
  { type: 'Bank Debt', amount: 9600000, percentage: 40, annualInterestRate: 0.065, termYears: 5 },
  { type: 'Lease Financing', amount: 4800000, percentage: 20, annualInterestRate: 0.058, termYears: 6 },
];

export function calculateFundingAnalysis(
  sources: FundingSourceItem[],
  year1Ebitda: number,
  yearlyCfads?: number[]
): FundingAnalysisResult {
  const totalFunding = sources.reduce((sum, s) => sum + s.amount, 0);

  const annualDebtService = sources.reduce((sum, s) => {
    if (s.amount === 0 || s.annualInterestRate === 0 || s.termYears === 0) return sum;
    // Equal annual payment formula: P * (r / (1 - (1+r)^-n))
    const r = s.annualInterestRate;
    const n = s.termYears;
    const payment = s.amount * (r / (1 - Math.pow(1 + r, -n)));
    return sum + payment;
  }, 0);

  const weightedCostOfCapital = totalFunding > 0
    ? sources.reduce((sum, s) => sum + (s.amount / totalFunding) * s.annualInterestRate, 0)
    : 0;

  // Bankable DSCR using CFADS (Cash Flow Available for Debt Service)
  const cfadsBase = (yearlyCfads && yearlyCfads.length > 0) ? yearlyCfads[0] : year1Ebitda;
  const dscr = annualDebtService > 0 ? cfadsBase / annualDebtService : 999;

  let covenantAlert: string | undefined = undefined;
  if (dscr < 1.25 && annualDebtService > 0) {
    covenantAlert = `Bank Debt Covenant Alert: Projected CFADS DSCR (${dscr.toFixed(2)}x) is below the standard bank debt covenant minimum threshold of 1.25x.`;
  }

  return {
    totalFunding,
    weightedCostOfCapital,
    annualDebtService,
    debtServiceCoverageRatio: dscr,
    covenantAlert,
  };
}
