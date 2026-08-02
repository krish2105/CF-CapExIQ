'use client';

import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  calculateOneWaySensitivity,
  calculateTwoWaySensitivity,
} from '@/lib/finance/sensitivity';
import { calculateFinancialMetrics } from '@/lib/finance/metrics';
import { FinancialAssumptions, TwoWayMatrix } from '@/lib/types/finance';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import { TrendingUp, BarChart2, Grid, Info } from 'lucide-react';
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

/**
 * Tornado normalisation.
 *
 * Every driver is flexed by the SAME relative amount so that the bar lengths are directly
 * comparable and the ranking is meaningful. Previously capex/benefits/opex/salvage moved +/-20%
 * while WACC moved +/-3 percentage points and project life moved 4-8 years, which made the
 * ordering an artefact of the chosen ranges rather than a statement about the model.
 */
const TORNADO_FLEX = 0.2;

interface TornadoDriver {
  key: string;
  name: string;
  apply: (a: FinancialAssumptions, multiplier: number) => FinancialAssumptions;
  describe: (a: FinancialAssumptions, multiplier: number) => string;
}

const TORNADO_DRIVERS: TornadoDriver[] = [
  {
    key: 'benefits',
    name: 'Total operating benefits',
    apply: (a, m) => ({
      ...a,
      year1OperatingSavings: a.year1OperatingSavings * m,
      year1ContributionMargin: a.year1ContributionMargin * m,
    }),
    describe: (a, m) => `${formatAED((a.year1OperatingSavings + a.year1ContributionMargin) * m)}/yr`,
  },
  {
    key: 'capex',
    name: 'Initial capital expenditure',
    apply: (a, m) => ({
      ...a,
      automationEquipment: a.automationEquipment * m,
      installationIntegration: a.installationIntegration * m,
      softwareCybersecurity: a.softwareCybersecurity * m,
      trainingLaunch: a.trainingLaunch * m,
    }),
    describe: (a, m) =>
      formatAED(
        (a.automationEquipment + a.installationIntegration + a.softwareCybersecurity + a.trainingLaunch) * m
      ),
  },
  {
    key: 'opex',
    name: 'Annual operating cost (OpEx)',
    apply: (a, m) => ({ ...a, year1AdditionalOpEx: a.year1AdditionalOpEx * m }),
    describe: (a, m) => `${formatAED(a.year1AdditionalOpEx * m)}/yr`,
  },
  {
    key: 'wacc',
    name: 'Discount rate (WACC)',
    apply: (a, m) => ({
      ...a,
      discountRate: a.discountRate * m,
      financeRateMIRR: a.discountRate * m,
      reinvestmentRateMIRR: a.discountRate * m,
    }),
    describe: (a, m) => formatPercent(a.discountRate * m, 2),
  },
  {
    key: 'growth',
    name: 'Savings growth rate',
    apply: (a, m) => ({ ...a, annualSavingsGrowth: a.annualSavingsGrowth * m }),
    describe: (a, m) => formatPercent(a.annualSavingsGrowth * m, 2),
  },
  {
    key: 'life',
    name: 'Project life',
    apply: (a, m) => ({ ...a, projectLifeYears: a.projectLifeYears * m }),
    // The cash-flow engine rounds the project life to whole years, so report the year count the
    // model actually ran rather than the raw flexed value.
    describe: (a, m) => `${Math.max(1, Math.round(a.projectLifeYears * m))} yrs`,
  },
  {
    key: 'salvage',
    name: 'Terminal salvage value',
    apply: (a, m) => ({ ...a, salvageValue: a.salvageValue * m }),
    describe: (a, m) => formatAED(a.salvageValue * m),
  },
];

interface TornadoRow {
  key: string;
  name: string;
  lowLabel: string;
  highLabel: string;
  lowNpv: number;
  highNpv: number;
  lowDelta: number;
  highDelta: number;
  swing: number;
}

