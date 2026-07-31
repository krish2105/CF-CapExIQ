import { FinancialAssumptions, YearlyCashFlow } from '../types/finance';

export function calculateCashFlowSchedule(assumptions: FinancialAssumptions): YearlyCashFlow[] {
  const {
    automationEquipment,
    installationIntegration,
    softwareCybersecurity,
    trainingLaunch,
    initialWorkingCapital,
    depreciableCapexItems,
    projectLifeYears,
    year1OperatingSavings,
    annualSavingsGrowth,
    year1ContributionMargin,
    annualMarginGrowth,
    year1AdditionalOpEx,
    annualOpExGrowth,
    discountRate,
    corporateTaxRate,
    salvageValue,
    workingCapitalRecovery,
  } = assumptions;

  const totalCapex = automationEquipment + installationIntegration + softwareCybersecurity + trainingLaunch;

  // Calculate depreciable basis based on user toggles (defaults to 100% capex if not toggled off)
  let depreciableCapex = 0;
  const toggles = depreciableCapexItems || {
    automationEquipment: true,
    installationIntegration: true,
    softwareCybersecurity: true,
    trainingLaunch: true,
  };

  if (toggles.automationEquipment) depreciableCapex += automationEquipment;
  if (toggles.installationIntegration) depreciableCapex += installationIntegration;
  if (toggles.softwareCybersecurity) depreciableCapex += softwareCybersecurity;
  if (toggles.trainingLaunch) depreciableCapex += trainingLaunch;

  const projectLife = Math.max(1, Math.round(projectLifeYears));
  const annualDepreciation = Math.max(0, (depreciableCapex - salvageValue) / projectLife);

  const schedule: YearlyCashFlow[] = [];

  // Year 0 (Initial Outlay)
  const year0Fcf = -(totalCapex + initialWorkingCapital);
  schedule.push({
    year: 0,
    operatingSavings: 0,
    incrementalMargin: 0,
    totalOperatingBenefits: 0,
    additionalOpEx: 0,
    ebitda: 0,
    depreciation: 0,
    ebit: 0,
    tax: 0,
    nopat: 0,
    operatingCashFlow: 0,
    changeWorkingCapital: -initialWorkingCapital,
    salvageValue: 0,
    workingCapitalRecovery: 0,
    terminalCashFlow: 0,
    freeCashFlow: year0Fcf,
    discountFactor: 1.0,
    presentValue: year0Fcf,
    cumulativeCashFlow: year0Fcf,
    cumulativeDiscountedCashFlow: year0Fcf,
  });

  let runningCumulativeFcf = year0Fcf;
  let runningCumulativeDiscountedFcf = year0Fcf;

  for (let year = 1; year <= projectLife; year++) {
    const savings = year1OperatingSavings * Math.pow(1 + annualSavingsGrowth, year - 1);
    const margin = year1ContributionMargin * Math.pow(1 + annualMarginGrowth, year - 1);
    const benefits = savings + margin;
    const opex = year1AdditionalOpEx * Math.pow(1 + annualOpExGrowth, year - 1);
    const ebitda = benefits - opex;
    const ebit = ebitda - annualDepreciation;
    const tax = Math.max(0, ebit * corporateTaxRate);
    const nopat = ebit - tax;
    const ocf = nopat + annualDepreciation; // Equals EBITDA - Tax

    const isTerminalYear = year === projectLife;
    const termSalvage = isTerminalYear ? salvageValue : 0;
    const termNwcRec = isTerminalYear ? workingCapitalRecovery : 0;
    const terminalCashFlow = termSalvage + termNwcRec;

    const fcf = ocf + terminalCashFlow;
    const discountFactor = 1 / Math.pow(1 + discountRate, year);
    const pv = fcf * discountFactor;

    runningCumulativeFcf += fcf;
    runningCumulativeDiscountedFcf += pv;

    schedule.push({
      year,
      operatingSavings: savings,
      incrementalMargin: margin,
      totalOperatingBenefits: benefits,
      additionalOpEx: opex,
      ebitda,
      depreciation: annualDepreciation,
      ebit,
      tax,
      nopat,
      operatingCashFlow: ocf,
      changeWorkingCapital: isTerminalYear ? workingCapitalRecovery : 0,
      salvageValue: termSalvage,
      workingCapitalRecovery: termNwcRec,
      terminalCashFlow,
      freeCashFlow: fcf,
      discountFactor,
      presentValue: pv,
      cumulativeCashFlow: runningCumulativeFcf,
      cumulativeDiscountedCashFlow: runningCumulativeDiscountedFcf,
    });
  }

  return schedule;
}
