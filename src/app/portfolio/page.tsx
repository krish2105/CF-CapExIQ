'use client';

import React, { useState } from 'react';
import { DEFAULT_PORTFOLIO_PROJECTS, optimizeCapitalPortfolio } from '@/lib/finance/portfolio';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { PieChart, DollarSign, ShieldCheck, CheckCircle2, XCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function PortfolioPage() {
  const [budgetLimit, setBudgetLimit] = useState<number>(40000000); // AED 40M

  const result = optimizeCapitalPortfolio(DEFAULT_PORTFOLIO_PROJECTS, budgetLimit);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" /> Capital Portfolio Optimizer & Capital Rationing
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Multi-Project Portfolio Optimization under Capital Budget Constraints (Deterministic Knapsack PI Engine)
          </p>
        </div>

        {/* Budget Input Pill */}
        <div className="glass-panel px-4 py-2 rounded-xl border border-primary/30 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <div className="space-y-0.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Capital Budget Limit (AED)</label>
            <input
              type="number"
              step="1000000"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(parseFloat(e.target.value) || 0)}
              className="w-36 bg-card text-foreground font-bold font-mono px-2 py-1 rounded border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Total Portfolio Outlay</span>
          <p className="text-lg font-bold text-primary mt-1">{formatAED(result.totalInvestmentCommitted)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Budget Limit: {formatAED(result.totalBudget)}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Total Portfolio Net NPV</span>
          <p className="text-lg font-bold text-success mt-1">{formatAED(result.totalPortfolioNpv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Combined Value Created</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Blended IRR (Approx.)</span>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{formatPercent(result.investmentWeightedAverageIrrApprox)}</p>
          <span className="text-[10px] text-muted-foreground font-mono" title="Investment-weighted average of individual project IRRs. Not a true portfolio IRR - that requires solving NPV = 0 on the aggregated cash-flow streams.">Capital-Weighted Avg of Project IRRs</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Unallocated Capital</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{formatAED(result.remainingCapital)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Available Headroom</span>
        </div>
      </div>

      {/* Selected Approved Projects Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" /> Recommended Approved Projects ({result.selectedProjects.length})
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3 font-bold">Project Name</th>
              <th className="py-2.5 px-3 font-bold">Category</th>
              <th className="py-2.5 px-3 text-right font-bold">Investment Outlay</th>
              <th className="py-2.5 px-3 text-right font-bold">Calculated NPV</th>
              <th className="py-2.5 px-3 text-right font-bold">IRR</th>
              <th className="py-2.5 px-3 text-center font-bold">PI Index</th>
              <th className="py-2.5 px-3 text-center font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {result.selectedProjects.map((proj) => (
              <tr key={proj.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary flex items-center gap-1.5">
                  {proj.name} {proj.isMandatory && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-sans font-bold">Mandatory</span>}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground font-sans">{proj.category}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatAED(proj.initialInvestment)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-success">{formatAED(proj.npv)}</td>
                <td className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 font-bold">{formatPercent(proj.irr)}</td>
                <td className="py-2.5 px-3 text-center font-bold">{proj.profitabilityIndex.toFixed(2)}x</td>
                <td className="py-2.5 px-3 text-center text-success font-bold font-sans flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deferred Excluded Projects Table */}
      {result.deferredProjects.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" /> Deferred / Excluded Projects ({result.deferredProjects.length})
          </h3>

          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3 font-bold">Project Name</th>
                <th className="py-2.5 px-3 font-bold">Category</th>
                <th className="py-2.5 px-3 text-right font-bold">Investment Outlay</th>
                <th className="py-2.5 px-3 text-right font-bold">Calculated NPV</th>
                <th className="py-2.5 px-3 text-center font-bold">PI Index</th>
                <th className="py-2.5 px-3 font-bold">Exclusion Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {result.deferredProjects.map((proj) => (
                <tr key={proj.id} className="hover:bg-muted/50">
                  <td className="py-2.5 px-3 font-bold text-muted-foreground">{proj.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground font-sans">{proj.category}</td>
                  <td className="py-2.5 px-3 text-right font-bold">{formatAED(proj.initialInvestment)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${proj.npv < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatAED(proj.npv)}</td>
                  <td className="py-2.5 px-3 text-center font-bold">{proj.profitabilityIndex.toFixed(2)}x</td>
                  <td className="py-2.5 px-3 text-muted-foreground font-sans text-[11px]">
                    {proj.npv < 0 ? 'Excluded due to negative NPV (value destroying)' : 'Deferred due to capital budget constraint'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
