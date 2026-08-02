'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  formatAED,
  formatPercent,
  formatAEDCompact,
  getDecisionBadgeColor,
  getRiskSeverityBadgeColor,
} from '@/lib/utils/formatting';
import { evaluateAllScenarios } from '@/lib/finance/scenarios';
import { evaluateRiskAlerts } from '@/lib/finance/risk';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartCard,
  ChartGradients,
  GRADIENT_IDS,
  axisProps,
  gridProps,
  legendProps,
  LedgerTooltip,
} from '@/components/ui/charts';
import {
  Card,
  Badge,
  PageHeader,
  StatCard,
} from '@/components/ui/primitives';
import { Reveal, usePrefersReducedMotion } from '@/components/ui/motion';
import { RoleGate, useRole } from '@/components/auth/RoleGate';
import { can, roleLabel, roleSummary } from '@/lib/auth/permissions';
import { TrendingUp, ShieldAlert, Bot, Info, Eye } from 'lucide-react';

/**
 * Executive Dashboard — app register.
 *
 * Deliberately NOT the editorial treatment used on the landing page: serif is
 * capped at ~28px, vertical rhythm is compressed to 24–32px, and the six-up
 * metric grid stays at-a-glance. Motion is CSS-driven (Reveal / CountUp), not
 * framer-motion — a data surface that re-renders on every scenario switch
 * should not carry spring physics.
 */
