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
    annualBenefitProfile,
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

  // Salvage guard: the residual value used to reduce the depreciable basis can never exceed
  // the depreciable basis itself. Without this clamp an over-stated salvage assumption makes
  // (depreciableCapex - salvageValue) negative, which pushes EBIT above EBITDA, understates tax
  // and silently inflates NPV. Depreciation floors at zero (fully-depreciated / non-depreciable basis).
  const depreciationSalvageBasis = Math.min(Math.max(0, salvageValue), depreciableCapex);
  const annualDepreciation = Math.max(0, (depreciableCapex - depreciationSalvageBasis) / projectLife);

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
    // PRESENTATIONAL FIELD ONLY - do not add this to freeCashFlow.
    // Year 0: the working-capital outflow is already inside `freeCashFlow` (year0Fcf) below.
    // Operating years: 0 (this model assumes no incremental NWC build after commissioning).
    // Terminal year: the recovery shown here is already carried in `terminalCashFlow`.
    // Consumers must display either `changeWorkingCapital` or the terminal/year-0 flows, never both.
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
    // Optional per-year shape index (see `AnnualBenefitProfile`). When no index is supplied for a
    // line - the legacy path, and the path taken by every geometric archetype - the expression
    // below is byte-for-byte the original `year1Value * (1 + growth)^(year-1)` calculation.
    const savingsIndex = annualBenefitProfile?.operatingSavingsIndex?.[year - 1];
    const marginIndex = annualBenefitProfile?.contributionMarginIndex?.[year - 1];
    const opExIndex = annualBenefitProfile?.additionalOpExIndex?.[year - 1];

    const savings =
      savingsIndex === undefined
        ? year1OperatingSavings * Math.pow(1 + annualSavingsGrowth, year - 1)
        : year1OperatingSavings * savingsIndex;
    const margin =
      marginIndex === undefined
        ? year1ContributionMargin * Math.pow(1 + annualMarginGrowth, year - 1)
        : year1ContributionMargin * marginIndex;
    const benefits = savings + margin;
    const opex =
      opExIndex === undefined
        ? year1AdditionalOpEx * Math.pow(1 + annualOpExGrowth, year - 1)
        : year1AdditionalOpEx * opExIndex;
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
      // PRESENTATIONAL FIELD ONLY (see Year 0 note above): zero during operating years, and in the
      // terminal year it restates the working-capital recovery that is ALREADY included in
      // `terminalCashFlow` / `freeCashFlow`. Never sum `changeWorkingCapital` and `terminalCashFlow`.
      changeWorkingCapital: isTerminalYear ? termNwcRec : 0,
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
