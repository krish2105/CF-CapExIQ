'use client';

import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  calculateOneWaySensitivity,
  calculateTwoWaySensitivity,
  generateTornadoChartData,
} from '@/lib/finance/sensitivity';
import { formatAED, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import {
  TrendingUp,
  BarChart2,
  Grid,
  ShieldAlert,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export default function SensitivityPage() {
  const activeAssumptions = useFinancialStore(useShallow((s) => s.getActiveAssumptions()));
  const metrics = useFinancialStore((s) => s.getActiveScenarioResult().metrics);
  const colors = useThemeChartColors();

  const [activeTab, setActiveTab] = useState<'tornado' | 'heatmap' | 'oneway'>('tornado');

  /**
   * ~8ms of matrix work across the three calls, previously re-run on every
   * render — including a tab switch between views that share the same inputs,
   * and any unrelated store write. Keyed on the assumptions object, which is
   * the only thing they read.
   */
  const oneWayResults = useMemo(
    () => calculateOneWaySensitivity(activeAssumptions),
    [activeAssumptions]
  );
  const { rateVsBenefitMatrix, capexVsBenefitMatrix } = useMemo(
    () => calculateTwoWaySensitivity(activeAssumptions),
    [activeAssumptions]
  );
  const formattedTornado = useMemo(
    () =>
      generateTornadoChartData(activeAssumptions).map((item) => ({
        name: item.variableName,
        lowNpv: item.npvLow / 1000000,
        highNpv: item.npvHigh / 1000000,
        baseNpv: item.baseNpv / 1000000,
        spread: item.spread / 1000000,
      })),
    [activeAssumptions]
  );

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Sensitivity Analysis & Break-Even Tolerances
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Tornado Chart Ranking, 2-Way NPV Heatmaps & Risk Break-Even Thresholds
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-muted p-1 rounded-card border border-border text-xs">
          <button
            onClick={() => setActiveTab('tornado')}
            className={`px-3 py-1 rounded-card font-semibold transition-all ${
              activeTab === 'tornado'
                ? 'bg-card text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tornado Chart
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1 rounded-card font-semibold transition-all ${
              activeTab === 'heatmap'
                ? 'bg-card text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            2-Way Heatmaps
          </button>
          <button
            onClick={() => setActiveTab('oneway')}
            className={`px-3 py-1 rounded-card font-semibold transition-all ${
              activeTab === 'oneway'
                ? 'bg-card text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1-Way Variables
          </button>
        </div>
      </div>

      {/* Break-Even Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Break-Even Annual Benefit</span>
          <p className="text-lg font-bold text-primary mt-1">
            {formatAED(metrics.breakEvenAnnualOperatingBenefit)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Min Operating Benefits/Yr</span>
        </div>
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Max Initial Outlay Limit</span>
          <p className="text-lg font-bold text-success mt-1">
            {formatAED(metrics.breakEvenInitialInvestment)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Max Capex Outlay (NPV=0)</span>
        </div>
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Max Investment Overrun %</span>
          <p className="text-lg font-bold text-warning mt-1">
            {metrics.maxInvestmentCostOverrunPct >= 0 ? '+' : ''}{metrics.maxInvestmentCostOverrunPct.toFixed(1)}%
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Tolerable Overrun Ceiling</span>
        </div>
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Max Benefit Shortfall %</span>
          <p className="text-lg font-bold text-info mt-1">
            {metrics.maxOperatingBenefitShortfallPct > 0 ? '-' : ''}{Math.abs(metrics.maxOperatingBenefitShortfallPct).toFixed(1)}%
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Max Benefit Drop Tolerance</span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'tornado' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" /> Tornado Chart — Value Driver Impact Ranking (AED Millions)
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Baseline NPV: {formatAED(metrics.npv)}</span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedTornado} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke={colors.grid} />
                <XAxis type="number" stroke={colors.axis} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke={colors.axis} tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: "10px", fontSize: '12px', color: colors.tooltipText }}
                  formatter={(val: number) => [`AED ${val.toFixed(2)}M`, 'NPV Impact']}
                />
                <ReferenceLine x={metrics.npv / 1000000} stroke={colors.primary} strokeDasharray="4 4" label={{ value: 'Baseline NPV', fill: colors.primary, fontSize: 10 }} />
                <Bar dataKey="spread" fill={colors.primary} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          {/* Heatmap 1: Discount Rate vs Benefits */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                <Grid className="h-4 w-4 text-primary" /> 2-Way Matrix 1: Discount Rate (WACC) vs. Operating Benefits Multiplier
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">NPV Values (AED Millions)</span>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="ledger-table text-center">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-left border border-border">WACC \ Benefits</th>
                    {rateVsBenefitMatrix.colValues.map((bMult) => (
                      <th key={bMult} className="py-2.5 px-3 font-bold border border-border">
                        {Math.round(bMult * 100)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rateVsBenefitMatrix.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-2.5 px-3 text-left font-bold text-foreground bg-muted border border-border">
                        {(rateVsBenefitMatrix.rowValues[rIdx] * 100).toFixed(1)}%
                      </td>
                      {row.map((cell, cIdx) => {
                        const isPos = cell.npv >= 0;
                        return (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-3 font-bold border border-border transition-colors ${
                              isPos
                                ? 'bg-success/15 text-success font-semibold'
                                : 'bg-destructive/15 text-destructive font-semibold'
                            }`}
                          >
                            {(cell.npv / 1000000).toFixed(2)}M
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Heatmap 2: Capex vs Benefits */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
                <Grid className="h-4 w-4 text-primary" /> 2-Way Matrix 2: Initial Capex Multiplier vs. Operating Benefits Multiplier
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">NPV Values (AED Millions)</span>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="ledger-table text-center">
                <thead>
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-left border border-border">Capex \ Benefits</th>
                    {capexVsBenefitMatrix.colValues.map((bMult) => (
                      <th key={bMult} className="py-2.5 px-3 font-bold border border-border">
                        {Math.round(bMult * 100)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capexVsBenefitMatrix.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-2.5 px-3 text-left font-bold text-foreground bg-muted border border-border">
                        {Math.round(capexVsBenefitMatrix.rowValues[rIdx] * 100)}%
                      </td>
                      {row.map((cell, cIdx) => {
                        const isPos = cell.npv >= 0;
                        return (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-3 font-bold border border-border transition-colors ${
                              isPos
                                ? 'bg-success/15 text-success font-semibold'
                                : 'bg-destructive/15 text-destructive font-semibold'
                            }`}
                          >
                            {(cell.npv / 1000000).toFixed(2)}M
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'oneway' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oneWayResults.map((item) => (
            <div key={item.variableKey} className="glass-panel p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">{item.displayName}</span>
                <span className="text-[10px] text-primary font-mono font-bold">Impact: {formatAED(item.npvImpactRange)}</span>
              </div>
              <div className="space-y-1 pt-1 text-xs font-mono">
                {item.points.map((pt) => (
                  <div key={pt.label} className="flex justify-between text-[11px] py-0.5">
                    <span className="text-muted-foreground">{pt.label}:</span>
                    <span className={pt.npv >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                      {formatAED(pt.npv)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
