'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { evaluateAllScenarios, calculateExpectedNpv } from '@/lib/finance/scenarios';
import { formatAED, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import { GitCompare, Sliders, ShieldCheck, Info, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ScenariosPage() {
  const { assumptions, selectedScenario, setScenario, customScenarioSliders, updateCustomScenarioSliders } =
    useFinancialStore();
  const colors = useThemeChartColors();

  const scenarioResults = evaluateAllScenarios(assumptions);
  const { Optimistic, Base, Pessimistic } = scenarioResults;
  const expectedNpv = calculateExpectedNpv(scenarioResults);

  const chartData = [
    { name: 'Optimistic', npv: Optimistic.metrics.npv / 1000000 },
    { name: 'Base Case', npv: Base.metrics.npv / 1000000 },
    { name: 'Pessimistic', npv: Pessimistic.metrics.npv / 1000000 },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-primary" /> Scenario Analysis & Downside Stress Testing
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Multi-Variable Scenario Comparisons & Strategic Decision Boundaries
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border text-xs">
          <span className="px-2 font-medium text-muted-foreground">Active Scenario:</span>
          {(['Base', 'Optimistic', 'Pessimistic', 'Custom'] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setScenario(sc)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedScenario === sc
                  ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* Expected Value Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-between flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <span className="font-bold text-foreground">Probability-Weighted Expected NPV (E[NPV]):</span>
            <span className="ml-2 font-mono font-bold text-primary text-sm">{formatAED(expectedNpv)}</span>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          Decision Tree Model: 50% Base + 25% Optimistic + 25% Pessimistic
        </span>
      </div>

      {/* Side-by-Side Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Optimistic Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            selectedScenario === 'Optimistic'
              ? 'bg-primary/10 border-primary text-foreground font-bold shadow-md'
              : 'glass-panel border-border text-foreground'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-success">Optimistic Scenario</h3>
              <p className="text-[11px] text-muted-foreground">Capex 0.95x • Benefits 1.10x • OpEx 0.95x</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadgeColor(Optimistic.metrics.decisionStatus)}`}>
              {Optimistic.metrics.decisionStatus}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Hurdle Rate:</span>
              <span className="text-foreground font-bold">10.5%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Net Present Value (NPV):</span>
              <span className="text-success font-bold">{formatAED(Optimistic.metrics.npv)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Internal Rate of Return:</span>
              <span className="text-primary font-bold">{formatPercent(Optimistic.metrics.irr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Modified IRR:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{formatPercent(Optimistic.metrics.mirr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Profitability Index:</span>
              <span className="text-foreground font-bold">{Optimistic.metrics.profitabilityIndex.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between py-1 pt-2">
              <span className="text-muted-foreground">Payback Period:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {Optimistic.metrics.paybackPeriodYears ? `${Optimistic.metrics.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Base Case Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            selectedScenario === 'Base'
              ? 'bg-primary/10 border-primary text-foreground font-bold shadow-md'
              : 'glass-panel border-border text-foreground'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-primary">Base Case (Management Baseline)</h3>
              <p className="text-[11px] text-muted-foreground">Capex 1.00x • Benefits 1.00x • OpEx 1.00x</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadgeColor(Base.metrics.decisionStatus)}`}>
              {Base.metrics.decisionStatus}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Hurdle Rate:</span>
              <span className="text-foreground font-bold">11.5%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Net Present Value (NPV):</span>
              <span className="text-success font-bold">{formatAED(Base.metrics.npv)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Internal Rate of Return:</span>
              <span className="text-primary font-bold">{formatPercent(Base.metrics.irr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Modified IRR:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{formatPercent(Base.metrics.mirr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Profitability Index:</span>
              <span className="text-foreground font-bold">{Base.metrics.profitabilityIndex.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between py-1 pt-2">
              <span className="text-muted-foreground">Payback Period:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {Base.metrics.paybackPeriodYears ? `${Base.metrics.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Stress-Test Pessimistic Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            selectedScenario === 'Pessimistic'
              ? 'bg-primary/10 border-primary text-foreground font-bold shadow-md'
              : 'glass-panel border-border text-foreground'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-destructive">Pessimistic Scenario</h3>
              <p className="text-[11px] text-muted-foreground">Capex 1.15x • Benefits 0.75x • OpEx 1.15x</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDecisionBadgeColor(Pessimistic.metrics.decisionStatus)}`}>
              {Pessimistic.metrics.decisionStatus}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Hurdle Rate:</span>
              <span className="text-foreground font-bold">14.5%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Net Present Value (NPV):</span>
              <span className={`font-bold ${Pessimistic.metrics.npv >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatAED(Pessimistic.metrics.npv)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Internal Rate of Return:</span>
              <span className="text-primary font-bold">{formatPercent(Pessimistic.metrics.irr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Modified IRR:</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">{formatPercent(Pessimistic.metrics.mirr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Profitability Index:</span>
              <span className="text-foreground font-bold">{Pessimistic.metrics.profitabilityIndex.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between py-1 pt-2">
              <span className="text-muted-foreground">Payback Period:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {Pessimistic.metrics.paybackPeriodYears ? `${Pessimistic.metrics.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Custom Scenario Tuner */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> Interactive Custom Scenario Tuning
          </h3>
          <span className="text-xs text-muted-foreground font-mono">Real-time Parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Investment Multiplier Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Capex Multiplier:</span>
              <span className="text-primary font-bold font-mono">{customScenarioSliders.investmentMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.30"
              step="0.05"
              value={customScenarioSliders.investmentMultiplier}
              onChange={(e) => updateCustomScenarioSliders({ investmentMultiplier: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Benefits Multiplier Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Benefits Multiplier:</span>
              <span className="text-primary font-bold font-mono">{customScenarioSliders.operatingBenefitMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="1.30"
              step="0.05"
              value={customScenarioSliders.operatingBenefitMultiplier}
              onChange={(e) => updateCustomScenarioSliders({ operatingBenefitMultiplier: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* OpEx Multiplier Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">OpEx Multiplier:</span>
              <span className="text-primary font-bold font-mono">{customScenarioSliders.operatingCostMultiplier.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.30"
              step="0.05"
              value={customScenarioSliders.operatingCostMultiplier}
              onChange={(e) => updateCustomScenarioSliders({ operatingCostMultiplier: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Hurdle Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Hurdle Rate (WACC):</span>
              <span className="text-primary font-bold font-mono">{(customScenarioSliders.discountRate * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.18"
              step="0.005"
              value={customScenarioSliders.discountRate}
              onChange={(e) => updateCustomScenarioSliders({ discountRate: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
      </div>

      {/* Narrative Explanation of Scenario Variations */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> Strategic Analysis of Decision Thresholds
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The baseline investment in NovaRetail GCC’s micro-fulfilment centre yields a robust <strong>AED {formatAED(Base.metrics.npv)}</strong> net present value. In the <strong>Optimistic Scenario</strong>, lower hardware integration costs (-5%) combined with stronger customer delivery SLA uptake (+10% benefits) elevate NPV to <strong>{formatAED(Optimistic.metrics.npv)}</strong>. Conversely, the <strong>Pessimistic Scenario</strong> reflects a severe operational stress test (+15% capex cost overrun, -25% benefit shortfall, 14.5% interest rate environment), which shifts the recommendation from full approval to phased implementation or delay.
        </p>
      </div>
    </div>
  );
}
