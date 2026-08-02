'use client';

import React, { useMemo, useState } from 'react';
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
  const { getActiveAssumptions, getActiveScenarioResult } = useFinancialStore();
  const activeAssumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const colors = useThemeChartColors();

  const [activeTab, setActiveTab] = useState<'tornado' | 'heatmap' | 'oneway'>('tornado');

  const oneWayResults = useMemo(
    () => calculateOneWaySensitivity(activeAssumptions),
    [activeAssumptions]
  );
  const { rateVsBenefitMatrix, capexVsBenefitMatrix } = useMemo(
    () => calculateTwoWaySensitivity(activeAssumptions),
    [activeAssumptions]
  );

  const baseNpv = metrics.npv;
  const tornadoRows = useMemo(
    () => buildTornadoRows(activeAssumptions, baseNpv),
    [activeAssumptions, baseNpv]
  );

  const topDriver = tornadoRows[0];
  const runnerUp = tornadoRows[1];
  const maxDelta = Math.max(
    ...tornadoRows.map((r) => Math.max(Math.abs(r.lowDelta), Math.abs(r.highDelta))),
    1
  );
  const axisBound = maxDelta * 1.15;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Sensitivity Analysis & Break-Even Tolerances
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Tornado Chart Ranking, 2-Way NPV Heatmaps & Risk Break-Even Thresholds
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveTab('tornado')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'tornado'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tornado Chart
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'heatmap'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            2-Way Heatmaps
          </button>
          <button
            onClick={() => setActiveTab('oneway')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'oneway'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1-Way Variables
          </button>
        </div>
      </div>

      {/* Break-Even Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Break-Even Annual Benefit</span>
          <p className="text-lg font-bold text-primary mt-1">
            {metrics.breakEvenAnnualOperatingBenefit !== null &&
            isFinite(metrics.breakEvenAnnualOperatingBenefit)
              ? formatAED(metrics.breakEvenAnnualOperatingBenefit)
              : 'N/A'}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Min Operating Benefits/Yr</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border">
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
        <div className="glass-panel p-4 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Max Investment Overrun %</span>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatSignedPct(metrics.maxInvestmentCostOverrunPct)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Tolerable Overrun Ceiling</span>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-border">
          <span className="text-[11px] text-muted-foreground font-medium">Max Benefit Shortfall %</span>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatDownsideTolerancePct(metrics.maxOperatingBenefitShortfallPct)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Max Benefit Drop Tolerance</span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'tornado' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Tornado Chart — NPV Deviation from Base Case
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">
                Baseline NPV: {formatAED(baseNpv)} • Every driver flexed ±{(TORNADO_FLEX * 100).toFixed(0)}%
              </span>
            </div>

            <div className="h-96 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tornadoRows}
                  layout="vertical"
                  stackOffset="sign"
                  margin={{ top: 10, right: 30, left: 130, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis
                    type="number"
                    domain={[-axisBound, axisBound]}
                    stroke={colors.axis}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => toMillions(baseNpv + v)}
                    label={{
                      value: 'Resulting NPV (AED Millions)',
                      position: 'insideBottom',
                      offset: -5,
                      fill: colors.axis,
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke={colors.axis}
                    tick={{ fontSize: 11 }}
                    width={130}
                  />
                  <Tooltip content={<TornadoTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                  <ReferenceLine
                    x={0}
                    stroke={colors.primary}
                    strokeWidth={2}
                    label={{
                      value: `Base NPV ${formatAED(baseNpv)}`,
                      fill: colors.primary,
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Bar
                    dataKey="lowDelta"
                    stackId="tornado"
                    name={`Low flex (-${(TORNADO_FLEX * 100).toFixed(0)}%)`}
                    fill={colors.danger}
                  />
                  <Bar
                    dataKey="highDelta"
                    stackId="tornado"
                    name={`High flex (+${(TORNADO_FLEX * 100).toFixed(0)}%)`}
                    fill={colors.success}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: colors.danger }} />
                Driver at -{(TORNADO_FLEX * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: colors.success }} />
                Driver at +{(TORNADO_FLEX * 100).toFixed(0)}%
              </span>
              <span>Bars extend left/right of the base-case NPV centre line; drivers are ranked by total swing.</span>
            </div>
          </div>

          {/* Ranked driver table */}
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Driver Ranking (identical ±{(TORNADO_FLEX * 100).toFixed(0)}% relative flex)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="bg-muted text-foreground border-b border-border">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3 text-right">NPV at -{(TORNADO_FLEX * 100).toFixed(0)}%</th>
                    <th className="py-2 px-3 text-right">NPV at +{(TORNADO_FLEX * 100).toFixed(0)}%</th>
                    <th className="py-2 px-3 text-right">Swing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tornadoRows.map((row, idx) => (
                    <tr key={row.key} className="hover:bg-muted/40">
                      <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-foreground font-sans">{row.name}</td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          row.lowNpv >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {formatAED(row.lowNpv)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          row.highNpv >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {formatAED(row.highNpv)}
                      </td>
                      <td className="py-2 px-3 text-right text-primary font-bold">AED {toMillions(row.swing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated narrative */}
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Sensitivity Narrative — Greatest Impact & Decision Switch Points
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Under an identical ±{(TORNADO_FLEX * 100).toFixed(0)}% flex applied to every driver,{' '}
              <strong className="text-foreground">{topDriver.name}</strong> has the greatest impact on value: it moves
              NPV by <strong className="text-foreground">AED {toMillions(topDriver.swing)}</strong>, from{' '}
              {formatAED(topDriver.lowNpv)} on the downside to {formatAED(topDriver.highNpv)} on the upside, against a
              base-case NPV of {formatAED(baseNpv)}.{' '}
              {runnerUp && (
                <>
                  That is {(topDriver.swing / Math.max(runnerUp.swing, 1)).toFixed(1)}× the swing of the next-ranked
                  driver, <strong className="text-foreground">{runnerUp.name}</strong> (AED {toMillions(runnerUp.swing)}
                  ).{' '}
                </>
              )}
              Management attention and contractual protection should therefore concentrate on {topDriver.name.toLowerCase()}.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The recommendation changes — NPV falls to zero and the project stops creating value — under any one of
              three conditions.{' '}
              <strong className="text-foreground">One:</strong> annual operating benefits fall by more than{' '}
              <strong className="text-foreground">
                {metrics.maxOperatingBenefitShortfallPct !== null
                  ? `${Math.abs(metrics.maxOperatingBenefitShortfallPct).toFixed(2)}%`
                  : 'N/A'}
              </strong>
              {metrics.breakEvenAnnualOperatingBenefit !== null && (
                <> (i.e. below {formatAED(metrics.breakEvenAnnualOperatingBenefit)} per year)</>
              )}
              . <strong className="text-foreground">Two:</strong> the total initial outlay overruns by more than{' '}
              <strong className="text-foreground">
                {metrics.maxInvestmentCostOverrunPct.toFixed(1)}%
              </strong>{' '}
              (a ceiling of {formatAED(metrics.breakEvenInitialInvestment)} against the current{' '}
              {formatAED(metrics.totalInitialOutlay)}). <strong className="text-foreground">Three:</strong> the discount
              rate rises to <strong className="text-foreground">{formatPercent(metrics.irr)}</strong>, the project&apos;s
              IRR, at which point NPV = 0 by definition — {formatPercent(metrics.irr)} sits{' '}
              {metrics.irr !== null
                ? `${((metrics.irr - activeAssumptions.discountRate) * 100).toFixed(2)} points`
                : 'N/A'}{' '}
              above the {formatPercent(activeAssumptions.discountRate)} hurdle rate in force.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          <NpvHeatmap
            title="2-Way Matrix 1: Discount Rate (WACC) vs. Operating Benefits Multiplier"
            cornerLabel="WACC \ Benefits"
            matrix={rateVsBenefitMatrix}
            formatRow={(v) => `${(v * 100).toFixed(1)}%`}
            formatCol={(v) => `${Math.round(v * 100)}%`}
            rowUnitLabel="WACC"
            colUnitLabel="Benefits"
            baseRowValue={activeAssumptions.discountRate}
            baseColValue={1}
          />

          <NpvHeatmap
            title="2-Way Matrix 2: Initial Capex Multiplier vs. Operating Benefits Multiplier"
            cornerLabel="Capex \ Benefits"
            matrix={capexVsBenefitMatrix}
            formatRow={(v) => `${Math.round(v * 100)}%`}
            formatCol={(v) => `${Math.round(v * 100)}%`}
            rowUnitLabel="Capex"
            colUnitLabel="Benefits"
            baseRowValue={1}
            baseColValue={1}
          />
        </div>
      )}

      {activeTab === 'oneway' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oneWayResults.map((item) => (
            <div key={item.variableKey} className="glass-panel p-4 rounded-xl border border-border space-y-2">
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
