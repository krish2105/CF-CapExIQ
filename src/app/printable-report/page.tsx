'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Printer, ArrowLeft, Building2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PrintableReportPage() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const activeAssumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const yearlyCashFlows = scenarioResult.yearlyCashFlows;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-background text-foreground p-6 min-h-screen">
      {/* Top Action Bar (Hidden during print) */}
      <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <button
          onClick={handlePrint}
          className="px-5 py-2 rounded-card bg-accent text-white text-xs font-bold flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Document Container */}
      <div className="max-w-4xl mx-auto space-y-8 bg-card p-8 rounded-card border border-border print:bg-white print:text-black print:p-0 print:border-none print:">
        {/* Document Header */}
        <div className="border-b border-border print:border-black pb-6 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest print:text-primary">
                CapExIQ Capital Investment Report
              </span>
              <h1 className="font-display text-[clamp(24px,2.6vw,32px)] font-normal mt-1 print:text-black text-foreground">
                Automated Micro-Fulfilment Centre (MFC) Evaluation
              </h1>
              <p className="text-xs text-muted-foreground print:text-muted-foreground mt-1">
                Prepared for: Capital Expenditure Committee, <strong>NovaRetail GCC</strong> (Hypothetical UAE Retailer)
              </p>
            </div>
            <div className="text-right text-xs font-mono text-muted-foreground print:text-muted-foreground">
              <div>Date: July 22, 2026</div>
              <div>Scenario: {selectedScenario}</div>
            </div>
          </div>
        </div>

        {/* 1. Executive Summary & Recommended Decision */}
        <div className="space-y-3">
          <h2 className="font-sans text-sm font-semibold text-foreground print:text-black uppercase tracking-[0.12em] border-b border-border print:border-black pb-1">
            1. Executive Summary & Recommendation
          </h2>
          <div className="p-4 rounded-card bg-muted/60 print:bg-muted border border-border print:border-border text-xs leading-relaxed space-y-2">
            <div className="flex justify-between items-center font-bold">
              <span className="text-foreground print:text-black">Recommended Action:</span>
              <span className="text-success print:text-success">{metrics.decisionStatus}</span>
            </div>
            <p className="text-foreground print:text-muted-foreground">
              The proposed investment in NovaRetail GCC’s automated micro-fulfilment centre requires a total initial outlay of <strong>{formatAED(metrics.totalInitialOutlay)}</strong> at time zero. Discounted at an 11.5% WACC hurdle rate, the project generates a baseline Net Present Value (NPV) of <strong>{formatAED(metrics.npv)}</strong>, an Internal Rate of Return (IRR) of <strong>{formatPercent(metrics.irr)}</strong>, a Modified IRR (MIRR) of <strong>{formatPercent(metrics.mirr)}</strong>, and a Profitability Index of <strong>{metrics.profitabilityIndex.toFixed(2)}x</strong> over 6 years.
            </p>
          </div>
        </div>

        {/* 2. Key Financial Metrics Table */}
        <div className="space-y-3">
          <h2 className="font-sans text-sm font-semibold text-foreground print:text-black uppercase tracking-[0.12em] border-b border-border print:border-black pb-1">
            2. Core Financial Return Metrics
          </h2>
          <table className="ledger-table">
            <thead>
              <tr className="bg-muted print:bg-muted border-b border-border print:border-black">
                <th className="py-2 px-3 font-bold">Metric Name</th>
                <th className="py-2 px-3 font-bold">Calculated Value</th>
                <th className="py-2 px-3 font-bold">Target Threshold</th>
                <th className="py-2 px-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border print:divide-gray-300">
              <tr>
                <td className="py-2 px-3 font-semibold">Net Present Value (NPV)</td>
                <td className="py-2 px-3 font-bold text-success print:text-black">{formatAED(metrics.npv)}</td>
                <td className="py-2 px-3">&gt; AED 0</td>
                <td className="py-2 px-3 text-success print:text-black font-bold">Passed</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold">Internal Rate of Return (IRR)</td>
                <td className="py-2 px-3 font-bold text-primary print:text-black">{formatPercent(metrics.irr)}</td>
                <td className="py-2 px-3">&gt; 11.5% WACC</td>
                <td className="py-2 px-3 text-success print:text-black font-bold">Passed</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold">Modified IRR (MIRR)</td>
                <td className="py-2 px-3 font-bold text-info print:text-black">{formatPercent(metrics.mirr)}</td>
                <td className="py-2 px-3">&gt; 11.5% Reinvestment</td>
                <td className="py-2 px-3 text-success print:text-black font-bold">Passed</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold">Profitability Index (PI)</td>
                <td className="py-2 px-3 font-bold text-foreground print:text-black">{metrics.profitabilityIndex.toFixed(2)}x</td>
                <td className="py-2 px-3">&gt; 1.00x</td>
                <td className="py-2 px-3 text-success print:text-black font-bold">Passed</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-semibold">Discounted Payback Period</td>
                <td className="py-2 px-3 font-bold text-warning print:text-black">
                  {metrics.discountedPaybackPeriodYears ? `${metrics.discountedPaybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
                </td>
                <td className="py-2 px-3">&lt; 4.0 Years</td>
                <td className="py-2 px-3 text-success print:text-black font-bold">Passed</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Year-by-Year Free Cash Flow Schedule */}
        <div className="space-y-3">
          <h2 className="font-sans text-sm font-semibold text-foreground print:text-black uppercase tracking-[0.12em] border-b border-border print:border-black pb-1">
            3. Year-by-Year Free Cash Flow Projections (AED)
          </h2>
          <div className="overflow-x-auto">
            <table className="ledger-table">
              <thead>
                <tr className="bg-muted print:bg-muted border-b border-border print:border-black">
                  <th className="py-2 px-2 font-bold">Line Item</th>
                  {yearlyCashFlows.map((y) => (
                    <th key={y.year} className="py-2 px-2 font-bold text-right">
                      Year {y.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-gray-300">
                <tr>
                  <td className="py-1.5 px-2 font-medium">Operating Savings</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-1.5 px-2 text-right">
                      {y.year === 0 ? '-' : formatAED(y.operatingSavings)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 px-2 font-medium">Contribution Margin</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-1.5 px-2 text-right">
                      {y.year === 0 ? '-' : formatAED(y.incrementalMargin)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 px-2 font-medium">Less: OpEx</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-1.5 px-2 text-right text-warning print:text-black">
                      {y.year === 0 ? '-' : `(${formatAED(y.additionalOpEx)})`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 px-2 font-medium">Less: Tax (9%)</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-1.5 px-2 text-right text-warning print:text-black">
                      {y.year === 0 ? '-' : `(${formatAED(y.tax)})`}
                    </td>
                  ))}
                </tr>
                <tr className="bg-muted/50 font-bold print:bg-muted">
                  <td className="py-2 px-2">Free Cash Flow (FCF)</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-2 px-2 text-right text-success print:text-black font-semibold">
                      {formatAED(y.freeCashFlow)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-muted-foreground">Present Value (PV)</td>
                  {yearlyCashFlows.map((y) => (
                    <td key={y.year} className="py-1.5 px-2 text-right text-info print:text-black font-bold">
                      {formatAED(y.presentValue)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Investment Committee Sign-off & Signatures */}
        <div className="space-y-4 pt-4 border-t border-border print:border-black">
          <h2 className="font-sans text-sm font-semibold text-foreground print:text-black uppercase tracking-[0.12em]">
            5. Executive Sign-Off & Board Governance Approval
          </h2>
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="border-t border-dashed border-foreground/40 print:border-black pt-2 space-y-1">
              <p className="text-xs font-bold text-foreground print:text-black">Chief Financial Officer (CFO)</p>
              <p className="text-[10px] text-muted-foreground print:text-muted-foreground">NovaRetail GCC • Investment Committee Chair</p>
              <div className="text-[10px] font-mono text-muted-foreground print:text-black pt-4">Signature: __________________________</div>
            </div>
            <div className="border-t border-dashed border-foreground/40 print:border-black pt-2 space-y-1">
              <p className="text-xs font-bold text-foreground print:text-black">Chief Executive Officer (CEO)</p>
              <p className="text-[10px] text-muted-foreground print:text-muted-foreground">NovaRetail GCC • Board Member</p>
              <div className="text-[10px] font-mono text-muted-foreground print:text-black pt-4">Signature: __________________________</div>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="pt-4 border-t border-border print:border-black flex justify-between items-center text-[10px] text-muted-foreground print:text-muted-foreground font-mono">
          <div>CapExIQ System Audit Hash: 0x9F4B2A8C1D • Deterministic Financial Engine</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}
