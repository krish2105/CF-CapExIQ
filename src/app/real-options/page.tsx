'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { evaluatePhasedInvestmentPaths } from '@/lib/finance/realOptions';
import { formatAED } from '@/lib/utils/formatting';
import { GitBranch, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

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
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" /> Real Options & Phased Investment Decision Analysis
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Staged Decision Trees, Downside Capital Risk Protection & Expansion Options
          </p>
        </div>
      </div>

      {/* Decision Path Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paths.map((path, idx) => (
          <div key={idx} className="glass-panel p-5 rounded-2xl border border-border space-y-3 flex flex-col justify-between">
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
                <span className="font-bold text-purple-400">{path.downsideProtectionPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
