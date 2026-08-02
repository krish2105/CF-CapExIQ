'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent, getDecisionBadgeColor, getRiskSeverityBadgeColor } from '@/lib/utils/formatting';
import { evaluateAllScenarios } from '@/lib/finance/scenarios';
import { evaluateRiskAlerts } from '@/lib/finance/risk';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import type { StructedAIResponse } from '@/lib/types/finance';
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

  // ---------------------------------------------------------------
  // AI Executive Advisory Recommendation (served by /api/ai/recommend)
  // ---------------------------------------------------------------
  const [aiRecommendation, setAiRecommendation] = useState<StructedAIResponse | null>(null);
  const [aiSource, setAiSource] = useState<'loading' | 'ai' | 'deterministic'>('loading');

  /**
   * Deterministic recommendation rendered when the advisory service is
   * unreachable. Wording is conditional on the real numbers: a negative
   * NPV or a sub-hurdle IRR produces cautionary language naming the
   * shortfall, never an unconditional case for capital commitment.
   */
  const buildDeterministicRecommendation = (): StructedAIResponse => {
    const createsValue = metrics.npv > 0;
    const clearsHurdle = metrics.irr !== null && metrics.irr > activeAssumptions.discountRate;
    const bothTestsPass = createsValue && clearsHurdle;
    const paybackText = metrics.paybackPeriodYears
      ? `${metrics.paybackPeriodYears.toFixed(2)} years`
      : 'not achieved within the project life';

    let executiveSummary: string;
    if (bothTestsPass) {
      executiveSummary = `Under the ${selectedScenario} scenario, net present value of ${formatAED(
        metrics.npv,
      )} is positive and the IRR of ${formatPercent(
        metrics.irr,
      )} clears the ${formatPercent(
        activeAssumptions.discountRate,
      )} WACC hurdle, so the automated micro-fulfilment centre creates value on the current assumptions. Profitability index is ${metrics.profitabilityIndex.toFixed(
        4,
      )}x with undiscounted payback of ${paybackText}. Commitment remains subject to the management controls below and to human board approval.`;
    } else if (!createsValue && !clearsHurdle) {
      executiveSummary = `Under the ${selectedScenario} scenario both value tests fail. Net present value is ${formatAED(
        metrics.npv,
      )} — a shortfall of ${formatAED(
        Math.abs(metrics.npv),
      )} against breakeven — and the IRR of ${formatPercent(
        metrics.irr,
      )} does not clear the ${formatPercent(
        activeAssumptions.discountRate,
      )} WACC hurdle. Profitability index is ${metrics.profitabilityIndex.toFixed(
        4,
      )}x, so each AED of outlay returns less than one AED of present value. The proposal destroys shareholder value as modelled and capital should not be committed without a materially revised benefit case.`;
    } else if (!createsValue) {
      executiveSummary = `Under the ${selectedScenario} scenario net present value is negative at ${formatAED(
        metrics.npv,
      )}, a shortfall of ${formatAED(
        Math.abs(metrics.npv),
      )} against breakeven, even though the IRR of ${formatPercent(
        metrics.irr,
      )} sits above the ${formatPercent(
        activeAssumptions.discountRate,
      )} WACC. The NPV shortfall is the binding constraint and capital should not be released on these figures.`;
    } else {
      executiveSummary = `Under the ${selectedScenario} scenario the return test fails: the IRR of ${formatPercent(
        metrics.irr,
      )} does not clear the ${formatPercent(
        activeAssumptions.discountRate,
      )} WACC hurdle, so the project does not compensate NovaRetail GCC for its cost of capital despite an NPV of ${formatAED(
        metrics.npv,
      )}. Re-test the benefit case before releasing capital.`;
    }

    return {
      // Fail safe: withhold approval when the engine supplies no status.
      decision: metrics.decisionStatus || 'Delay Pending Evidence',
      executiveSummary,
      keyValueDrivers: [
        'Year 1 labour and process operating cost savings: AED 7.5M (growing 4% p.a.)',
        'Incremental 30-minute delivery SLA contribution margin: AED 2.5M (growing 5% p.a.)',
        'UAE 9% headline corporate tax rate preserves Year-1 operating cash flow',
        'Working capital recovery and equipment salvage value in Year 6',
      ],
      principalRisks: [
        ...(bothTestsPass
          ? []
          : [
              `Value test failure at the ${selectedScenario} case: NPV ${formatAED(
                metrics.npv,
              )} against a ${formatPercent(
                activeAssumptions.discountRate,
              )} hurdle with IRR ${formatPercent(metrics.irr)}`,
            ]),
        ...riskAlerts.slice(0, 3).map((alert) => `${alert.severity}: ${alert.title}`),
        'Robotics system integration delay prolongs ramp-up and defers Year-1 benefits',
      ],
      managementControls: [
        'Enforce milestone-gated capital release linked to WMS/WCS integration sign-offs',
        'Mandate a 15% maximum capex overrun penalty clause in vendor equipment contracts',
        'Obtain a secondary-market equipment buyback guarantee to secure Year-6 salvage value',
        ...(bothTestsPass
          ? []
          : ['Re-baseline the operating benefit case and re-run the model before committing capital']),
      ],
      confidence: bothTestsPass ? 'High' : 'Low',
      disclaimer:
        'AI-generated explanations and recommendations are advisory. All assumptions, calculations and final investment decisions must be reviewed and approved by a qualified human decision-maker.',
    };
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setAiSource('loading');

    const payload = {
      assumptions: activeAssumptions,
      metrics,
      scenarioResults: (['Optimistic', 'Base', 'Pessimistic'] as const).map((name) => ({
        scenario: name,
        npv: allScenarios[name].metrics.npv,
        irr: allScenarios[name].metrics.irr,
        decisionStatus: allScenarios[name].metrics.decisionStatus,
      })),
      riskAlerts: riskAlerts.slice(0, 25).map((alert) => ({
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        triggeringMetric: alert.triggeringMetric,
      })),
    };

    fetch('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Advisory service returned HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.executiveSummary === 'string' && data.executiveSummary.trim()) {
          setAiRecommendation(data as StructedAIResponse);
          setAiSource(data.isFallback ? 'deterministic' : 'ai');
        } else {
          setAiRecommendation(null);
          setAiSource('deterministic');
        }
      })
      .catch((error) => {
        if (cancelled || controller.signal.aborted) return;
        console.error('AI recommendation request failed:', error);
        setAiRecommendation(null);
        setAiSource('deterministic');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Keyed off primitives only: metrics/activeAssumptions are new object
    // references on every render and would otherwise re-fire the fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metrics.npv,
    metrics.irr,
    metrics.decisionStatus,
    activeAssumptions.discountRate,
    selectedScenario,
  ]);

  const advisory: StructedAIResponse = aiRecommendation ?? buildDeterministicRecommendation();

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
                {aiSource === 'loading'
                  ? 'Requesting Advisory\u2026'
                  : aiSource === 'ai'
                    ? 'AI Structured Governance Output'
                    : 'Deterministic Fallback Output'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${getDecisionBadgeColor(advisory.decision)}`}
              >
                Decision: {advisory.decision}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-muted/60 border border-border text-muted-foreground font-mono font-bold">
                Confidence: {advisory.confidence}
              </span>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed font-sans font-normal">
              {advisory.executiveSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Key Value Drivers
                </h4>
                <ul className="space-y-1 list-disc list-inside">
                  {advisory.keyValueDrivers.map((driver, idx) => (
                    <li key={idx} className="text-[11px] text-foreground/80 leading-relaxed">
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Principal Risks
                </h4>
                <ul className="space-y-1 list-disc list-inside">
                  {advisory.principalRisks.map((risk, idx) => (
                    <li key={idx} className="text-[11px] text-foreground/80 leading-relaxed">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Management Controls
                </h4>
                <ul className="space-y-1 list-disc list-inside">
                  {advisory.managementControls.map((control, idx) => (
                    <li key={idx} className="text-[11px] text-foreground/80 leading-relaxed">
                      {control}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/30">
            <Info className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
            <span>
              <strong>AI advisory &mdash; human approval required.</strong>{' '}
              {advisory.disclaimer ||
                'AI-generated explanations and recommendations are advisory. All assumptions, calculations and final investment decisions must be reviewed and approved by a qualified human decision-maker.'}
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
