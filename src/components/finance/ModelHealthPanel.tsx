'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export interface DiagnosticCheck {
  id: string;
  name: string;
  category: 'Cash Flow' | 'Assumptions' | 'Reconciliation' | 'Data';
  status: 'Healthy' | 'Warning' | 'Critical';
  detail: string;
}

/** AED tolerance for internal reconciliation of floating-point sums. */
const RECONCILIATION_TOLERANCE_AED = 1;

export const ModelHealthPanel: React.FC = () => {
  const { getActiveScenarioResult, getActiveAssumptions } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const assumptions = getActiveAssumptions();
  const cashFlows = scenarioResult.yearlyCashFlows;
  const metrics = scenarioResult.metrics;

  /* ------------------------------ Real assertions ------------------------------ */

  const expectedLifeYears = Math.max(1, Math.round(assumptions.projectLifeYears));
  const scheduleOperatingYears = Math.max(0, cashFlows.length - 1);
  const scheduleLengthOk = scheduleOperatingYears === expectedLifeYears;

  const year0Fcf = cashFlows[0]?.freeCashFlow ?? 0;
  const expectedYear0Outflow = -(metrics.totalInitialCapex + metrics.initialWorkingCapital);
  const year0Variance = Math.abs(year0Fcf - expectedYear0Outflow);
  const year0Ok = year0Variance < RECONCILIATION_TOLERANCE_AED;

  const summedPresentValues = cashFlows.reduce((sum, row) => sum + row.presentValue, 0);
  const npvVariance = Math.abs(summedPresentValues - metrics.npv);
  const npvReconciles = npvVariance < RECONCILIATION_TOLERANCE_AED;

  const freeCashFlows = cashFlows.map((row) => row.freeCashFlow);
  let signChanges = 0;
  for (let i = 0; i < freeCashFlows.length - 1; i++) {
    const a = freeCashFlows[i];
    const b = freeCashFlows[i + 1];
    if ((a < 0 && b > 0) || (a > 0 && b < 0)) signChanges++;
  }

  const salvageValue = assumptions.salvageValue;
  const salvageWithinCapex = salvageValue <= metrics.totalInitialCapex;

  const finalYear = cashFlows[cashFlows.length - 1];
  const workingCapitalRecovered = (finalYear?.workingCapitalRecovery ?? 0) > 0;

  const numericValues = [metrics.npv, metrics.profitabilityIndex, metrics.roiPct];
  const numericIntegrityOk = numericValues.every((v) => !isNaN(v) && isFinite(v));

  const checks: DiagnosticCheck[] = [
    {
      id: 'check-schedule-length',
      name: 'Schedule Length vs. Project Life',
      category: 'Cash Flow',
      status: scheduleLengthOk ? 'Healthy' : 'Critical',
      detail: scheduleLengthOk
        ? `Schedule runs Year 0 plus ${scheduleOperatingYears} operating years, matching the ${expectedLifeYears}-year project life.`
        : `Schedule holds ${scheduleOperatingYears} operating years but the project life assumption is ${expectedLifeYears} years.`,
    },
    {
      id: 'check-year0-outflow',
      name: 'Year-0 Outflow = Capex + Working Capital',
      category: 'Reconciliation',
      status: year0Ok ? 'Healthy' : 'Critical',
      detail: year0Ok
        ? `Year-0 free cash flow ${formatAED(year0Fcf)} equals capex ${formatAED(
            metrics.totalInitialCapex
          )} plus working capital ${formatAED(metrics.initialWorkingCapital)}.`
        : `Year-0 free cash flow ${formatAED(year0Fcf)} differs from capex + working capital ${formatAED(
            expectedYear0Outflow
          )} by ${formatAED(year0Variance, 2)}.`,
    },
    {
      id: 'check-npv-reconciliation',
      name: 'Σ Present Values = Reported NPV',
      category: 'Reconciliation',
      status: npvReconciles ? 'Healthy' : 'Critical',
      detail: npvReconciles
        ? `Present values across all ${cashFlows.length} schedule rows sum to ${formatAED(
            summedPresentValues
          )}, matching the reported NPV within AED ${RECONCILIATION_TOLERANCE_AED.toFixed(2)}.`
        : `Present values sum to ${formatAED(summedPresentValues)} against a reported NPV of ${formatAED(
            metrics.npv
          )} — variance ${formatAED(npvVariance, 2)}.`,
    },
    {
      id: 'check-irr-sign-changes',
      name: 'IRR Cash-Flow Sign Changes',
      category: 'Cash Flow',
      status: signChanges === 1 ? 'Healthy' : signChanges === 0 ? 'Critical' : 'Warning',
      detail:
        signChanges === 1
          ? `Exactly one sign change in the cash-flow stream, so the IRR of ${formatPercent(
              metrics.irr
            )} is unique and well defined.`
          : signChanges === 0
          ? 'No sign change in the cash-flow stream — IRR is undefined and NPV must drive the decision.'
          : `${signChanges} sign changes detected: multiple IRRs may exist. ${
              metrics.irrWarning ?? 'NPV takes precedence over IRR.'
            }`,
    },
    {
      id: 'check-salvage-bound',
      name: 'Salvage Value ≤ Capital Expenditure',
      category: 'Assumptions',
      status: salvageWithinCapex ? 'Healthy' : 'Critical',
      detail: salvageWithinCapex
        ? `Terminal salvage ${formatAED(salvageValue)} is ${(
            (salvageValue / Math.max(1, metrics.totalInitialCapex)) *
            100
          ).toFixed(1)}% of the ${formatAED(metrics.totalInitialCapex)} capital base.`
        : `Terminal salvage ${formatAED(salvageValue)} exceeds the ${formatAED(
            metrics.totalInitialCapex
          )} capital base, which is not a recoverable value.`,
    },
    {
      id: 'check-working-capital',
      name: 'Working Capital Recovery',
      category: 'Cash Flow',
      status: workingCapitalRecovered ? 'Healthy' : 'Warning',
      detail: workingCapitalRecovered
        ? `${formatAED(finalYear.workingCapitalRecovery)} recovered in Year ${finalYear.year} against ${formatAED(
            metrics.initialWorkingCapital
          )} injected at Year 0.`
        : 'No working-capital recovery recorded in the final year of the schedule.',
    },
    {
      id: 'check-numeric-integrity',
      name: 'Numeric Integrity (NaN / Infinity)',
      category: 'Data',
      status: numericIntegrityOk ? 'Healthy' : 'Critical',
      detail: numericIntegrityOk
        ? 'NPV, profitability index and ROI are all finite numbers.'
        : 'A NaN or Infinity value reached the metric outputs — check the assumption inputs.',
    },
  ];

  const warningCount = checks.filter((c) => c.status === 'Warning').length;
  const criticalCount = checks.filter((c) => c.status === 'Critical').length;
  const overallHealth: DiagnosticCheck['status'] =
    criticalCount > 0 ? 'Critical' : warningCount > 0 ? 'Warning' : 'Healthy';

  const statusTextClass = (status: DiagnosticCheck['status']) =>
    status === 'Healthy' ? 'text-success' : status === 'Warning' ? 'text-amber-500' : 'text-destructive';

  const StatusIcon = ({ status }: { status: DiagnosticCheck['status'] }) => {
    const className = `h-3.5 w-3.5 ${statusTextClass(status)}`;
    if (status === 'Healthy') return <CheckCircle2 className={className} />;
    if (status === 'Warning') return <AlertTriangle className={className} />;
    return <XCircle className={className} />;
  };

  return (
    <div className="glass-panel p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Activity className="h-4 w-4 text-primary" /> Model Diagnostics & Financial Health
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-pill font-mono text-[10px] font-bold ${
            overallHealth === 'Healthy'
              ? 'bg-success/20 text-success border border-success/30'
              : overallHealth === 'Warning'
              ? 'bg-warning/20 text-warning border border-warning/30'
              : 'bg-destructive/20 text-destructive border border-destructive/30'
          }`}
        >
          {overallHealth} System Health
        </span>
      </div>

      <div className="space-y-2 font-mono">
        {checks.map((check) => (
          <div key={check.id} className="flex items-start justify-between gap-2 p-2 rounded-card bg-muted/40 border border-border">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <CheckCircle2 className={`h-3.5 w-3.5 ${check.status === 'Healthy' ? 'text-success' : 'text-warning'}`} />
                <span>{check.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-card text-muted-foreground font-sans">
                  {check.category}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-sans">{check.detail}</p>
            </div>
            <span className={`text-[10px] font-bold ${check.status === 'Healthy' ? 'text-success' : 'text-warning'}`}>
              {check.status}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground font-sans leading-relaxed border-t border-border pt-2">
        Every check above is an assertion evaluated against the active scenario&apos;s cash-flow schedule and metrics.
        No result is asserted against any external spreadsheet.
      </p>
    </div>
  );
};
