import {
  FinancialAssumptions,
  SensitivityVariableResult,
  TwoWayMatrix,
  TornadoItem,
} from '../types/finance';
import { calculateCashFlowSchedule } from './cashflow';
import { calculateFinancialMetrics } from './metrics';

export function calculateOneWaySensitivity(
  baseAssumptions: FinancialAssumptions
): SensitivityVariableResult[] {
  const multipliers = [0.8, 0.9, 1.0, 1.1, 1.2];

  // 1. Initial CaPeX Sensitivity
  const capexResult = evaluateMultiplierSensitivity(
    baseAssumptions,
    'automationEquipment',
    'Initial Capital Expenditure',
    'AED',
    (a, mult) => ({
      ...a,
      automationEquipment: a.automationEquipment * mult,
      installationIntegration: a.installationIntegration * mult,
      softwareCybersecurity: a.softwareCybersecurity * mult,
      trainingLaunch: a.trainingLaunch * mult,
    }),
    multipliers
  );

  // 2. Annual Operating Benefits Sensitivity
  const benefitsResult = evaluateMultiplierSensitivity(
    baseAssumptions,
    'year1OperatingSavings',
    'Annual Operating Benefits',
    'AED/year',
    (a, mult) => ({
      ...a,
      year1OperatingSavings: a.year1OperatingSavings * mult,
      year1ContributionMargin: a.year1ContributionMargin * mult,
    }),
    multipliers
  );

  // 3. Operating Costs Sensitivity
  const opexResult = evaluateMultiplierSensitivity(
    baseAssumptions,
    'year1AdditionalOpEx',
    'Additional OpEx',
    'AED/year',
    (a, mult) => ({
      ...a,
      year1AdditionalOpEx: a.year1AdditionalOpEx * mult,
    }),
    multipliers
  );

  // 4. Discount Rate Sensitivity (WACC)
  const discountSteps = [0.085, 0.10, 0.115, 0.13, 0.145];
  const discountPoints = discountSteps.map((rate) => {
    const testA = { ...baseAssumptions, discountRate: rate, financeRateMIRR: rate, reinvestmentRateMIRR: rate };
    const m = calculateFinancialMetrics(testA);
    return {
      multiplier: rate / baseAssumptions.discountRate,
      label: `${(rate * 100).toFixed(1)}%`,
      parameterValue: rate,
      npv: m.npv,
      irr: m.irr,
      decisionStatus: m.decisionStatus,
    };
  });
  const discountResult: SensitivityVariableResult = {
    variableKey: 'discountRate',
    displayName: 'Discount Rate (WACC)',
    unit: '%',
    baseValue: baseAssumptions.discountRate,
    points: discountPoints,
    npvImpactRange: Math.abs(discountPoints[0].npv - discountPoints[discountPoints.length - 1].npv),
  };

  // 5. Savings Growth Sensitivity
  const growthSteps = [0.01, 0.025, 0.04, 0.055, 0.07];
  const growthPoints = growthSteps.map((g) => {
    const testA = { ...baseAssumptions, annualSavingsGrowth: g };
    const m = calculateFinancialMetrics(testA);
    return {
      multiplier: g / (baseAssumptions.annualSavingsGrowth || 0.04),
      label: `${(g * 100).toFixed(1)}%`,
      parameterValue: g,
      npv: m.npv,
      irr: m.irr,
      decisionStatus: m.decisionStatus,
    };
  });
  const growthResult: SensitivityVariableResult = {
    variableKey: 'annualSavingsGrowth',
    displayName: 'Savings Growth Rate',
    unit: '%',
    baseValue: baseAssumptions.annualSavingsGrowth,
    points: growthPoints,
    npvImpactRange: Math.abs(growthPoints[growthPoints.length - 1].npv - growthPoints[0].npv),
  };

  // 6. Project Life Sensitivity
  const lifeSteps = [4, 5, 6, 7, 8];
  const lifePoints = lifeSteps.map((years) => {
    const testA = { ...baseAssumptions, projectLifeYears: years };
    const m = calculateFinancialMetrics(testA);
    return {
      multiplier: years / baseAssumptions.projectLifeYears,
      label: `${years} yrs`,
      parameterValue: years,
      npv: m.npv,
      irr: m.irr,
      decisionStatus: m.decisionStatus,
    };
  });
  const lifeResult: SensitivityVariableResult = {
    variableKey: 'projectLifeYears',
    displayName: 'Project Life',
    unit: 'years',
    baseValue: baseAssumptions.projectLifeYears,
    points: lifePoints,
    npvImpactRange: Math.abs(lifePoints[lifePoints.length - 1].npv - lifePoints[0].npv),
  };

  // 7. Salvage Value Sensitivity
  const salvageResult = evaluateMultiplierSensitivity(
    baseAssumptions,
    'salvageValue',
    'Salvage Value',
    'AED',
    (a, mult) => ({
      ...a,
      salvageValue: a.salvageValue * mult,
    }),
    multipliers
  );

  return [capexResult, benefitsResult, opexResult, discountResult, growthResult, lifeResult, salvageResult];
}

