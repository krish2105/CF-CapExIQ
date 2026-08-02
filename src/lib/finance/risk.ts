import { FinancialAssumptions, FinancialMetrics, RiskAlert, RiskSeverity, ScenarioResult } from '../types/finance';
import { formatAED, formatPercent } from '../utils/formatting';

export function evaluateRiskAlerts(
  assumptions: FinancialAssumptions,
  metrics: FinancialMetrics,
  pessimisticResult?: ScenarioResult
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  // 1. Negative NPV
  if (metrics.npv < 0) {
    alerts.push({
      id: 'RISK-NPV-NEG',
      severity: 'Critical',
      title: 'Negative Net Present Value (NPV)',
      explanation: `Projected NPV is ${formatAED(metrics.npv)}. The project destroys shareholder value at the baseline discount rate of ${formatPercent(assumptions.discountRate)}.`,
      triggeringMetric: `NPV = ${formatAED(metrics.npv)}`,
      managementResponse: 'Reject project or renegotiate equipment capex down by at least ' + formatAED(Math.abs(metrics.npv)) + '.',
    });
  }

  // 2. IRR Below Discount Rate
  if (metrics.irr !== null && metrics.irr < assumptions.discountRate) {
    alerts.push({
      id: 'RISK-IRR-HURDLE',
      severity: 'High',
      title: 'Internal Rate of Return Below Hurdle Rate',
      explanation: `Internal Rate of Return (${formatPercent(metrics.irr)}) is below NovaRetail's WACC hurdle rate of ${formatPercent(assumptions.discountRate)}.`,
      triggeringMetric: `IRR (${formatPercent(metrics.irr)}) < WACC (${formatPercent(assumptions.discountRate)})`,
      managementResponse: 'Require vendor price concessions or enhance year-1 operational efficiency targets before committing capital.',
    });
  }

  // 3. MIRR Below Discount Rate
  if (metrics.mirr < assumptions.discountRate) {
    alerts.push({
      id: 'RISK-MIRR-HURDLE',
      severity: 'High',
      title: 'Modified IRR Below Hurdle Rate',
      explanation: `Modified IRR (${formatPercent(metrics.mirr)}), assuming cash reinvestment at ${formatPercent(assumptions.reinvestmentRateMIRR)}, is lower than the hurdle rate of ${formatPercent(assumptions.discountRate)}.`,
      triggeringMetric: `MIRR (${formatPercent(metrics.mirr)}) < WACC (${formatPercent(assumptions.discountRate)})`,
      managementResponse: 'Recognize realistic cash reinvestment constraints in committee review.',
    });
  }

  // 4. PI Below 1.0
  if (metrics.profitabilityIndex < 1.0) {
    alerts.push({
      id: 'RISK-PI-LOW',
      severity: 'High',
      title: 'Profitability Index Below Threshold',
      explanation: `Profitability Index is ${metrics.profitabilityIndex.toFixed(2)}, generating less than AED 1.00 of present value per AED 1.00 of initial outlay.`,
      triggeringMetric: `PI = ${metrics.profitabilityIndex.toFixed(2)}`,
      managementResponse: 'Re-evaluate capital allocation against competing omnichannel automation initiatives.',
    });
  }

  // 5. Payback Beyond Management Threshold (> 4.5 Years)
  if (metrics.paybackPeriodYears === null || metrics.paybackPeriodYears > 4.5) {
    const paybackText = metrics.paybackPeriodYears ? `${metrics.paybackPeriodYears.toFixed(1)} years` : 'Exceeds project life';
    alerts.push({
      id: 'RISK-PAYBACK-LONG',
      severity: 'Medium',
      title: 'Extended Payback Period',
      explanation: `Undiscounted payback period is ${paybackText}, exceeding management's preferred maximum 4.5-year liquidity window.`,
      triggeringMetric: `Payback = ${paybackText}`,
      managementResponse: 'Structure milestone-based supplier payments to preserve liquidity.',
    });
  }

  // 6. Discounted Payback Exceeds Project Life
  if (metrics.discountedPaybackPeriodYears === null) {
    alerts.push({
      id: 'RISK-DISC-PAYBACK-NONE',
      severity: 'High',
      title: 'Discounted Capital Outlay Unrecovered',
      explanation: `Discounted cash flows fail to recover the initial AED ${formatAED(metrics.totalInitialOutlay)} investment within the 6-year project lifecycle.`,
      triggeringMetric: 'Discounted Payback = > 6.0 Years',
      managementResponse: 'Shorten integration ramp timeline or extend equipment warranty terms.',
    });
  }

  // 7. Negative Pessimistic NPV
  if (pessimisticResult && pessimisticResult.metrics.npv < 0) {
    alerts.push({
      id: 'RISK-PESSIMISTIC-NEG',
      severity: 'High',
      title: 'Downside Exposure in Pessimistic Scenario',
      explanation: `Under adverse operational stress (+15% capex overrun, -25% benefit shortfall, 14.5% WACC), project NPV collapses to ${formatAED(pessimisticResult.metrics.npv)}.`,
      triggeringMetric: `Pessimistic NPV = ${formatAED(pessimisticResult.metrics.npv)}`,
      managementResponse: 'Establish strict stage-gate capital release triggers (phased rollout).',
    });
  }

  // 8. High Salvage Value Dependence
  const salvagePv = assumptions.salvageValue / Math.pow(1 + assumptions.discountRate, assumptions.projectLifeYears);
  if (metrics.npv > 0 && salvagePv / metrics.npv > 0.15) {
    const salvagePct = ((salvagePv / metrics.npv) * 100).toFixed(1);
    alerts.push({
      id: 'RISK-SALVAGE-DEP',
      severity: 'Medium',
      title: 'High Terminal Salvage Value Dependence',
      explanation: `Present value of Year 6 salvage value (${formatAED(salvagePv)}) accounts for ${salvagePct}% of total baseline NPV.`,
      triggeringMetric: `Salvage PV Share = ${salvagePct}%`,
      managementResponse: 'Obtain residual value guarantee or secondary equipment buy-back contract from automation vendor.',
    });
  }

  // 9. Low Tolerance to Benefit Shortfall
  if (metrics.maxOperatingBenefitShortfallPct < 15.0) {
    alerts.push({
      id: 'RISK-BENEFIT-SENS',
      severity: 'High',
      title: 'High Sensitivity to Operating Benefit Shortfall',
      explanation: `A minor benefit shortfall of ${metrics.maxOperatingBenefitShortfallPct.toFixed(1)}% erases project NPV entirely.`,
      triggeringMetric: `Max Shortfall Tolerance = ${metrics.maxOperatingBenefitShortfallPct.toFixed(1)}%`,
      managementResponse: 'Implement SLA performance penalty clauses in WCS software integrator contracts.',
    });
  }

  // 10. Multiple IRRs Warning
  if (metrics.irrWarning) {
    alerts.push({
      id: 'RISK-IRR-MULTIPLE',
      severity: 'Low',
      title: 'Non-Standard Cash Flow Sign Changes',
      explanation: metrics.irrWarning,
      triggeringMetric: 'Multiple Sign Changes Detected',
      managementResponse: 'Rely on NPV and MIRR metrics for primary capital budgeting decisions.',
    });
  }

  // Sort by severity: Critical > High > Medium > Low
  const severityMap: Record<RiskSeverity, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
  return alerts.sort((a, b) => severityMap[a.severity] - severityMap[b.severity]);
}
