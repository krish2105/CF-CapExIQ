'use client';

import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { transformAssumptionsForScenario, BASE_SCENARIO_DEFINITIONS } from '@/lib/finance/scenarios';
import { calculateCashFlowSchedule } from '@/lib/finance/cashflow';
import { attributeNpvVariance } from '@/lib/finance/varianceAttribution';
import { forecastOperatingSavings } from '@/lib/finance/forecast';
import { detectAssumptionAnomalies } from '@/lib/finance/assumptionAnomaly';
import { selectFormula, deriveContext } from '@/lib/finance/formulaSelection';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Card, PageHeader, SectionHeading, Badge } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/motion';
import { Brain, GitCompare, TrendingUp, ShieldAlert, Sigma, Sparkles } from 'lucide-react';

/**
 * Decision Intelligence.
 *
 * Four capabilities that share one property: the mathematics is deterministic
 * and computed client-side from the audited engine, and the AI layer is only
 * ever asked to put the result into a sentence. Each panel states its own
 * limitation rather than leaving the reader to assume it has none.
 */
export default function DecisionIntelligencePage() {
  const { assumptions } = useFinancialStore(useShallow((s) => ({ assumptions: s.assumptions })));

  const [compareTo, setCompareTo] = useState<'Optimistic' | 'Pessimistic'>('Pessimistic');
  const [narration, setNarration] = useState<string | null>(null);
  const [narrationSource, setNarrationSource] = useState<'idle' | 'model' | 'deterministic'>('idle');
  const [busy, setBusy] = useState(false);

  // ---- 1. Driver attribution -------------------------------------------
  const attribution = useMemo(() => {
    const baseline = transformAssumptionsForScenario(assumptions, BASE_SCENARIO_DEFINITIONS.Base);
    const comparison = transformAssumptionsForScenario(
      assumptions,
      BASE_SCENARIO_DEFINITIONS[compareTo]
    );
    return attributeNpvVariance(baseline, comparison);
  }, [assumptions, compareTo]);

  // ---- 2. Fitted forecast ----------------------------------------------
  // Observed manual-fulfilment spend, the series the savings case is built on.
  const observedSeries = useMemo(() => [6.42e6, 6.71e6, 6.98e6, 7.24e6, 7.55e6, 7.81e6], []);
  const forecast = useMemo(
    () => forecastOperatingSavings(assumptions, observedSeries),
    [assumptions, observedSeries]
  );

  // ---- 3. Input-side anomalies -----------------------------------------
  const anomalies = useMemo(() => detectAssumptionAnomalies(assumptions), [assumptions]);

  // ---- 4. Governing measure --------------------------------------------
  const advice = useMemo(() => {
    const schedule = calculateCashFlowSchedule(assumptions);
    const flows = schedule.map((r) => r.freeCashFlow);
    return selectFormula(deriveContext(assumptions, flows));
  }, [assumptions]);

  async function explainVariance() {
    setBusy(true);
    try {
      const res = await fetch('/api/ai/variance-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineNpv: attribution.baselineNpv,
          comparisonNpv: attribution.comparisonNpv,
          totalChange: attribution.totalChange,
          contributions: attribution.contributions.map((c) => ({
            label: c.label,
            fromValue: c.fromValue,
            toValue: c.toValue,
            npvImpact: c.npvImpact,
            shareOfMovement: c.shareOfMovement,
          })),
          contextLabel: `Base versus ${compareTo}`,
        }),
      });
      const json = await res.json();
      setNarration(json.explanation ?? null);
      setNarrationSource(json.isFallback ? 'deterministic' : 'model');
    } catch {
      setNarration('Narration is unavailable. The attribution below is unaffected.');
      setNarrationSource('deterministic');
    } finally {
      setBusy(false);
    }
  }

  const severityTone = (s: string) =>
    s === 'Critical' ? 'danger' : s === 'High' ? 'warning' : 'neutral';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decision intelligence"
        title="Why the number moved, and what it depends on"
        icon={<Brain className="h-6 w-6 text-primary" />}
        description="Four analyses computed deterministically from the audited engine. AI narrates the result; it does not produce it."
      />

      {/* ---------------- 1. Driver attribution ---------------- */}
      <Reveal>
        <Card padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              title="Driver attribution"
              description={`Why net present value differs between Base and ${compareTo}, decomposed so the parts reconcile exactly to the whole.`}
              icon={<GitCompare className="h-4 w-4 text-primary" />}
            />
            <div className="flex items-center gap-2">
              {(['Pessimistic', 'Optimistic'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setCompareTo(s); setNarration(null); setNarrationSource('idle'); }}
                  className={`px-3 py-1.5 rounded-card border text-xs font-medium transition-colors ${
                    compareTo === s
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground">Base case NPV</span>
              <p className="text-lg font-medium mt-1">{formatAED(attribution.baselineNpv)}</p>
            </div>
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground">{compareTo} NPV</span>
              <p className="text-lg font-medium mt-1">{formatAED(attribution.comparisonNpv)}</p>
            </div>
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground">Total movement</span>
              <p
                className={`text-lg font-medium mt-1 ${
                  attribution.totalChange < 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {formatAED(attribution.totalChange)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {attribution.contributions.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-56 shrink-0 text-[12px] text-card-foreground">{c.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.npvImpact < 0 ? 'bg-danger' : 'bg-success'}`}
                    style={{ width: `${Math.max(2, c.shareOfMovement * 100)}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-[12px] font-mono">
                  {formatAED(c.npvImpact)}
                </span>
                <span className="w-12 shrink-0 text-right text-[11px] text-muted-foreground font-mono">
                  {(c.shareOfMovement * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {attribution.contributions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No assumption differs between the two cases.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={explainVariance}
              disabled={busy || attribution.contributions.length === 0}
              className="btn-primary text-xs disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {busy ? 'Explaining…' : 'Explain this movement'}
            </button>
            {narrationSource !== 'idle' && (
              <Badge tone={narrationSource === 'model' ? 'accent' : 'neutral'}>
                {narrationSource === 'model' ? 'Model response' : 'Deterministic fallback'}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              Residual {formatAED(attribution.unexplainedResidual)}
            </span>
          </div>

          {narration && (
            <p className="text-sm text-card-foreground leading-relaxed border-l-2 border-primary/40 pl-3">
              {narration}
            </p>
          )}
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ---------------- 2. Fitted forecast ---------------- */}
        <Reveal delay={60}>
          <Card padding="md" className="space-y-3 h-full">
            <SectionHeading
              title="Fitted savings forecast"
              description="Growth fitted to observed spend by least squares on logs, with bands from the regression's own standard error."
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
            />
            {forecast.fit ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-panel p-2.5">
                    <span className="text-[10px] text-muted-foreground">Fitted growth</span>
                    <p className="text-sm font-medium mt-0.5">{formatPercent(forecast.fit.annualGrowth)}</p>
                  </div>
                  <div className="glass-panel p-2.5">
                    <span className="text-[10px] text-muted-foreground">Assumed growth</span>
                    <p className="text-sm font-medium mt-0.5">{formatPercent(forecast.assumedGrowth)}</p>
                  </div>
                  <div className="glass-panel p-2.5">
                    <span className="text-[10px] text-muted-foreground">Fit quality (R²)</span>
                    <p className="text-sm font-medium mt-0.5">{forecast.fit.rSquared.toFixed(3)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {forecast.points.map((p) => (
                    <div key={p.year} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="w-14 text-muted-foreground">Year {p.year}</span>
                      <span className="w-24 text-right text-muted-foreground">{formatAED(p.p10)}</span>
                      <span className="w-24 text-right text-foreground">{formatAED(p.p50)}</span>
                      <span className="w-24 text-right text-muted-foreground">{formatAED(p.p90)}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Columns: P10 · P50 · P90. Bands widen with the square root of the horizon.
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
                  <strong className="font-medium text-foreground">Limitation.</strong> A log-linear
                  trend fit, not a time-series model — no seasonality, no autocorrelation, no
                  exogenous drivers. The band expresses fit uncertainty only, not model risk.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{forecast.declinedReason}</p>
            )}
          </Card>
        </Reveal>

        {/* ---------------- 3. Input anomalies ---------------- */}
        <Reveal delay={120}>
          <Card padding="md" className="space-y-3 h-full">
            <SectionHeading
              title="Assumption screening"
              description="Input-side checks that run before the engine, rather than after a result already exists."
              icon={<ShieldAlert className="h-4 w-4 text-primary" />}
            />
            {anomalies.length === 0 ? (
              <p className="text-sm text-success">
                No assumption falls outside its plausible range. The register passes input screening.
              </p>
            ) : (
              <div className="space-y-2">
                {anomalies.map((a) => (
                  <div key={a.id} className="glass-panel p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-foreground">{a.field}</span>
                      <Badge tone={severityTone(a.severity) as never}>{a.severity}</Badge>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">{a.observed}</p>
                    <p className="text-[11px] text-card-foreground leading-snug">{a.expectation}</p>
                    <p className="text-[11px] text-warning leading-snug">{a.consequence}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
              <strong className="font-medium text-foreground">Limitation.</strong> Range checks detect
              only what they were written to detect. An assumption inside every range can still be wrong.
            </p>
          </Card>
        </Reveal>
      </div>

      {/* ---------------- 4. Formula selection ---------------- */}
      <Reveal delay={160}>
        <Card padding="md" className="space-y-3">
          <SectionHeading
            title="Which measure governs this decision"
            description="NPV ranks correctly only when horizons match and capital is unconstrained. Change either and it silently gives the wrong ranking."
            icon={<Sigma className="h-4 w-4 text-primary" />}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground">Governing measure</span>
              <p className="text-base font-medium text-primary mt-1">{advice.primary}</p>
            </div>
            <div className="glass-panel p-3.5 lg:col-span-2">
              <span className="text-[11px] text-muted-foreground">Why</span>
              <p className="text-[12px] text-card-foreground mt-1 leading-relaxed">{advice.rationale}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Treat with caution
            </span>
            {advice.cautions.map((c) => (
              <div key={c.measure} className="glass-panel p-3">
                <p className="text-[12px] font-medium text-warning">{c.measure}</p>
                <p className="text-[11px] text-card-foreground leading-snug mt-0.5">{c.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
