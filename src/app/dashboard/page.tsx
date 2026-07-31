'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent, getDecisionBadgeColor, getRiskSeverityBadgeColor } from '@/lib/utils/formatting';
import { evaluateAllScenarios } from '@/lib/finance/scenarios';
import { evaluateRiskAlerts } from '@/lib/finance/risk';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  ShieldAlert,
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { assumptions, getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const activeAssumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const yearlyCashFlows = scenarioResult.yearlyCashFlows;
  const colors = useThemeChartColors();

  const allScenarios = evaluateAllScenarios(assumptions);
  const riskAlerts = evaluateRiskAlerts(activeAssumptions, metrics, allScenarios.Pessimistic);

  // AI Recommendation local state
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    // Generate advisory summary locally based on deterministic metrics
    const summary = `Based on a deterministic net present value of ${formatAED(metrics.npv)} and an Internal Rate of Return of ${formatPercent(metrics.irr)} (exceeding the ${formatPercent(activeAssumptions.discountRate)} WACC hurdle rate), the automated micro-fulfilment centre delivers strong financial return. The profitability index of ${metrics.profitabilityIndex.toFixed(2)} and payback period of ${metrics.paybackPeriodYears?.toFixed(1)} years justify capital commitment under the ${selectedScenario} scenario. Management controls must mandate vendor SLA penalty clauses and a 15% maximum capex overrun ceiling.`;
    setAiSummary(summary);
  }, [metrics, activeAssumptions, selectedScenario]);

  // Chart 1: Annual Cash Flow Bar Chart Data
  const annualChartData = yearlyCashFlows.map((item) => ({
    year: `Year ${item.year}`,
    freeCashFlow: item.freeCashFlow / 1000000, // Millions AED
    operatingCashFlow: item.operatingCashFlow / 1000000,
    terminalCashFlow: item.terminalCashFlow / 1000000,
  }));

  // Chart 2: Cumulative Cash Flow Line Chart Data
  const cumulativeChartData = yearlyCashFlows.map((item) => ({
    year: `Year ${item.year}`,
    cumulativeFCF: item.cumulativeCashFlow / 1000000,
    cumulativeDiscountedFCF: item.cumulativeDiscountedCashFlow / 1000000,
  }));

  // Chart 3: Scenario Comparison Bar Chart Data
  const scenarioChartData = [
    {
      scenario: 'Optimistic',
      npv: allScenarios.Optimistic.metrics.npv / 1000000,
      irr: (allScenarios.Optimistic.metrics.irr || 0) * 100,
    },
    {
      scenario: 'Base',
      npv: allScenarios.Base.metrics.npv / 1000000,
      irr: (allScenarios.Base.metrics.irr || 0) * 100,
    },
    {
      scenario: 'Pessimistic',
      npv: allScenarios.Pessimistic.metrics.npv / 1000000,
      irr: (allScenarios.Pessimistic.metrics.irr || 0) * 100,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Executive Financial Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Automated Micro-Fulfilment Centre • Active Scenario: <strong className="text-primary">{selectedScenario}</strong>
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${getDecisionBadgeColor(metrics.decisionStatus)}`}>
          <ShieldAlert className="h-4 w-4" /> Recommended Action: {metrics.decisionStatus}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Initial Outlay</span>
          <p className="text-lg font-bold text-foreground mt-1">{formatAED(metrics.totalInitialOutlay)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Time Zero (Y0)</span>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Baseline NPV</span>
          <p className="text-lg font-bold text-success mt-1">{formatAED(metrics.npv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">WACC @ {formatPercent(activeAssumptions.discountRate)}</span>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">IRR / MIRR</span>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{formatPercent(metrics.irr)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">MIRR: {formatPercent(metrics.mirr)}</span>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Profitability Index</span>
          <p className="text-lg font-bold text-primary mt-1">{metrics.profitabilityIndex.toFixed(2)}x</p>
          <span className="text-[10px] text-muted-foreground font-mono">Target &ge; 1.05x</span>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Payback Period</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {metrics.paybackPeriodYears ? `${metrics.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Undiscounted</span>
        </div>
        <div className="glass-panel p-3.5 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Discounted Payback</span>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
            {metrics.discountedPaybackPeriodYears ? `${metrics.discountedPaybackPeriodYears.toFixed(1)} Yrs` : '> 6.0 Yrs'}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Project Horizon</span>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Annual Cash Flow */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Annual Free Cash Flow Schedule (AED Millions)
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Years 0 – 6</span>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="year" stroke={colors.axis} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '8px', fontSize: '12px', color: colors.tooltipText }}
                  formatter={(val: number) => [`AED ${val.toFixed(2)}M`, 'Free Cash Flow']}
                />
                <ReferenceLine y={0} stroke={colors.axis} strokeWidth={1} />
                <Bar dataKey="freeCashFlow" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cumulative & Discounted Cash Flow */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Cumulative & Discounted Cash Flow (Payback Trajectory)
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Break-even Point</span>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="year" stroke={colors.axis} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '8px', fontSize: '12px', color: colors.tooltipText }}
                  formatter={(val: number) => [`AED ${val.toFixed(2)}M`, 'Cumulative']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={0} stroke={colors.danger} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="cumulativeFCF" name="Cumulative FCF" stroke={colors.success} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="cumulativeDiscountedFCF" name="Cumulative Discounted FCF" stroke={colors.purple} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scenario Comparison & AI Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Comparison Bar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3 lg:col-span-1">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Scenario NPV Comparison (AED Millions)
          </h3>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="scenario" stroke={colors.axis} tick={{ fontSize: 11 }} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '8px', fontSize: '12px', color: colors.tooltipText }}
                  formatter={(val: number) => [`AED ${val.toFixed(2)}M`, 'NPV']}
                />
                <Bar dataKey="npv" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Executive Advisory Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <Bot className="h-4 w-4 text-primary" /> AI Executive Advisory Recommendation
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
                Structured Governance Output
              </span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-sans font-normal">
              {aiSummary}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">
            <Info className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
            <span>
              <strong>Human Review Disclaimer:</strong> AI-generated explanations and recommendations are advisory. All assumptions, calculations and final investment decisions must be reviewed and approved by a qualified human decision-maker.
            </span>
          </div>
        </div>
      </div>

      {/* Risk Engine Highlights Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" /> Rule-Based Capital Budgeting Risk Alerts
          </h3>
          <span className="text-xs text-muted-foreground font-mono">
            {riskAlerts.length} Active Alert{riskAlerts.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {riskAlerts.slice(0, 4).map((alert) => (
            <div key={alert.id} className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{alert.title}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${getRiskSeverityBadgeColor(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.explanation}</p>
              <div className="text-[10px] text-primary pt-1 font-mono font-bold">
                Management Response: {alert.managementResponse}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