function buildTornadoRows(assumptions: FinancialAssumptions, baseNpv: number): TornadoRow[] {
  const lowMult = 1 - TORNADO_FLEX;
  const highMult = 1 + TORNADO_FLEX;

  return TORNADO_DRIVERS.map((driver) => {
    const lowNpv = calculateFinancialMetrics(driver.apply(assumptions, lowMult)).npv;
    const highNpv = calculateFinancialMetrics(driver.apply(assumptions, highMult)).npv;

    return {
      key: driver.key,
      name: driver.name,
      lowLabel: driver.describe(assumptions, lowMult),
      highLabel: driver.describe(assumptions, highMult),
      lowNpv,
      highNpv,
      lowDelta: lowNpv - baseNpv,
      highDelta: highNpv - baseNpv,
      swing: Math.abs(highNpv - lowNpv),
    };
  }).sort((a, b) => b.swing - a.swing);
}

const toMillions = (v: number) => `${(v / 1000000).toFixed(2)}M`;

const signedMillions = (v: number) =>
  `${v >= 0 ? '+' : '-'}AED ${Math.abs(v / 1000000).toFixed(2)}M`;

/** Signed percentage rendered from the number itself, so the sign is never concatenated twice. */
function formatSignedPct(value: number | null, decimals = 1): string {
  if (value === null || !isFinite(value)) return 'N/A';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * Tolerance expressed as a downward move. A positive `value` means "benefits may fall by this
 * much", so it renders with a leading minus; a negative value means benefits must actually RISE.
 */
function formatDownsideTolerancePct(value: number | null, decimals = 1): string {
  if (value === null || !isFinite(value)) return 'N/A';
  const sign = value >= 0 ? '-' : '+';
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

const TornadoTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as TornadoRow | undefined;
  if (!row) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-[11px] shadow-lg space-y-1">
      <p className="font-bold text-foreground">{row.name}</p>
      <p className="text-destructive font-mono">
        Low ({row.lowLabel}): {formatAED(row.lowNpv)} ({signedMillions(row.lowDelta)} vs base)
      </p>
      <p className="text-success font-mono">
        High ({row.highLabel}): {formatAED(row.highNpv)} ({signedMillions(row.highDelta)} vs base)
      </p>
      <p className="text-muted-foreground font-mono">Total swing: AED {toMillions(row.swing)}</p>
    </div>
  );
};

/* ---------------------------------- Heatmap helpers ---------------------------------- */

function npvCellBackground(npv: number, maxAbs: number): string {
  if (maxAbs <= 0) return 'transparent';
  const intensity = Math.min(1, Math.abs(npv) / maxAbs);
  const alpha = 0.08 + 0.5 * intensity;
  return npv >= 0 ? `rgba(16, 185, 129, ${alpha.toFixed(3)})` : `rgba(244, 63, 94, ${alpha.toFixed(3)})`;
}

const FRONTIER_COLOR = '#f59e0b';

function cellBoxShadow(leftFlip: boolean, topFlip: boolean): string | undefined {
  const parts: string[] = [];
  if (leftFlip) parts.push(`inset 3px 0 0 0 ${FRONTIER_COLOR}`);
  if (topFlip) parts.push(`inset 0 3px 0 0 ${FRONTIER_COLOR}`);
  return parts.length > 0 ? parts.join(', ') : undefined;
}

const approxEqual = (a: number, b: number) => Math.abs(a - b) < 1e-9;

interface HeatmapProps {
  title: string;
  cornerLabel: string;
  matrix: TwoWayMatrix;
  formatRow: (v: number) => string;
  formatCol: (v: number) => string;
  rowUnitLabel: string;
  colUnitLabel: string;
  baseRowValue: number;
  baseColValue: number;
}