function evaluateMultiplierSensitivity(
  baseAssumptions: FinancialAssumptions,
  key: keyof FinancialAssumptions,
  displayName: string,
  unit: string,
  transform: (a: FinancialAssumptions, mult: number) => FinancialAssumptions,
  multipliers: number[]
): SensitivityVariableResult {
  const baseVal = baseAssumptions[key] as number;
  const points = multipliers.map((mult) => {
    const testA = transform(baseAssumptions, mult);
    const m = calculateFinancialMetrics(testA);
    return {
      multiplier: mult,
      label: `${Math.round(mult * 100)}%`,
      parameterValue: baseVal * mult,
      npv: m.npv,
      irr: m.irr,
      decisionStatus: m.decisionStatus,
    };
  });

  const minNpv = Math.min(...points.map((p) => p.npv));
  const maxNpv = Math.max(...points.map((p) => p.npv));

  return {
    variableKey: key,
    displayName,
    unit,
    baseValue: baseVal,
    points,
    npvImpactRange: maxNpv - minNpv,
  };
}

export function calculateTwoWaySensitivity(
  baseAssumptions: FinancialAssumptions
): { rateVsBenefitMatrix: TwoWayMatrix; capexVsBenefitMatrix: TwoWayMatrix } {
  // Matrix 1: Discount Rate vs Operating Benefits Multiplier
  const discountRates = [0.085, 0.10, 0.115, 0.13, 0.145];
  const benefitMults = [0.75, 0.90, 1.00, 1.10, 1.25];

  const matrix1Grid = discountRates.map((rate) => {
    return benefitMults.map((bMult) => {
      const testA: FinancialAssumptions = {
        ...baseAssumptions,
        discountRate: rate,
        financeRateMIRR: rate,
        reinvestmentRateMIRR: rate,
        year1OperatingSavings: baseAssumptions.year1OperatingSavings * bMult,
        year1ContributionMargin: baseAssumptions.year1ContributionMargin * bMult,
      };
      const m = calculateFinancialMetrics(testA);
      return {
        rowValue: rate,
        colValue: bMult,
        npv: m.npv,
        decisionStatus: m.decisionStatus,
      };
    });
  });

  const rateVsBenefitMatrix: TwoWayMatrix = {
    rowLabel: 'Discount Rate (WACC)',
    colLabel: 'Operating Benefits Multiplier',
    rowValues: discountRates,
    colValues: benefitMults,
    matrix: matrix1Grid,
  };

  // Matrix 2: CaPeX Multiplier vs Operating Benefits Multiplier
  const capexMults = [0.80, 0.90, 1.00, 1.10, 1.20];
  const matrix2Grid = capexMults.map((cMult) => {
    return benefitMults.map((bMult) => {
      const testA: FinancialAssumptions = {
        ...baseAssumptions,
        automationEquipment: baseAssumptions.automationEquipment * cMult,
        installationIntegration: baseAssumptions.installationIntegration * cMult,
        softwareCybersecurity: baseAssumptions.softwareCybersecurity * cMult,
        trainingLaunch: baseAssumptions.trainingLaunch * cMult,
        year1OperatingSavings: baseAssumptions.year1OperatingSavings * bMult,
        year1ContributionMargin: baseAssumptions.year1ContributionMargin * bMult,
      };
      const m = calculateFinancialMetrics(testA);
      return {
        rowValue: cMult,
        colValue: bMult,
        npv: m.npv,
        decisionStatus: m.decisionStatus,
      };
    });
  });

  const capexVsBenefitMatrix: TwoWayMatrix = {
    rowLabel: 'CaPeX Multiplier',
    colLabel: 'Operating Benefits Multiplier',
    rowValues: capexMults,
    colValues: benefitMults,
    matrix: matrix2Grid,
  };

  return { rateVsBenefitMatrix, capexVsBenefitMatrix };
}

export function generateTornadoChartData(baseAssumptions: FinancialAssumptions): TornadoItem[] {
  const baseMetrics = calculateFinancialMetrics(baseAssumptions);
  const baseNpv = baseMetrics.npv;

  const oneWayResults = calculateOneWaySensitivity(baseAssumptions);

  const tornadoItems: TornadoItem[] = oneWayResults.map((item) => {
    const lowPoint = item.points[0]; // e.g., 0.8x or lowest value
    const highPoint = item.points[item.points.length - 1]; // e.g., 1.2x or highest value

    return {
      variableName: item.displayName,
      lowValueLabel: lowPoint.label,
      highValueLabel: highPoint.label,
      npvLow: lowPoint.npv,
      npvHigh: highPoint.npv,
      baseNpv,
      spread: Math.abs(highPoint.npv - lowPoint.npv),
    };
  });

  // Sort descending by spread magnitude
  return tornadoItems.sort((a, b) => b.spread - a.spread);
}
