'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  useFinancialStore,
  clampCustomSliders,
  CUSTOM_SLIDER_BOUNDS as SLIDER_BOUNDS,
  DEFAULT_CUSTOM_SLIDERS as DEFAULT_SLIDERS,
  type CustomScenarioSliders,
} from '@/lib/store/useFinancialStore';
import {
  evaluateAllScenarios,
  evaluateScenario,
  calculateExpectedNpv,
  BASE_SCENARIO_DEFINITIONS,
} from '@/lib/finance/scenarios';
import { formatAED, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import type { ScenarioResult } from '@/lib/types/finance';
import {
  GitCompare,
  Sliders,
  Info,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  BarChart2,
} from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const SLIDER_KEYS = Object.keys(SLIDER_BOUNDS) as Array<keyof CustomScenarioSliders>;

function slidersEqual(a: CustomScenarioSliders, b: CustomScenarioSliders): boolean {
  return SLIDER_KEYS.every((k) => Math.abs(a[k] - b[k]) < 1e-9);
}

export default function ScenariosPage() {
  const {
    assumptions,
    selectedScenario,
    setScenario,
    customScenarioSliders,
    updateCustomScenarioSliders,
  } = useFinancialStore();
  const colors = useThemeChartColors();

  /**
   * Sliders edit a local draft; nothing reaches the shared model until Apply.
   * Previously every drag wrote straight through to the store, which meant
   * there was no commit step to press — the complaint that the panel had no
   * button — and no way to explore a parameter set without disturbing every
   * other route reading the active scenario.
   */
  const [draft, setDraft] = useState<CustomScenarioSliders>(() => clampCustomSliders(customScenarioSliders));

  // Re-sync when the committed values change from outside this page (the AI
  // Scenario Studio's "Apply to Model Custom Sliders", or a profile load).
  useEffect(() => {
    setDraft(clampCustomSliders(customScenarioSliders));
  }, [customScenarioSliders]);

  const scenarioResults = useMemo(() => evaluateAllScenarios(assumptions), [assumptions]);
  const { Optimistic, Base, Pessimistic } = scenarioResults;
  const expectedNpv = calculateExpectedNpv(scenarioResults);

  // The Custom card previews the *draft*, so the effect of a drag is visible
  // before it is committed.
  const customPreview: ScenarioResult = useMemo(
    () =>
      evaluateScenario(assumptions, {
        type: 'Custom',
        name: 'Custom Scenario',
        description: 'User-tuned scenario parameters',
        ...draft,
      }),
    [assumptions, draft]
  );

  const isDirty = !slidersEqual(draft, customScenarioSliders);
  const isCustomActive = selectedScenario === 'Custom';

  const applyDraft = () => {
    updateCustomScenarioSliders(clampCustomSliders(draft));
    setScenario('Custom');
  };

  const resetDraft = () => setDraft(DEFAULT_SLIDERS);

  const chartData = [
    { name: 'Optimistic', npv: Optimistic.metrics.npv / 1_000_000 },
    { name: 'Base Case', npv: Base.metrics.npv / 1_000_000 },
    { name: 'Pessimistic', npv: Pessimistic.metrics.npv / 1_000_000 },
    { name: 'Custom', npv: customPreview.metrics.npv / 1_000_000 },
  ];

  const cards: Array<{
    key: 'Optimistic' | 'Base' | 'Pessimistic' | 'Custom';
    title: string;
    titleTone: string;
    subtitle: string;
    hurdle: number;
    result: ScenarioResult;
  }> = [
    {
      key: 'Optimistic',
      title: 'Optimistic Scenario',
      titleTone: 'text-success',
      subtitle: 'Capex 0.95x • Benefits 1.10x • OpEx 0.95x',
      hurdle: BASE_SCENARIO_DEFINITIONS.Optimistic.discountRate,
      result: Optimistic,
    },
    {
      key: 'Base',
      title: 'Base Case (Management Baseline)',
      titleTone: 'text-primary',
      subtitle: 'Capex 1.00x • Benefits 1.00x • OpEx 1.00x',
      hurdle: BASE_SCENARIO_DEFINITIONS.Base.discountRate,
      result: Base,
    },
    {
      key: 'Pessimistic',
      title: 'Pessimistic Scenario',
      titleTone: 'text-destructive',
      subtitle: 'Capex 1.15x • Benefits 0.75x • OpEx 1.15x',
      hurdle: BASE_SCENARIO_DEFINITIONS.Pessimistic.discountRate,
      result: Pessimistic,
    },
    {
      key: 'Custom',
      title: 'Custom Scenario',
      titleTone: 'text-info',
      subtitle: `Capex ${draft.investmentMultiplier.toFixed(2)}x • Benefits ${draft.operatingBenefitMultiplier.toFixed(
        2
      )}x • OpEx ${draft.operatingCostMultiplier.toFixed(2)}x`,
      hurdle: draft.discountRate,
      result: customPreview,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <GitCompare className="h-6 w-6 text-primary" /> Scenario Analysis & Downside Stress Testing
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Multi-Variable Scenario Comparisons & Strategic Decision Boundaries
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-card border border-border text-xs">
          <span className="px-2 font-medium text-muted-foreground">Active Scenario:</span>
          {(['Base', 'Optimistic', 'Pessimistic', 'Custom'] as const).map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setScenario(sc)}
              aria-pressed={selectedScenario === sc}
              className={`px-3 py-1 rounded-card font-semibold transition-all ${
                selectedScenario === sc
                  ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sc}
            </button>
          ))}
        </div>
      </div>

      {/* Expected Value Banner */}
      <div className="glass-panel p-4 border border-primary/30 bg-primary/5 flex items-center justify-between flex-wrap gap-3 text-xs">
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const m = card.result.metrics;
          const isActive = selectedScenario === card.key;
          const isDraftPreview = card.key === 'Custom' && isDirty;
          return (
            <div
              key={card.key}
              className={`p-5 rounded-card border transition-all ${
                isActive
                  ? 'bg-primary/10 border-primary text-foreground font-bold'
                  : 'glass-panel border-border text-foreground'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-border pb-3 mb-3">
                <div className="min-w-0">
                  <h3 className={`text-sm font-bold ${card.titleTone}`}>{card.title}</h3>
                  <p className="text-[11px] text-muted-foreground">{card.subtitle}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getDecisionBadgeColor(
                    m.decisionStatus
                  )}`}
                >
                  {m.decisionStatus}
                </span>
              </div>

              {isDraftPreview && (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-warning">
                  Preview — not yet applied
                </p>
              )}

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Hurdle Rate:</span>
                  <span className="text-foreground font-bold">{formatPercent(card.hurdle)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Net Present Value (NPV):</span>
                  <span className={`font-bold ${m.npv >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatAED(m.npv)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Internal Rate of Return:</span>
                  <span className="text-primary font-bold">{formatPercent(m.irr)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Modified IRR:</span>
                  <span className="text-info font-bold">{formatPercent(m.mirr)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Profitability Index:</span>
                  <span className="text-foreground font-bold">{m.profitabilityIndex.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between py-1 pt-2">
                  <span className="text-muted-foreground">Payback Period:</span>
                  <span className="text-warning font-bold">
                    {m.paybackPeriodYears ? `${m.paybackPeriodYears.toFixed(1)} Yrs` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NPV Comparison Chart */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> NPV Comparison Across Scenarios
          </h3>
          <span className="text-xs text-muted-foreground font-mono">AED Millions</span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={colors.grid} />
              <XAxis dataKey="name" stroke={colors.axis} tick={{ fontSize: 11 }} />
              <YAxis
                stroke={colors.axis}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}M`}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: colors.tooltipBg,
                  borderColor: colors.tooltipBorder,
                  color: colors.tooltipText,
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
                formatter={(val: number) => [`AED ${val.toFixed(2)}M`, 'NPV']}
              />
              <ReferenceLine y={0} stroke={colors.neutral} strokeDasharray="4 4" />
              <Bar dataKey="npv" radius={[3, 3, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.name} fill={d.npv >= 0 ? colors.primary : colors.danger} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Custom Scenario Tuner */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> Interactive Custom Scenario Tuning
          </h3>
          <span
            className={`text-xs font-mono ${isDirty ? 'text-warning font-bold' : 'text-muted-foreground'}`}
            role="status"
          >
            {isDirty
              ? 'Unapplied changes — press Apply Parameters'
              : isCustomActive
                ? 'Applied and active'
                : 'Applied — switch to Custom to activate'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Investment Multiplier Slider */}
          <div className="space-y-2">
            <label htmlFor="capex-mult" className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Capex Multiplier:</span>
              <span className="text-primary font-bold font-mono">
                {draft.investmentMultiplier.toFixed(2)}x
              </span>
            </label>
            <input
              id="capex-mult"
              type="range"
              {...SLIDER_BOUNDS.investmentMultiplier}
              value={draft.investmentMultiplier}
              onChange={(e) => setDraft((d) => ({ ...d, investmentMultiplier: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-muted rounded-card appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Benefits Multiplier Slider */}
          <div className="space-y-2">
            <label htmlFor="benefit-mult" className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Benefits Multiplier:</span>
              <span className="text-primary font-bold font-mono">
                {draft.operatingBenefitMultiplier.toFixed(2)}x
              </span>
            </label>
            <input
              id="benefit-mult"
              type="range"
              {...SLIDER_BOUNDS.operatingBenefitMultiplier}
              value={draft.operatingBenefitMultiplier}
              onChange={(e) =>
                setDraft((d) => ({ ...d, operatingBenefitMultiplier: parseFloat(e.target.value) }))
              }
              className="w-full h-1.5 bg-muted rounded-card appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* OpEx Multiplier Slider */}
          <div className="space-y-2">
            <label htmlFor="opex-mult" className="flex justify-between text-xs">
              <span className="text-foreground font-medium">OpEx Multiplier:</span>
              <span className="text-primary font-bold font-mono">
                {draft.operatingCostMultiplier.toFixed(2)}x
              </span>
            </label>
            <input
              id="opex-mult"
              type="range"
              {...SLIDER_BOUNDS.operatingCostMultiplier}
              value={draft.operatingCostMultiplier}
              onChange={(e) =>
                setDraft((d) => ({ ...d, operatingCostMultiplier: parseFloat(e.target.value) }))
              }
              className="w-full h-1.5 bg-muted rounded-card appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Hurdle Rate Slider */}
          <div className="space-y-2">
            <label htmlFor="hurdle-rate" className="flex justify-between text-xs">
              <span className="text-foreground font-medium">Hurdle Rate (WACC):</span>
              <span className="text-primary font-bold font-mono">
                {(draft.discountRate * 100).toFixed(1)}%
              </span>
            </label>
            <input
              id="hurdle-rate"
              type="range"
              {...SLIDER_BOUNDS.discountRate}
              value={draft.discountRate}
              onChange={(e) => setDraft((d) => ({ ...d, discountRate: parseFloat(e.target.value) }))}
              className="w-full h-1.5 bg-muted rounded-card appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={applyDraft}
            disabled={!isDirty && isCustomActive}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-card bg-primary text-primary-foreground font-bold text-xs transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="h-4 w-4" />
            {!isDirty && isCustomActive ? 'Parameters Applied' : 'Apply Parameters'}
          </button>

          <button
            type="button"
            onClick={resetDraft}
            disabled={slidersEqual(draft, DEFAULT_SLIDERS)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" /> Reset to Baseline
          </button>

          <span className="text-[11px] text-muted-foreground font-mono">
            Preview NPV: <strong className={customPreview.metrics.npv >= 0 ? 'text-success' : 'text-destructive'}>
              {formatAED(customPreview.metrics.npv)}
            </strong>
          </span>
        </div>
      </div>

      {/* Narrative Explanation of Scenario Variations */}
      <div className="glass-panel p-5 space-y-3">
        <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> Strategic Analysis of Decision Thresholds
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The baseline investment in NovaRetail GCC’s micro-fulfilment centre yields a robust{' '}
          <strong>{formatAED(Base.metrics.npv)}</strong> net present value. In the{' '}
          <strong>Optimistic Scenario</strong>, lower hardware integration costs (-5%) combined with stronger
          customer delivery SLA uptake (+10% benefits) elevate NPV to{' '}
          <strong>{formatAED(Optimistic.metrics.npv)}</strong>. Conversely, the{' '}
          <strong>Pessimistic Scenario</strong> reflects a severe operational stress test (+15% capex cost
          overrun, -25% benefit shortfall, 14.5% interest rate environment), which shifts the recommendation
          from full approval to phased implementation or delay.
        </p>
      </div>
    </div>
  );
}
