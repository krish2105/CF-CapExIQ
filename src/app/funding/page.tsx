'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { DEFAULT_FUNDING_SOURCES, calculateFundingAnalysis } from '@/lib/finance/funding';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Landmark, ShieldAlert, CheckCircle2, Info, DollarSign } from 'lucide-react';

export default function FundingPage() {
  const { getActiveScenarioResult } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const year1Ebitda = scenarioResult.yearlyCashFlows[1]?.ebitda || 9500000;

  const analysis = calculateFundingAnalysis(DEFAULT_FUNDING_SOURCES, year1Ebitda);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> Capital Funding Mix, Liquidity & DSCR Coverage
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Financing Sources, Annual Debt Service, Bank Covenant Checks & Liquidity Headroom
          </p>
        </div>
      </div>

      {analysis.covenantAlert && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span>{analysis.covenantAlert}</span>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Total Capital Required</span>
          <p className="text-lg font-bold text-foreground mt-1">{formatAED(analysis.totalFunding)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Time Zero Capital Outlay</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Weighted Cost of Borrowing</span>
          <p className="text-lg font-bold text-primary mt-1">{formatPercent(analysis.weightedCostOfCapital)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Effective Debt Interest Rate</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Annual Debt Service</span>
          <p className="text-lg font-bold text-amber-500 mt-1">{formatAED(analysis.annualDebtService)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">P+I Repayment (Y1-Y5)</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Debt Service Coverage (DSCR)</span>
          <p className="text-lg font-bold text-success mt-1">{analysis.debtServiceCoverageRatio.toFixed(2)}x</p>
          <span className="text-[10px] text-muted-foreground font-mono">Target: &ge; 1.25x EBITDA</span>
        </div>
      </div>

      {/* Funding Sources Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Proposed Capital Financing Structure
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3">Funding Source</th>
              <th className="py-2.5 px-3 text-right">Capital Amount (AED)</th>
              <th className="py-2.5 px-3 text-center">Share (%)</th>
              <th className="py-2.5 px-3 text-right">Annual Interest Rate</th>
              <th className="py-2.5 px-3 text-center">Repayment Term</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {DEFAULT_FUNDING_SOURCES.map((s, idx) => (
              <tr key={idx} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">{s.type}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatAED(s.amount)}</td>
                <td className="py-2.5 px-3 text-center font-bold">{s.percentage}%</td>
                <td className="py-2.5 px-3 text-right">{s.annualInterestRate > 0 ? formatPercent(s.annualInterestRate) : 'N/A (Equity)'}</td>
                <td className="py-2.5 px-3 text-center">{s.termYears > 0 ? `${s.termYears} Years` : 'Permanent'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
