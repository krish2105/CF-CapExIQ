'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { evaluatePhasedInvestmentPaths } from '@/lib/finance/realOptions';
import { formatAED } from '@/lib/utils/formatting';
import { Info, GitBranch, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RealOptionsPage() {
  const { getActiveScenarioResult } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const baseNpv = scenarioResult.metrics.npv;
  const baseOutlay = scenarioResult.metrics.totalInitialOutlay;

  const paths = evaluatePhasedInvestmentPaths(baseNpv, baseOutlay);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" /> Phased Investment Staging Analysis
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Stage-gate capital release paths and downside exposure at each gate
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 border-l-0 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-warning mt-0.5" />
        <p className="text-[11px] text-foreground/85 leading-relaxed">
          <strong className="font-medium">Scope.</strong> This module compares staged capital-release
          paths and the downside exposure carried at each gate. It is not a real-options valuation:
          it does not price the option to defer, expand or abandon, which would require a volatility
          input and a binomial or Black&ndash;Scholes lattice. Treat the figures below as a comparison
          of commitment profiles, not as option value.
        </p>
      </div>

      {/* Decision Path Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paths.map((path, idx) => (
          <div key={idx} className="glass-panel p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Path {idx + 1}</span>
              <h3 className="text-sm font-bold text-foreground">{path.pathName}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{path.recommendationNote}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-border font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year 0 Capital:</span>
                <span className="font-bold text-foreground">{formatAED(path.initialOutlay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected NPV:</span>
                <span className="font-bold text-success">{formatAED(path.expectedNpv)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downside Protected:</span>
                <span className="font-bold text-info">{path.downsideProtectionPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
