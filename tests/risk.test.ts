import { describe, it, expect } from 'vitest';
import { evaluateRiskAlerts } from '../src/lib/finance/risk';
import { calculateFinancialMetrics } from '../src/lib/finance/metrics';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '../src/lib/data/defaultAssumptions';
import { evaluateScenario, BASE_SCENARIO_DEFINITIONS } from '../src/lib/finance/scenarios';

describe('Risk Alert Engine', () => {
  it('evaluates baseline risk alerts for NovaRetail GCC', () => {
    const metrics = calculateFinancialMetrics(DEFAULT_FINANCIAL_ASSUMPTIONS);
    const pessimisticResult = evaluateScenario(DEFAULT_FINANCIAL_ASSUMPTIONS, BASE_SCENARIO_DEFINITIONS.Pessimistic);

    const alerts = evaluateRiskAlerts(DEFAULT_FINANCIAL_ASSUMPTIONS, metrics, pessimisticResult);

    expect(Array.isArray(alerts)).toBe(true);
    // Should not contain critical negative NPV alert under baseline
    const criticalNpvAlert = alerts.find((a) => a.id === 'RISK-NPV-NEG');
    expect(criticalNpvAlert).toBeUndefined();
  });

  it('triggers Critical Negative NPV alert when parameters are adverse', () => {
    const adverseAssumptions = {
      ...DEFAULT_FINANCIAL_ASSUMPTIONS,
      automationEquipment: 35000000, // Excessive capex
      year1OperatingSavings: 2000000, // Reduced savings
    };

    const metrics = calculateFinancialMetrics(adverseAssumptions);
    const alerts = evaluateRiskAlerts(adverseAssumptions, metrics);

    const npvAlert = alerts.find((a) => a.id === 'RISK-NPV-NEG');
    expect(npvAlert).toBeDefined();
    expect(npvAlert?.severity).toBe('Critical');
  });
});