export default function DashboardPage() {
  const { assumptions, selectedScenario } = useFinancialStore(
    useShallow((s) => ({ assumptions: s.assumptions, selectedScenario: s.selectedScenario }))
  );
  const activeAssumptions = useFinancialStore(useShallow((s) => s.getActiveAssumptions()));
  const scenarioResult = useFinancialStore((s) => s.getActiveScenarioResult());
  const metrics = scenarioResult.metrics;
  const yearlyCashFlows = scenarioResult.yearlyCashFlows;
  const colors = useThemeChartColors();
  const reduce = usePrefersReducedMotion();
  const role = useRole();

  // The Executive Lens decides how much of the model this viewer is shown.
  const showAdvanced = can(role, 'metrics.advanced');
  const showRiskResponse = can(role, 'risk.mitigation');

  const allScenarios = useMemo(() => evaluateAllScenarios(assumptions), [assumptions]);
  const riskAlerts = useMemo(
    () => evaluateRiskAlerts(activeAssumptions, metrics, allScenarios.Pessimistic),
    [activeAssumptions, metrics, allScenarios]
  );

  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    setAiSummary(
      `Based on a deterministic net present value of ${formatAED(metrics.npv)} and an internal rate of return of ${formatPercent(
        metrics.irr
      )} — exceeding the ${formatPercent(
        activeAssumptions.discountRate
      )} WACC hurdle — the automated micro-fulfilment centre delivers a strong financial return. ${
        // The metric grid gates Profitability Index behind `metrics.advanced`,
        // but this narrative interpolated it unconditionally — so the figure
        // withheld from the tile above was printed in prose directly below it.
        // Gating one presentation of a number and not the other is not gating.
        showAdvanced
          ? `A profitability index of ${metrics.profitabilityIndex.toFixed(2)} and a payback period of ${metrics.paybackPeriodYears?.toFixed(1)} years justify`
          : `A payback period of ${metrics.paybackPeriodYears?.toFixed(1)} years justifies`
      } capital commitment under the ${selectedScenario} scenario. Management controls must mandate vendor SLA penalty clauses and a 15% maximum CapEx overrun ceiling.`
    );
    // `showAdvanced` is a dependency: without it, switching lens leaves the
    // previously composed summary on screen, still carrying the figure the
    // new lens is not entitled to.
  }, [metrics, activeAssumptions, selectedScenario, showAdvanced]);

  const annualChartData = yearlyCashFlows.map((item) => ({
    year: `Year ${item.year}`,
    freeCashFlow: item.freeCashFlow / 1_000_000,
  }));

  const cumulativeChartData = yearlyCashFlows.map((item) => ({
    year: `Year ${item.year}`,
    cumulativeFCF: item.cumulativeCashFlow / 1_000_000,
    cumulativeDiscountedFCF: item.cumulativeDiscountedCashFlow / 1_000_000,
  }));

  const scenarioChartData = (['Optimistic', 'Base', 'Pessimistic'] as const).map((s) => ({
    scenario: s,
    npv: allScenarios[s].metrics.npv / 1_000_000,
    irr: (allScenarios[s].metrics.irr || 0) * 100,
  }));

  /**
   * Metric grid, filtered by lens.
   *
   * `advanced: true` marks the analyst-grade figures (MIRR-derived captions,
   * profitability index, discounted payback). A CEO or COO sees the headline
   * position without them, so the grid reflows to a clean 3-up rather than
   * leaving gaps where withheld tiles used to be.
   */
  const metricCards = [
    {
      label: 'Initial Outlay',
      value: metrics.totalInitialOutlay,
      format: (n: number) => formatAEDCompact(n),
      caption: 'Time zero (Y0)',
      tone: 'default' as const,
      advanced: false,
    },
    {
      label: 'Baseline NPV',
      value: metrics.npv,
      format: (n: number) => formatAEDCompact(n),
      caption: `WACC ${formatPercent(activeAssumptions.discountRate)}`,
      tone: (metrics.npv >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
      advanced: false,
    },
    {
      label: 'IRR',
      value: (metrics.irr ?? 0) * 100,
      format: (n: number) => `${n.toFixed(2)}%`,
      // MIRR is itself an advanced figure — drop it from the caption rather
      // than leaking it to a lens that does not hold metrics.advanced.
      caption: showAdvanced
        ? `MIRR ${formatPercent(metrics.mirr)}`
        : `vs. WACC ${formatPercent(activeAssumptions.discountRate)}`,
      tone: 'accent' as const,
      advanced: false,
    },
    {
      label: 'Profitability Index',
      value: metrics.profitabilityIndex,
      format: (n: number) => `${n.toFixed(3)}x`,
      caption: 'Target ≥ 1.05x',
      tone: 'default' as const,
      advanced: true,
    },
    {
      label: 'Payback',
      value: metrics.paybackPeriodYears ?? 0,
      format: (n: number) => (n > 0 ? `${n.toFixed(1)} yrs` : 'N/A'),
      caption: 'Undiscounted',
      tone: 'default' as const,
      advanced: false,
    },
    {
      label: 'Discounted Payback',
      value: metrics.discountedPaybackPeriodYears ?? 0,
      format: (n: number) => (n > 0 ? `${n.toFixed(1)} yrs` : '> 6.0 yrs'),
      caption: 'Project horizon',
      tone: 'default' as const,
      advanced: true,
    },
  ].filter((m) => showAdvanced || !m.advanced);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Executive Dashboard"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        title="Investment position at a glance"
        description={
          <>
            NovaRetail GCC · Automated Micro-Fulfilment Centre · Active scenario{' '}
            <strong className="text-primary font-medium">{selectedScenario}</strong>
          </>
        }
        actions={
          <span
            suppressHydrationWarning
            className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs ${getDecisionBadgeColor(
              metrics.decisionStatus
            )}`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {metrics.decisionStatus}
          </span>
        }
      />

      {/* ---- Active lens banner ----
           Makes the authorisation boundary explicit. Without this, a COO who
           sees four tiles where a CFO sees six has no way to tell whether the
           model is restricted or simply broken. */}
      <Reveal variant="fade">
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1.5 rounded-card border border-border bg-muted/40 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {roleLabel(role)}
          </span>
          <span className="hidden sm:block h-3 w-px bg-border shrink-0" aria-hidden="true" />
          <p className="text-[11px] text-muted-foreground leading-relaxed min-w-0 flex-1">
            {roleSummary(role)}
          </p>
        </div>
      </Reveal>

      {/* ---- Metric grid ----
           Column count follows the number of tiles the lens actually holds,
           so a restricted grid stays balanced instead of leaving dead cells. */}
      <div
        className={`grid grid-cols-2 gap-3 ${
          metricCards.length >= 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
        }`}
      >
        {metricCards.map((m, i) => (
          <Reveal key={m.label} delay={i * 55}>
            <StatCard
              label={m.label}
              value={m.value}
              format={m.format}
              caption={m.caption}
              tone={m.tone}
              size="sm"
              delay={i * 55}
              gilded={m.label === 'Baseline NPV'}
            />
          </Reveal>
        ))}
      </div>

      {/* ---- Primary charts ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Annual free cash flow"
          subtitle="AED millions, Years 0 – 6"
          delay={80}
          height={272}
          footnote="Bars below zero represent net capital outflow."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={annualChartData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <ChartGradients />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} />
              <ReferenceLine y={0} stroke={colors.neutral} strokeWidth={1} />
              <Tooltip
                cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
                content={<LedgerTooltip formatter={(v) => `AED ${Number(v).toFixed(2)}M`} />}
              />
              <Bar
                dataKey="freeCashFlow"
                name="Free cash flow"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={1100}
              >
                {annualChartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.freeCashFlow >= 0
                        ? `url(#${GRADIENT_IDS.gildedBar})`
                        : colors.danger
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <RoleGate
          require={['financials.schedule']}
          fallback="notice"
          label="Payback trajectory"
        >
        <ChartCard
          title="Payback trajectory"
          subtitle="Cumulative vs. discounted cumulative, AED millions"
          delay={140}
          height={272}
          footnote={`Break-even at ${metrics.paybackPeriodYears?.toFixed(1) ?? 'n/a'} yrs undiscounted.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeChartData}
              margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
              className={reduce ? undefined : 'chart-draw'}
            >
              <ChartGradients />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="year" {...axisProps} />
              <YAxis {...axisProps} />
              <ReferenceLine y={0} stroke={colors.danger} strokeDasharray="3 4" />
              <Tooltip content={<LedgerTooltip formatter={(v) => `AED ${Number(v).toFixed(2)}M`} />} />
              <Legend {...legendProps} />
              <Line
                type="monotone"
                dataKey="cumulativeFCF"
                name="Cumulative FCF"
                stroke={`url(#${GRADIENT_IDS.gildedStroke})`}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colors.gildStart, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={!reduce}
                animationDuration={1400}
              />
              <Line
                type="monotone"
                dataKey="cumulativeDiscountedFCF"
                name="Discounted"
                stroke={colors.purple}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: colors.purple, strokeWidth: 0 }}
                isAnimationActive={!reduce}
                animationDuration={1400}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        </RoleGate>
      </div>

      {/* ---- Scenario comparison + advisory ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard
          title="Scenario NPV"
          subtitle="AED millions"
          delay={80}
          height={232}
          className="lg:col-span-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scenarioChartData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <ChartGradients />
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="scenario" {...axisProps} />
              <YAxis {...axisProps} />
              <ReferenceLine y={0} stroke={colors.neutral} />
              <Tooltip
                cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
                content={<LedgerTooltip formatter={(v) => `AED ${Number(v).toFixed(2)}M`} />}
              />
              <Bar
                dataKey="npv"
                name="NPV"
                radius={[3, 3, 0, 0]}
                isAnimationActive={!reduce}
                animationDuration={1100}
              >
                {scenarioChartData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.npv >= 0 ? `url(#${GRADIENT_IDS.gildedBar})` : colors.danger}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Reveal delay={140} className="lg:col-span-2">
          <Card padding="none" className="h-full flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
              <h4 className="text-[15px] font-medium text-foreground flex items-center gap-2 tracking-tight">
                <Bot className="h-4 w-4 text-primary" /> Executive advisory
              </h4>
              <Badge tone="accent">Structured governance output</Badge>
            </div>

            <p className="px-5 py-4 text-sm text-card-foreground leading-relaxed flex-1">
              {aiSummary}
            </p>

            <div className="mx-5 mb-5 flex items-start gap-2.5 rounded-card border border-warning/30 bg-warning-soft p-3">
              <Info className="h-4 w-4 shrink-0 text-warning mt-0.5" />
              <p className="text-[11px] text-foreground/85 leading-relaxed">
                <strong className="font-medium">Human review required.</strong> AI-generated
                explanations are advisory. All assumptions, calculations and final investment
                decisions must be reviewed and approved by a qualified human decision-maker.
              </p>
            </div>
          </Card>
        </Reveal>
      </div>

      {/* ---- Risk alerts ---- */}
      <Reveal delay={80}>
        <Card padding="none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h4 className="text-[15px] font-medium text-foreground flex items-center gap-2 tracking-tight">
              <ShieldAlert className="h-4 w-4 text-warning" /> Rule-based risk alerts
            </h4>
            <span className="text-xs text-muted-foreground font-mono">
              {riskAlerts.length} active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {riskAlerts.slice(0, 4).map((alert, i) => (
              <div
                key={alert.id}
                className={`p-5 space-y-2 border-border ${
                  i % 2 === 0 ? 'md:border-r' : ''
                } ${i < 2 ? 'border-b' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-medium text-foreground">{alert.title}</span>
                  <span
                    className={`shrink-0 rounded-pill border px-2 py-0.5 text-[10px] ${getRiskSeverityBadgeColor(
                      alert.severity
                    )}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {alert.explanation}
                </p>
                {/* The prescribed management response is a governance
                    instruction, not an observation — only lenses that own
                    mitigation see it. */}
                {showRiskResponse && (
                  <p className="text-[11px] text-primary font-mono pt-1">
                    → {alert.managementResponse}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