const NpvHeatmap: React.FC<HeatmapProps> = ({
  title,
  cornerLabel,
  matrix,
  formatRow,
  formatCol,
  rowUnitLabel,
  colUnitLabel,
  baseRowValue,
  baseColValue,
}) => {
  const allNpvs = matrix.matrix.flat().map((c) => c.npv);
  const maxAbs = Math.max(...allNpvs.map((n) => Math.abs(n)), 1);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Grid className="h-4 w-4 text-primary" /> {title}
        </h3>
        <span className="text-[11px] text-muted-foreground font-mono">NPV Values (AED Millions)</span>
      </div>

      <div className="overflow-x-auto pt-2">
        <table className="w-full text-center text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px]">
              <th className="py-2.5 px-3 font-bold text-left border border-border">{cornerLabel}</th>
              {matrix.colValues.map((colValue) => (
                <th key={colValue} className="py-2.5 px-3 font-bold border border-border">
                  {formatCol(colValue)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matrix.matrix.map((row, rIdx) => {
              const rowValue = matrix.rowValues[rIdx];
              const isBaseRow = approxEqual(rowValue, baseRowValue);

              return (
                <tr key={rIdx}>
                  <td className="py-2.5 px-3 text-left font-bold text-foreground bg-muted border border-border">
                    {formatRow(rowValue)}
                  </td>
                  {row.map((cell, cIdx) => {
                    const colValue = matrix.colValues[cIdx];
                    const isBaseCell = isBaseRow && approxEqual(colValue, baseColValue);

                    const leftFlip = cIdx > 0 && row[cIdx - 1].npv >= 0 !== cell.npv >= 0;
                    const topFlip =
                      rIdx > 0 && matrix.matrix[rIdx - 1][cIdx].npv >= 0 !== cell.npv >= 0;

                    return (
                      <td
                        key={cIdx}
                        title={`${rowUnitLabel} ${formatRow(rowValue)} / ${colUnitLabel} ${formatCol(
                          colValue
                        )}\nNPV: ${formatAED(cell.npv)}\nDecision: ${cell.decisionStatus}${
                          isBaseCell ? '\n(Base case)' : ''
                        }`}
                        style={{
                          backgroundColor: npvCellBackground(cell.npv, maxAbs),
                          boxShadow: cellBoxShadow(leftFlip, topFlip),
                        }}
                        className={`py-2.5 px-3 font-bold transition-colors text-foreground ${
                          isBaseCell ? 'border-2 border-primary' : 'border border-border'
                        }`}
                      >
                        <span className="block">{(cell.npv / 1000000).toFixed(2)}M</span>
                        <span className="block text-[9px] font-sans font-medium text-muted-foreground">
                          {cell.decisionStatus}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-1 text-[10px] text-muted-foreground font-sans">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-24 rounded"
            style={{
              background:
                'linear-gradient(to right, rgba(244,63,94,0.58), rgba(244,63,94,0.08), rgba(16,185,129,0.08), rgba(16,185,129,0.58))',
            }}
          />
          Shading scales with NPV magnitude (red = value destroyed, green = value created)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: FRONTIER_COLOR }} />
          NPV = 0 frontier (sign change between adjacent cells)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2 border-primary" />
          Base case
        </span>
        <span>Hover any cell for its decision status.</span>
      </div>
    </div>
  );
};

/* ------------------------------------- Page ------------------------------------- */

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
            {metrics.breakEvenAnnualOperatingBenefit !== null &&
            isFinite(metrics.breakEvenAnnualOperatingBenefit)
              ? formatAED(metrics.breakEvenAnnualOperatingBenefit)
              : 'N/A'}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Min Operating Benefits/Yr</span>
        </div>
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Max Initial Outlay Limit</span>
          <p
            className={`text-lg font-bold mt-1 ${
              metrics.breakEvenInitialInvestment >= 0 ? 'text-success' : 'text-destructive'
            }`}
          >
            {isFinite(metrics.breakEvenInitialInvestment)
              ? formatAED(metrics.breakEvenInitialInvestment)
              : 'N/A'}
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
                <span className="text-[10px] text-primary font-mono font-bold">
                  Impact: {formatAED(item.npvImpactRange)}
                </span>
              </div>
              <div className="space-y-1 pt-1 text-xs font-mono">
                {item.points.map((pt) => (
                  <div key={pt.label} className="flex justify-between text-[11px] py-0.5" title={`Decision: ${pt.decisionStatus}`}>
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
