'use client';

import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { useMonteCarlo } from '@/lib/hooks/useMonteCarlo';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
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
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Dices, ShieldAlert, TrendingUp, RefreshCw, Info, Activity } from 'lucide-react';

export default function MonteCarloPage() {
  // Subscribe only to what moves the simulation. Pulling the whole store here
  // re-ran the 526ms simulation on unrelated writes such as a chat message.
  const assumptions = useFinancialStore(
    useShallow((s) => s.getActiveAssumptions())
  );
  const colors = useThemeChartColors();

  const [iterations, setIterations] = useState<number>(5000);
  const [seed, setSeed] = useState<number>(12345);

  const { summary: simulation, isRunning, tookMs, offThread } = useMonteCarlo(
    assumptions,
    iterations,
    seed
  );

  const handleReseed = () => {
    setSeed(Math.floor(Math.random() * 900000) + 100000);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Dices className="h-6 w-6 text-primary" /> Monte Carlo Probabilistic Risk Simulation
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>
              NovaRetail GCC • {simulation.iterations.toLocaleString()} Iterations Seeded Random
              Simulation (Pure Deterministic Engine)
            </span>
            {isRunning ? (
              <span className="text-primary font-mono" role="status">
                recomputing…
              </span>
            ) : (
              tookMs !== null && (
                <span className="text-muted-foreground font-mono">
                  {tookMs.toFixed(0)}ms {offThread ? 'off-thread' : 'main thread'}
                </span>
              )
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* The iteration count was fixed at 5,000 with no control bound to it,
              so the trade-off between sampling error and run time was not
              reachable from the UI. */}
          <label className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Iterations:</span>
            <select
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              className="rounded-card bg-card border border-border text-foreground text-xs font-mono font-semibold px-2 py-1.5"
            >
              {[1000, 2500, 5000, 10000, 25000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleReseed}
            className="px-3 py-1.5 rounded-card bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-primary" /> Reseed PRNG ({seed})
          </button>
        </div>
      </div>

      {/* Probability of Loss Alert Banner */}
      <div className="p-4 rounded-card bg-card border border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <span>Probabilistic Downside Exposure Summary</span>
          </div>
          <span className="text-xs font-mono font-bold text-primary">
            Risk-Adjusted Confidence
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Out of {simulation.iterations.toLocaleString()} simulated market realizations, <strong>{(100 - simulation.probNegativeNpvPct).toFixed(1)}%</strong> generated positive NPV ($NPV &gt; 0$). The probability of negative NPV (capital loss exposure) is estimated at <strong>{simulation.probNegativeNpvPct.toFixed(1)}%</strong>.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Expected Mean NPV</span>
          <p className="text-lg font-bold text-success mt-1">{formatAED(simulation.meanNpv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">StdDev: {formatAED(simulation.stdDevNpv)}</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Median NPV (P50)</span>
          <p className="text-lg font-bold text-primary mt-1">{formatAED(simulation.medianNpv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">50th Percentile</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Downside Case (P10 NPV)</span>
          <p className="text-lg font-bold text-warning mt-1">{formatAED(simulation.p10Npv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">10% Conservative Bound</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Upside Case (P90 NPV)</span>
          <p className="text-lg font-bold text-info mt-1">{formatAED(simulation.p90Npv)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">90% Optimistic Bound</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NPV Frequency Histogram */}
        <div className="glass-panel p-5 space-y-3">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> NPV Probability Distribution Histogram
          </h3>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simulation.histogramData}>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="binLabel" stroke={colors.axis} tick={{ fontSize: 10 }} />
                <YAxis stroke={colors.axis} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText, borderRadius: '12px' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Frequency']}
                />
                <ReferenceLine x="0M" stroke={colors.danger} strokeDasharray="4 4" label={{ value: 'Break-even', fill: colors.danger, fontSize: 10 }} />
                <Bar dataKey="frequencyPct" fill={colors.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative S-Curve */}
        <div className="glass-panel p-5 space-y-3">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" /> Cumulative Probability S-Curve (P(NPV ≤ X))
          </h3>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulation.cumulativeCurveData}>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={colors.grid} />
                <XAxis dataKey="npv" stroke={colors.axis} tick={{ fontSize: 10 }} unit="M" />
                <YAxis stroke={colors.axis} tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText, borderRadius: '12px' }}
                  formatter={(val: number) => [`${val.toFixed(1)}%`, 'Cumulative Prob']}
                />
                <Line type="monotone" dataKey="probLessOrEqualPct" stroke={colors.success} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
