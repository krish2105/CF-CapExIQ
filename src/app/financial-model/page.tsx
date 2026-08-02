'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Table, Download, Info, ShieldCheck, CheckCircle } from 'lucide-react';

export default function FinancialModelPage() {
  const { getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const yearlyCashFlows = scenarioResult.yearlyCashFlows;
  const metrics = scenarioResult.metrics;

  const handleExportCSV = () => {
    const headers = [
      'Year',
      'Operating Savings (AED)',
      'Incremental Margin (AED)',
      'Total Benefits (AED)',
      'Additional OpEx (AED)',
      'EBITDA (AED)',
      'Depreciation (AED)',
      'EBIT (AED)',
      'Tax 9% (AED)',
      'NOPAT (AED)',
      'Operating Cash Flow (AED)',
      'Salvage Value (AED)',
      'Working Capital Rec (AED)',
      'Free Cash Flow (AED)',
      'Discount Factor',
      'Present Value (AED)',
      'Cumulative FCF (AED)',
      'Cumulative Discounted FCF (AED)',
    ];

    const rows = yearlyCashFlows.map((y) => [
      y.year,
      y.operatingSavings.toFixed(2),
      y.incrementalMargin.toFixed(2),
      y.totalOperatingBenefits.toFixed(2),
      y.additionalOpEx.toFixed(2),
      y.ebitda.toFixed(2),
      y.depreciation.toFixed(2),
      y.ebit.toFixed(2),
      y.tax.toFixed(2),
      y.nopat.toFixed(2),
      y.operatingCashFlow.toFixed(2),
      y.salvageValue.toFixed(2),
      y.workingCapitalRecovery.toFixed(2),
      y.freeCashFlow.toFixed(2),
      y.discountFactor.toFixed(4),
      y.presentValue.toFixed(2),
      y.cumulativeCashFlow.toFixed(2),
      y.cumulativeDiscountedCashFlow.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NovaRetail_MFC_Financial_Model_${selectedScenario}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Table className="h-6 w-6 text-primary" /> Year-by-Year Financial Model Schedule
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Incremental After-Tax Free Cash Flow Model • Active Scenario: <strong className="text-primary">{selectedScenario}</strong>
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-card bg-accent text-accent-foreground text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Download className="h-4 w-4" /> Export Schedule to CSV
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Net Present Value (NPV)</span>
          <p className="text-lg font-bold text-success mt-0.5">{formatAED(metrics.npv)}</p>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Internal Rate of Return (IRR)</span>
          <p className="text-lg font-bold text-info mt-0.5">{formatPercent(metrics.irr)}</p>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Modified IRR (MIRR)</span>
          <p className="text-lg font-bold text-primary mt-0.5">{formatPercent(metrics.mirr)}</p>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Discounted Payback</span>
          <p className="text-lg font-bold text-warning mt-0.5">
            {metrics.discountedPaybackPeriodYears ? `${metrics.discountedPaybackPeriodYears.toFixed(1)} Yrs` : '> 6 Yrs'}
          </p>
        </div>
      </div>

      {/* Main Financial Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em]">
            6-Year Cash Flow Projections (AED)
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">Full Precision Math</span>
        </div>

        <div className="overflow-x-auto">
          <table className="ledger-table">
            <thead>
              <tr className="bg-muted text-foreground border-b border-border text-[11px]">
                <th className="py-3 px-4 font-bold sticky left-0 bg-muted">Line Item</th>
                {yearlyCashFlows.map((y) => (
                  <th key={y.year} className="py-3 px-4 font-bold text-right">
                    Year {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Operating Benefits */}
              <tr className="hover:bg-muted/40">
                <td className="py-2.5 px-4 font-semibold text-foreground sticky left-0 bg-card">
                  Operating Cost Savings
                </td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : formatAED(y.operatingSavings)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/40">
                <td className="py-2.5 px-4 font-semibold text-foreground sticky left-0 bg-card">
                  Incremental Contribution Margin
                </td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : formatAED(y.incrementalMargin)}
                  </td>
                ))}
              </tr>
              <tr className="bg-primary/10 font-bold text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-muted">Total Operating Benefits</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right text-primary font-bold">
                    {y.year === 0 ? '-' : formatAED(y.totalOperatingBenefits)}
                  </td>
                ))}
              </tr>

              {/* OpEx & EBITDA */}
              <tr className="hover:bg-muted/40">
                <td className="py-2.5 px-4 text-muted-foreground sticky left-0 bg-card">Less: Additional OpEx</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right text-warning font-bold">
                    {y.year === 0 ? '-' : `(${formatAED(y.additionalOpEx)})`}
                  </td>
                ))}
              </tr>
              <tr className="bg-muted/50 font-bold text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-muted">EBITDA</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : formatAED(y.ebitda)}
                  </td>
                ))}
              </tr>

              {/* Depreciation & EBIT */}
              <tr className="hover:bg-muted/40 text-muted-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Less: Depreciation (Straight-Line)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : `(${formatAED(y.depreciation)})`}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/40 font-semibold text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">EBIT</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : formatAED(y.ebit)}
                  </td>
                ))}
              </tr>

              {/* Tax & NOPAT */}
              <tr className="hover:bg-muted/40 text-warning font-semibold">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Less: Corporate Tax (9%)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : `(${formatAED(y.tax)})`}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/40 font-semibold text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">NOPAT</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.year === 0 ? '-' : formatAED(y.nopat)}
                  </td>
                ))}
              </tr>

              {/* Operating Cash Flow */}
              <tr className="bg-primary/10 font-bold text-primary">
                <td className="py-2.5 px-4 sticky left-0 bg-muted">Operating Cash Flow (OCF)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right font-bold">
                    {y.year === 0 ? '-' : formatAED(y.operatingCashFlow)}
                  </td>
                ))}
              </tr>

              {/* Working Capital & Terminal Cash Flow */}
              <tr className="hover:bg-muted/40 text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Initial Capex & Working Capital</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right text-warning font-bold">
                    {y.year === 0 ? formatAED(y.freeCashFlow) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/40 text-success font-bold">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Terminal Cash Flow (Salvage + NWC Rec)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.terminalCashFlow > 0 ? formatAED(y.terminalCashFlow) : '-'}
                  </td>
                ))}
              </tr>

              {/* Free Cash Flow */}
              <tr className="bg-muted font-bold text-success text-sm border-t-2 border-border">
                <td className="py-3 px-4 sticky left-0 bg-muted">Free Cash Flow (FCF)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-3 px-4 text-right font-semibold">
                    {formatAED(y.freeCashFlow)}
                  </td>
                ))}
              </tr>

              {/* Discount Factor & PV */}
              <tr className="text-muted-foreground text-[11px]">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Discount Factor (11.5%)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right">
                    {y.discountFactor.toFixed(4)}
                  </td>
                ))}
              </tr>
              <tr className="bg-info/10 font-bold text-info">
                <td className="py-2.5 px-4 sticky left-0 bg-muted">Present Value (PV)</td>
                {yearlyCashFlows.map((y) => (
                  <td key={y.year} className="py-2.5 px-4 text-right font-bold">
                    {formatAED(y.presentValue)}
                  </td>
                ))}
              </tr>

              {/* Cumulative Metrics */}
              <tr className="hover:bg-muted/40 text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Cumulative Undiscounted FCF</td>
                {yearlyCashFlows.map((y) => (
                  <td
                    key={y.year}
                    className={`py-2.5 px-4 text-right font-bold ${
                      y.cumulativeCashFlow >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {formatAED(y.cumulativeCashFlow)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-muted/40 text-foreground">
                <td className="py-2.5 px-4 sticky left-0 bg-card">Cumulative Discounted FCF</td>
                {yearlyCashFlows.map((y) => (
                  <td
                    key={y.year}
                    className={`py-2.5 px-4 text-right font-bold ${
                      y.cumulativeDiscountedCashFlow >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {formatAED(y.cumulativeDiscountedCashFlow)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
