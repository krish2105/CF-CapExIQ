import { FinancialAssumptions, ScenarioDefinition, ScenarioResult, ScenarioType } from '../types/finance';
import { calculateCashFlowSchedule } from './cashflow';
import { calculateFinancialMetrics } from './metrics';

export const BASE_SCENARIO_DEFINITIONS: Record<Exclude<ScenarioType, 'Custom'>, ScenarioDefinition> = {
  Optimistic: {
    type: 'Optimistic',
    name: 'Optimistic Scenario',
    description: 'Lower capex, stronger realised savings & contribution margin, lower operating cost escalation, and lower hurdle rate (10.5%).',
    investmentMultiplier: 0.95,
    operatingBenefitMultiplier: 1.10,
    operatingCostMultiplier: 0.95,
    discountRate: 0.105,
  },
  Base: {
    type: 'Base',
    name: 'Base Case (Management Baseline)',
    description: 'Most likely management operational assumptions, vendor estimates, and 11.5% target WACC.',
    investmentMultiplier: 1.00,
    operatingBenefitMultiplier: 1.00,
    operatingCostMultiplier: 1.00,
    discountRate: 0.115,
  },
  Pessimistic: {
    type: 'Pessimistic',
    name: 'Pessimistic Scenario',
    description: 'Capital cost overrun (+15%), benefit shortfall (-25%), higher maintenance/power costs (+15%), and elevated discount rate (14.5%).',
    investmentMultiplier: 1.15,
    operatingBenefitMultiplier: 0.75,
    operatingCostMultiplier: 1.15,
    discountRate: 0.145,
  },
};

export function transformAssumptionsForScenario(
  baseAssumptions: FinancialAssumptions,
  definition: ScenarioDefinition
): FinancialAssumptions {
  const { investmentMultiplier, operatingBenefitMultiplier, operatingCostMultiplier, discountRate } = definition;

  return {
    ...baseAssumptions,
    automationEquipment: baseAssumptions.automationEquipment * investmentMultiplier,
    installationIntegration: baseAssumptions.installationIntegration * investmentMultiplier,
    softwareCybersecurity: baseAssumptions.softwareCybersecurity * investmentMultiplier,
    trainingLaunch: baseAssumptions.trainingLaunch * investmentMultiplier,

    year1OperatingSavings: baseAssumptions.year1OperatingSavings * operatingBenefitMultiplier,
    year1ContributionMargin: baseAssumptions.year1ContributionMargin * operatingBenefitMultiplier,

    year1AdditionalOpEx: baseAssumptions.year1AdditionalOpEx * operatingCostMultiplier,

    discountRate: discountRate,
    financeRateMIRR: discountRate,
    reinvestmentRateMIRR: discountRate,
  };
}

export function evaluateScenario(
  baseAssumptions: FinancialAssumptions,
  definition: ScenarioDefinition
): ScenarioResult {
  const scenarioAssumptions = transformAssumptionsForScenario(baseAssumptions, definition);
  const yearlyCashFlows = calculateCashFlowSchedule(scenarioAssumptions);
  const metrics = calculateFinancialMetrics(scenarioAssumptions, yearlyCashFlows);

  return {
    definition,
    metrics,
    yearlyCashFlows,
  };
}

export function evaluateAllScenarios(baseAssumptions: FinancialAssumptions): Record<Exclude<ScenarioType, 'Custom'>, ScenarioResult> {
  return {
    Optimistic: evaluateScenario(baseAssumptions, BASE_SCENARIO_DEFINITIONS.Optimistic),
    Base: evaluateScenario(baseAssumptions, BASE_SCENARIO_DEFINITIONS.Base),
    Pessimistic: evaluateScenario(baseAssumptions, BASE_SCENARIO_DEFINITIONS.Pessimistic),
  };
}

export function calculateExpectedNpv(
  scenarioResults: Record<Exclude<ScenarioType, 'Custom'>, ScenarioResult>,
  weights: { base: number; optimistic: number; pessimistic: number } = { base: 0.50, optimistic: 0.25, pessimistic: 0.25 }
): number {
  const baseNpv = scenarioResults.Base.metrics.npv;
  const optNpv = scenarioResults.Optimistic.metrics.npv;
  const pessNpv = scenarioResults.Pessimistic.metrics.npv;
  return (weights.base * baseNpv) + (weights.optimistic * optNpv) + (weights.pessimistic * pessNpv);
}
