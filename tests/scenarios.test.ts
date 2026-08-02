import { describe, it, expect } from 'vitest';
import { evaluateAllScenarios, BASE_SCENARIO_DEFINITIONS } from '../src/lib/finance/scenarios';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';

describe('Scenario Engine', () => {
  it('evaluates Optimistic, Base, and Pessimistic scenarios correctly', () => {
    const scenarioResults = evaluateAllScenarios(DEFAULT_FINANCIAL_ASSUMPTIONS);

    const { Optimistic, Base, Pessimistic } = scenarioResults;

    // Optimistic should have highest NPV
    expect(Optimistic.metrics.npv).toBeGreaterThan(Base.metrics.npv);
    expect(Optimistic.metrics.decisionStatus).toBe('Approve');

    // Base matches baseline metrics
    expect(Base.metrics.npv).toBeGreaterThan(0);

    // Pessimistic should have lower NPV than Base
    expect(Pessimistic.metrics.npv).toBeLessThan(Base.metrics.npv);
  });

  it('preserves base assumptions without mutating original object', () => {
    const originalCapex = DEFAULT_FINANCIAL_ASSUMPTIONS.automationEquipment;
    evaluateAllScenarios(DEFAULT_FINANCIAL_ASSUMPTIONS);

    expect(DEFAULT_FINANCIAL_ASSUMPTIONS.automationEquipment).toBe(originalCapex);
  });
});
