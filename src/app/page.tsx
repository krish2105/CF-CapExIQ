'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  formatAED,
  formatPercent,
  formatAEDCompact,
  getDecisionBadgeColor,
} from '@/lib/utils/formatting';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import { ChartGradients, GRADIENT_IDS, axisProps, LedgerTooltip } from '@/components/ui/charts';
import { Card, Badge, GildedRule, SectionHeading } from '@/components/ui/primitives';
import { CountUp } from '@/components/ui/motion';
import {
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Check,
  Sparkles,
} from 'lucide-react';

/**
 * Overview — editorial register.
 *
 * This is one of two marketing-register surfaces (with /presentation). It gets
 * the full Slash treatment: 88px Playfair display type, generous vertical
 * rhythm, whitespace-separated cards, and framer-motion choreography. The
 * dense app routes deliberately do not look like this.
 */

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function OverviewPage() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const colors = useThemeChartColors();
  const reduce = useReducedMotion();

  // Hero visualisation: discounted cumulative position, Y0 → Y5.
  const heroSeries = [
    { year: 'Y0', value: -metrics.totalInitialOutlay / 1_000_000 },
    ...scenarioResult.yearlyCashFlows.map((cf) => ({
      year: `Y${cf.year}`,
      value: cf.cumulativeDiscountedCashFlow / 1_000_000,
    })),
  ];

  const decisionOptions = [
    {
      id: 'Approve',
      index: '01',
      title: 'Full Investment Approval',
      desc: 'Approve the full AED 24.0M capital investment (AED 22.0M CapEx + AED 2.0M working capital) for an immediate five-year automated micro-fulfilment rollout.',
      active: metrics.decisionStatus === 'Approve',
    },
    {
      id: 'Phased Implementation',
      index: '02',
      title: 'Phased Implementation',
      desc: 'Commit a Phase 1 pilot outlay of AED 14.0M. Hold the remaining AED 10.0M subject to the Stage Gate 4 WCS API latency benchmark of under 50ms.',
      active: metrics.decisionStatus === 'Phased Implementation',
    },
    {
      id: 'Delay Pending Evidence',
      index: '03',
      title: 'Delay Twelve Months',
      desc: 'Defer capital expenditure to monitor UAE e-commerce demand stabilisation and negotiate supplier equipment price reductions.',
      active: metrics.decisionStatus === 'Delay Pending Evidence',
    },
    {
      id: 'Reject',
      index: '04',
      title: 'Reject Investment',
      desc: 'Decline capital allocation and maintain status-quo manual warehouse picking operations across the UAE fulfilment hub network.',
      active: metrics.decisionStatus === 'Reject',
    },
  ];

  const workflow = [
    {
      href: '/assumptions',
      step: '01',
      title: 'Assumptions Register',
      desc: 'Inspect, tune or import CapEx outlays, operating savings, and macroeconomic discount parameters.',
    },
    {
      href: '/scenarios',
      step: '02',
      title: 'Scenario Engine',
      desc: 'Compare Base, Optimistic, Pessimistic and Custom scenario cash flows against return thresholds.',
    },
    {
      href: '/sensitivity',
      step: '03',
      title: 'Sensitivity Analysis',
      desc: 'Evaluate two-dimensional heatmaps and tornado charts across discount rate and operating benefit.',
    },
  ];

  const stats = [
    {
      label: 'Initial Outlay',
      value: metrics.totalInitialOutlay,
      format: (n: number) => formatAEDCompact(n),
      caption: 'AED 22M CapEx + AED 2M NWC',
      tone: 'text-foreground',
    },
    {
      label: 'Net Present Value',
      value: metrics.npv,
      format: (n: number) => formatAEDCompact(n),
      caption: `Discounted at ${formatPercent(assumptions.discountRate)}`,
      tone: metrics.npv >= 0 ? 'text-success' : 'text-destructive',
    },
    {
      label: 'Internal Rate of Return',
      value: (metrics.irr ?? 0) * 100,
      format: (n: number) => `${n.toFixed(1)}%`,
      caption: `MIRR ${formatPercent(metrics.mirr)}`,
      tone: 'text-primary',
    },
    {
      label: 'Payback Period',
      value: metrics.paybackPeriodYears ?? 0,
      format: (n: number) => `${n.toFixed(1)} yrs`,
      caption: `Discounted ${metrics.discountedPaybackPeriodYears?.toFixed(1) ?? 'n/a'} yrs`,
      tone: 'text-foreground',
    },
  ];

  return (
    <div className="register-editorial -mx-4 lg:-mx-8 -my-6 lg:-my-8">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="brand-wash-lg absolute inset-0 pointer-events-none opacity-70"

          aria-hidden="true"
        />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative page-shell px-4 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24"
        >
          {/* Headline spans the full shell so the sentence sets on a single
              horizontal line at desktop widths rather than being hard-broken
              into three stacked fragments. */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-2 mb-7">
            <Badge tone="accent" icon={<Sparkles className="h-3 w-3" />}>
              NovaRetail GCC Evaluation
            </Badge>
            <Badge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>
              Hypothetical Entity
            </Badge>
          </motion.div>

          <motion.h1 variants={item} className="display-hero text-foreground">
            Capital that <span className="gilded-text">earns its place</span> on the balance
            sheet.
          </motion.h1>

          <div className="mt-10 lg:mt-14 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 lg:gap-16 items-center">
          {/* --- Left column --- */}
          <div className="min-w-0">
            <motion.p
              variants={item}
              className="text-body-sm text-muted-foreground max-w-[46ch] font-light"
            >
              A deterministic capital-budgeting engine evaluating a five-year automated
              micro-fulfilment centre in Dubai — compressing UAE order fulfilment from 24 hours
              to 2, and direct picking cost from AED 14.50 to AED 4.20 per order.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn-primary">
                Open Executive Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/presentation" className="btn-ghost">
                Boardroom Presentation
              </Link>
            </motion.div>

            <motion.div variants={item} className="mt-9 flex items-center gap-3 flex-wrap">
              <span
                suppressHydrationWarning
                className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs ${getDecisionBadgeColor(
                  metrics.decisionStatus
                )}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Recommended: {metrics.decisionStatus}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Active scenario: {selectedScenario}
              </span>
            </motion.div>
          </div>

          {/* --- Right column: the hero chart card --- */}
          <motion.div
            variants={item}
            initial={reduce ? undefined : { opacity: 0, y: 26, scale: 0.985 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <Card gilded padding="none" className="overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-6 pb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Discounted cumulative position
                  </p>
                  <p
                    suppressHydrationWarning
                    className="mt-2 text-[clamp(28px,3.6vw,44px)] font-display leading-none text-foreground"
                  >
                    <CountUp
                      value={metrics.npv}
                      format={(n) => formatAED(n, 0)}
                      durationMs={1500}
                      delay={500}
                    />
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Net present value at {formatPercent(assumptions.discountRate)} WACC
                  </p>
                </div>
                <Badge tone={metrics.npv >= 0 ? 'positive' : 'negative'} icon={<Check className="h-3 w-3" />}>
                  {metrics.npv >= 0 ? 'Value accretive' : 'Value dilutive'}
                </Badge>
              </div>

              <div className="h-[220px] px-2 pb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroSeries} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                    <ChartGradients />
                    <XAxis dataKey="year" {...axisProps} />
                    <YAxis
                      {...axisProps}
                      width={44}
                      tickFormatter={(v: number) => `${v.toFixed(0)}M`}
                    />
                    <ReferenceLine y={0} stroke={colors.neutral} strokeDasharray="2 4" />
                    <Tooltip
                      content={
                        <LedgerTooltip
                          formatter={(v) => `AED ${Number(v).toFixed(2)}M`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Cumulative discounted"
                      stroke={`url(#${GRADIENT_IDS.gildedStroke})`}
                      strokeWidth={2.5}
                      fill={`url(#${GRADIENT_IDS.gildedArea})`}
                      dot={{ r: 3, fill: colors.gildStart, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: colors.gildMid, strokeWidth: 0 }}
                      isAnimationActive={!reduce}
                      animationDuration={1700}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t border-border px-6 py-3 flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Deterministic engine · zero LLM delegation
                </span>
                <span className="text-[11px] font-mono text-primary">
                  PI {metrics.profitabilityIndex.toFixed(3)}x
                </span>
              </div>
            </Card>
          </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ================= STAT BAND ================= */}
      <section className="border-b border-border">
        <div className="page-shell px-4 lg:px-8 py-14 lg:py-20">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={item}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </p>
                <p
                  suppressHydrationWarning
                  className={`mt-3 font-display leading-none text-[clamp(28px,3.2vw,44px)] ${s.tone}`}
                >
                  <CountUp value={s.value} format={s.format} durationMs={1400} />
                </p>
                <p className="mt-2.5 text-xs text-muted-foreground">{s.caption}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= DECISION ALTERNATIVES ================= */}
      <section className="border-b border-border">
        <div className="page-shell px-4 lg:px-8 py-14 lg:py-20">
          <SectionHeading
            register="editorial"
            eyebrow="Capital Committee"
            title="Four alternatives on the table."
            description="The engine scores each option against the 11.5% hurdle rate. One is recommended; the other three remain fully modelled so the committee can interrogate the counterfactual."
          />

          <GildedRule className="mb-10 mt-2" />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-2 gap-x-8 gap-y-10"
          >
            {decisionOptions.map((opt) => (
              <motion.article key={opt.id} variants={item} className="group">
                <div className="flex items-baseline gap-4 mb-3">
                  <span
                    className={`font-display text-[28px] leading-none ${
                      opt.active ? 'text-primary' : 'text-border-strong'
                    }`}
                  >
                    {opt.index}
                  </span>
                  <h3 className="font-display text-[clamp(20px,2vw,28px)] leading-tight text-foreground">
                    {opt.title}
                  </h3>
                  {opt.active && (
                    <Badge tone="accent" className="ml-auto shrink-0">
                      Recommended
                    </Badge>
                  )}
                </div>
                <div
                  className={`h-px w-full mb-4 transition-colors ${
                    opt.active ? 'bg-primary/50' : 'bg-border'
                  }`}
                />
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[52ch]">
                  {opt.desc}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= WORKFLOW ================= */}
      <section>
        <div className="page-shell px-4 lg:px-8 py-14 lg:py-20">
          <SectionHeading
            register="editorial"
            eyebrow="Decision Workflow"
            title="Three steps to a defensible number."
            align="center"
          />

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mt-12"
          >
            {workflow.map((w) => (
              <motion.div key={w.href} variants={item}>
                <Link href={w.href} className="block h-full">
                  <Card interactive padding="lg" className="h-full flex flex-col">
                    <span className="font-mono text-[11px] text-primary tracking-[0.14em]">
                      {w.step}
                    </span>
                    <h3 className="mt-4 font-display text-[24px] leading-tight text-foreground">
                      {w.title}
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
                      {w.desc}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-primary link-rule self-start">
                      Continue
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
