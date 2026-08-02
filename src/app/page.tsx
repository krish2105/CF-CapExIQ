'use client';

import React from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import {
  Building2,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  BarChart3,
  FileSpreadsheet,
  GitCompare,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export default function OverviewPage() {
  const hasMounted = useHasMounted();
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const decisionOptions = [
    {
      id: 'Approve',
      title: 'Option 1: Full Investment Approval',
      desc: 'Approve full AED 24.0M capital investment (AED 22.0M Capex + AED 2.0M Working Capital) for immediate 5-year automated micro-fulfilment rollout.',
      active: metrics.decisionStatus === 'Approve',
    },
    {
      id: 'Phased Implementation',
      title: 'Option 2: Phased Implementation (Pilot + Gate)',
      desc: 'Commit Phase 1 pilot outlay of AED 14.0M. Hold remaining AED 10.0M subject to Stage Gate 4 WCS API latency benchmark (< 50ms).',
      active: metrics.decisionStatus === 'Phased Implementation',
    },
    {
      id: 'Delay Pending Evidence',
      title: 'Option 3: Delay 12 Months Pending Evidence',
      desc: 'Defer capital expenditure to monitor UAE e-commerce demand stabilization and negotiate supplier equipment price reductions.',
      active: metrics.decisionStatus === 'Delay Pending Evidence',
    },
    {
      id: 'Reject',
      title: 'Option 4: Reject Investment',
      desc: 'Decline capital allocation and maintain status quo manual warehouse picking operations across UAE fulfilment hubs.',
      active: metrics.decisionStatus === 'Reject',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Dark Executive Hero Panel - Branded Hero Area */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
          <Building2 className="h-96 w-96 text-cyan-400" />
        </div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
              NovaRetail GCC Evaluation
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1 border border-amber-500/30">
              <AlertTriangle className="h-3.5 w-3.5" /> Hypothetical Entity
            </span>
          </div>

          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-white">
            CapExIQ — Automated Micro-Fulfilment Centre Capital Budgeting
          </h1>

          <p className="text-slate-200 text-xs lg:text-sm leading-relaxed">
            Enterprise decision-support dashboard evaluating a 5-year automated warehouse investment to reduce UAE order fulfilment lag from 24h to 2h, cut picking labor costs, and expand omnichannel e-commerce capacity.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <BarChart3 className="h-4 w-4" /> Open Executive Dashboard
            </Link>
            <Link
              href="/presentation"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <Zap className="h-4 w-4 text-cyan-400" /> Launch Boardroom Presentation
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Theme Semantic Tokens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Initial Capital Outlay</p>
          <p suppressHydrationWarning className="text-xl font-bold text-foreground mt-1">
            {formatAED(metrics.totalInitialOutlay)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">AED 22M Capex + AED 2M NWC</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Net Present Value (NPV)</p>
          <p suppressHydrationWarning className="text-xl font-bold text-success mt-1">
            {formatAED(metrics.npv)}
          </p>
          <p suppressHydrationWarning className="text-[11px] text-muted-foreground mt-1">
            Discount Rate: {formatPercent(assumptions.discountRate)}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Internal Rate of Return (IRR)</p>
          <p suppressHydrationWarning className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatPercent(metrics.irr)}
          </p>
          <p suppressHydrationWarning className="text-[11px] text-muted-foreground mt-1">
            MIRR: {formatPercent(metrics.mirr)}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl">
          <p className="text-xs text-muted-foreground font-medium">Payback Period</p>
          <p suppressHydrationWarning className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.paybackPeriodYears ? `${metrics.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
          </p>
          <p suppressHydrationWarning className="text-[11px] text-muted-foreground mt-1">
            Discounted: {metrics.discountedPaybackPeriodYears?.toFixed(1)} Yrs
          </p>
        </div>
      </div>

      {/* Management Decision Alternatives Cards */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Management Decision Alternatives
          </h2>
          <span suppressHydrationWarning className={`px-3 py-1 rounded-lg border text-xs ${getDecisionBadgeColor(metrics.decisionStatus)}`}>
            Recommended: {metrics.decisionStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {decisionOptions.map((opt) => (
            <div
              key={opt.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                opt.active
                  ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-md'
                  : 'bg-card border-border text-foreground hover:bg-muted/60'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-foreground">{opt.title}</h3>
                  {opt.active ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary text-primary-foreground font-bold font-mono">
                      RECOMMENDED
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">Option</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/assumptions" className="glass-panel p-4 rounded-xl hover:border-primary/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">1. Assumptions Register</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Inspect, tune or import capex outlays, operating savings, and macroeconomic discount parameters.
          </p>
        </Link>

        <Link href="/scenarios" className="glass-panel p-4 rounded-xl hover:border-primary/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">2. Scenario Engine</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Compare Base, Optimistic, Pessimistic, and Custom scenario cash flows and return metrics.
          </p>
        </Link>

        <Link href="/sensitivity" className="glass-panel p-4 rounded-xl hover:border-primary/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">3. Sensitivity Analysis</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Evaluate 2D heatmaps and Tornado charts analyzing sensitivity to discount rate and operating benefits.
          </p>
        </Link>
      </div>
    </div>
  );
}
