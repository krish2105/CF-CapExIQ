'use client';

import React, { useState } from 'react';
import { calculateOperationalCapacity } from '@/lib/finance/capacity';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatNumber } from '@/lib/utils/formatting';
import { Cpu, Activity, Users, Info } from 'lucide-react';

/**
 * Labour-bridge parameters, passed explicitly into the capacity engine so that every step of the
 * derivation shown on this page is the step the engine actually ran (rather than a restatement of
 * an engine default that could silently drift out of sync).
 */
const LABOUR_PARAMS = {
  productiveHoursPerFtePerYear: 1800,
  pickerUtilization: 0.75,
  manualIndirectLaborRatio: 0.45,
  automatedIndirectLaborRatio: 0.2,
  loadedAnnualCostPerFteAed: 112000,
};

const ITEMS_PER_ORDER = 3.5;
const MANUAL_PICK_LINES_PER_HOUR = 60;
const AUTOMATED_PICK_LINES_PER_HOUR = 450;

export default function CapacityModelPage() {
  const { getActiveAssumptions } = useFinancialStore();
  const assumptions = getActiveAssumptions();

  const [annualOrders, setAnnualOrders] = useState<number>(1200000);
  const [operatingHours, setOperatingHours] = useState<number>(16);
  const [robotCount, setRobotCount] = useState<number>(12);

  const res = calculateOperationalCapacity({
    annualOrders,
    operatingHoursPerDay: operatingHours,
    operatingDaysPerYear: 365,
    itemsPerOrder: ITEMS_PER_ORDER,
    automatedPickLinesPerHour: AUTOMATED_PICK_LINES_PER_HOUR,
    robotCount,
    manualPickLinesPerHour: MANUAL_PICK_LINES_PER_HOUR,
    downtimeBufferPct: 0.05,
    ...LABOUR_PARAMS,
  });

  // Intermediate quantities of the bridge, recomputed here purely for display. They use the same
  // parameters that were handed to the engine above.
  const effectiveHoursPerFte = LABOUR_PARAMS.productiveHoursPerFtePerYear * LABOUR_PARAMS.pickerUtilization;
  const manualLinesPerFteYear = MANUAL_PICK_LINES_PER_HOUR * effectiveHoursPerFte;
  const automatedLinesPerFteYear = AUTOMATED_PICK_LINES_PER_HOUR * effectiveHoursPerFte;
  const manualDirectFte = manualLinesPerFteYear > 0 ? res.totalAnnualItems / manualLinesPerFteYear : 0;
  const automatedDirectFte = automatedLinesPerFteYear > 0 ? res.totalAnnualItems / automatedLinesPerFteYear : 0;

  const forecastSaving = assumptions.year1OperatingSavings;
  const variance = res.derivedAnnualLaborSavingAed - forecastSaving;
  const variancePct = forecastSaving !== 0 ? (variance / forecastSaving) * 100 : 0;

  const utilizationClass =
    res.capacityUtilizationPct > 100
      ? 'text-destructive'
      : res.capacityUtilizationPct >= 65
      ? 'text-success'
      : 'text-amber-600 dark:text-amber-400';

  const bridgeSteps: { step: string; calculation: string; result: string }[] = [
    {
      step: '1. Annual pick lines',
      calculation: `${formatNumber(annualOrders, 0)} orders × ${ITEMS_PER_ORDER} items/order`,
      result: `${formatNumber(res.totalAnnualItems, 0)} lines/yr`,
    },
    {
      step: '2. Effective picking hours per FTE',
      calculation: `${formatNumber(LABOUR_PARAMS.productiveHoursPerFtePerYear, 0)} paid hrs × ${(
        LABOUR_PARAMS.pickerUtilization * 100
      ).toFixed(0)}% utilisation`,
      result: `${formatNumber(effectiveHoursPerFte, 0)} hrs/FTE/yr`,
    },
    {
      step: '3. Manual direct pickers',
      calculation: `${formatNumber(res.totalAnnualItems, 0)} lines ÷ (${MANUAL_PICK_LINES_PER_HOUR} lines/hr × ${formatNumber(
        effectiveHoursPerFte,
        0
      )} hrs)`,
      result: `${formatNumber(manualDirectFte, 1)} FTE`,
    },
    {
      step: '4. Manual total headcount',
      calculation: `${formatNumber(manualDirectFte, 1)} direct × (1 + ${(
        LABOUR_PARAMS.manualIndirectLaborRatio * 100
      ).toFixed(0)}% indirect support)`,
      result: `${formatNumber(res.manualFteRequired, 1)} FTE`,
    },
    {
      step: '5. Automated direct pickers',
      calculation: `${formatNumber(res.totalAnnualItems, 0)} lines ÷ (${AUTOMATED_PICK_LINES_PER_HOUR} lines/hr × ${formatNumber(
        effectiveHoursPerFte,
        0
      )} hrs)`,
      result: `${formatNumber(automatedDirectFte, 1)} FTE`,
    },
    {
      step: '6. Automated total headcount',
      calculation: `${formatNumber(automatedDirectFte, 1)} direct × (1 + ${(
        LABOUR_PARAMS.automatedIndirectLaborRatio * 100
      ).toFixed(0)}% indirect support)`,
      result: `${formatNumber(res.automatedFteRequired, 1)} FTE`,
    },
    {
      step: '7. FTEs displaced',
      calculation: `${formatNumber(res.manualFteRequired, 1)} manual − ${formatNumber(
        res.automatedFteRequired,
        1
      )} automated`,
      result: `${formatNumber(res.fteDisplaced, 1)} FTE`,
    },
    {
      step: '8. Derived annual labour saving',
      calculation: `${formatNumber(res.fteDisplaced, 1)} FTE × ${formatAED(
        res.loadedAnnualCostPerFteAed
      )} fully loaded cost/FTE`,
      result: formatAED(res.derivedAnnualLaborSavingAed),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" /> COO Operational Capacity & Throughput Calculator
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Automated Picking Robotics Capacity, Utilization %, and Labor FTE Equivalent Savings
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Hourly Order Target</span>
          <p className="text-lg font-bold text-foreground mt-1">{res.hourlyOrderTarget} Orders/hr</p>
          <span className="text-[10px] text-muted-foreground font-mono">Daily: {res.dailyOrderTarget}</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Automated Picking Capacity</span>
          <p className="text-lg font-bold text-primary mt-1">{res.automatedCapacityItemsPerHour} Items/hr</p>
          <span className="text-[10px] text-muted-foreground font-mono">{robotCount} Robots Active</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Capacity Utilization</span>
          <p className={`text-lg font-bold mt-1 ${utilizationClass}`}>{res.capacityUtilizationPct}%</p>
          <span className="text-[10px] text-muted-foreground font-mono">Optimal Range: 65% - 85%</span>
        </div>

        <div className="glass-panel p-4">
          <span className="text-[11px] text-muted-foreground font-medium">Labor Saving (FTE)</span>
          <p className="text-lg font-bold text-info mt-1">{res.laborSavingFteEquivalent} FTEs</p>
          <span className="text-[10px] text-muted-foreground font-mono">AED {res.costPerOrderSavingsAed}/Order</span>
        </div>
      </div>

      {/* Controls Form */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Facility Throughput Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Annual Order Forecast</label>
            <input
              type="number"
              step="50000"
              value={annualOrders}
              onChange={(e) => setAnnualOrders(parseFloat(e.target.value) || 0)}
              className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Operating Hours / Day</label>
            <input
              type="number"
              step="1"
              min="8"
              max="24"
              value={operatingHours}
              onChange={(e) => setOperatingHours(parseFloat(e.target.value) || 0)}
              className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Active Robotics Grid Count</label>
            <input
              type="number"
              step="1"
              min="1"
              max="50"
              value={robotCount}
              onChange={(e) => setRobotCount(parseFloat(e.target.value) || 0)}
              className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>
      </div>

      {/* Labour Savings Bridge */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Labour Savings Bridge — Where the {formatAED(forecastSaving)}{' '}
            Operating Saving Comes From
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            Bottom-up from throughput and staffing
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">Step</th>
                <th className="py-2.5 px-3">Calculation</th>
                <th className="py-2.5 px-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {bridgeSteps.map((row) => (
                <tr key={row.step} className="hover:bg-muted/40">
                  <td className="py-2.5 px-3 font-bold font-sans text-foreground whitespace-nowrap">{row.step}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{row.calculation}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-primary whitespace-nowrap">{row.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cross-check against the management forecast */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-border bg-muted/30">
            <span className="text-[11px] text-muted-foreground font-medium">Derived bottom-up saving</span>
            <p className="text-sm font-bold text-primary mt-0.5 font-mono">
              {formatAED(res.derivedAnnualLaborSavingAed)}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/30">
            <span className="text-[11px] text-muted-foreground font-medium">Management forecast in the model</span>
            <p className="text-sm font-bold text-foreground mt-0.5 font-mono">{formatAED(forecastSaving)}</p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-muted/30">
            <span className="text-[11px] text-muted-foreground font-medium">Variance</span>
            <p
              className={`text-sm font-bold mt-0.5 font-mono ${
                Math.abs(variancePct) <= 5 ? 'text-success' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {variance >= 0 ? '+' : '-'}
              {formatAED(Math.abs(variance))} ({variance >= 0 ? '+' : '-'}
              {Math.abs(variancePct).toFixed(1)}%)
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex gap-2 items-start">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">This bridge corroborates the forecast; it does not replace it.</strong>{' '}
            The financial model continues to run off the {formatAED(forecastSaving)} Year-1 operating-savings
            assumption held in the assumptions register. The bottom-up derivation above is an independent
            cross-check on that figure. Note also that the management forecast covers picking-error elimination and
            space consolidation as well as labour, so a close match should be read as corroboration within
            tolerance, not as an identity.
          </p>
        </div>
      </div>
    </div>
  );
}
