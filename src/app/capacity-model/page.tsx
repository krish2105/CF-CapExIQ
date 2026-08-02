'use client';

import React, { useState } from 'react';
import { calculateOperationalCapacity } from '@/lib/finance/capacity';
import { formatAED } from '@/lib/utils/formatting';
import { Cpu, Zap, Activity, Users, ShieldCheck } from 'lucide-react';

export default function CapacityModelPage() {
  const [annualOrders, setAnnualOrders] = useState<number>(1200000);
  const [operatingHours, setOperatingHours] = useState<number>(16);
  const [robotCount, setRobotCount] = useState<number>(12);

  const res = calculateOperationalCapacity({
    annualOrders,
    operatingHoursPerDay: operatingHours,
    operatingDaysPerYear: 365,
    itemsPerOrder: 3.5,
    automatedPickLinesPerHour: 450,
    robotCount,
    manualPickLinesPerHour: 60,
    downtimeBufferPct: 0.05,
  });

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
          <p className="text-lg font-bold text-success mt-1">{res.capacityUtilizationPct}%</p>
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
    </div>
  );
}
