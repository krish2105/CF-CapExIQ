'use client';

import React, { useState } from 'react';
import { formatAED } from '@/lib/utils/formatting';
import { Zap, Building2, Info, Check, ShieldCheck } from 'lucide-react';

export default function ElectricityEstimatorPage() {
  const [customerType, setCustomerType] = useState<'Commercial' | 'Industrial'>('Commercial');
  const [monthlyKwh, setMonthlyKwh] = useState<number>(15000);
  const [operatingMonths, setOperatingMonths] = useState<number>(12);
  const [includeFuelSurcharge, setIncludeFuelSurcharge] = useState<boolean>(true);
  const [includeVat, setIncludeVat] = useState<boolean>(true);

  // DEWA Slab Tariff Calculation
  const fuelSurchargeRate = 0.06; // AED 0.06 / kWh (July 2026)
  const vatRate = 0.05; // 5% VAT

  let baseCost = 0;
  if (customerType === 'Commercial') {
    let remaining = monthlyKwh;
    // Slab 1: 0 - 2,000 kWh @ 0.23
    const slab1 = Math.min(remaining, 2000);
    baseCost += slab1 * 0.23;
    remaining -= slab1;

    // Slab 2: 2,001 - 4,000 kWh @ 0.28
    if (remaining > 0) {
      const slab2 = Math.min(remaining, 2000);
      baseCost += slab2 * 0.28;
      remaining -= slab2;
    }

    // Slab 3: 4,001 - 6,000 kWh @ 0.32
    if (remaining > 0) {
      const slab3 = Math.min(remaining, 2000);
      baseCost += slab3 * 0.32;
      remaining -= slab3;
    }

    // Slab 4: 6,001+ kWh @ 0.38
    if (remaining > 0) {
      baseCost += remaining * 0.38;
    }
  } else {
    // Industrial
    let remaining = monthlyKwh;
    // Slab 1: 0 - 10,000 kWh @ 0.23
    const slab1 = Math.min(remaining, 10000);
    baseCost += slab1 * 0.23;
    remaining -= slab1;

    // Slab 2: 10,001+ kWh @ 0.38
    if (remaining > 0) {
      baseCost += remaining * 0.38;
    }
  }

  const fuelSurchargeCost = includeFuelSurcharge ? monthlyKwh * fuelSurchargeRate : 0;
  const subtotalCost = baseCost + fuelSurchargeCost;
  const vatCost = includeVat ? subtotalCost * vatRate : 0;

  const totalMonthlyCost = subtotalCost + vatCost;
  const totalAnnualCost = totalMonthlyCost * operatingMonths;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-warning" /> DEWA Electricity Tariff Cost Estimator
          </h1>
          <p className="text-xs text-muted-foreground">
            Dubai Electricity & Water Authority (DEWA) Official Slab Tariff Calculator • Effective July 2026
          </p>
        </div>

        <span className="px-3 py-1 rounded-card bg-warning/10 border border-warning/30 text-warning text-xs font-semibold font-mono">
          DEWA Tariff Effective: July 2026
        </span>
      </div>

      {/* Input Configuration & Slab Calculation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estimator Input Form */}
        <div className="glass-panel p-5 space-y-4 lg:col-span-1">
          <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
            Facility Consumption Inputs
          </h3>

          {/* Customer Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-card-foreground">Customer Category</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerType('Commercial')}
                className={`px-3 py-2 rounded-card text-xs font-semibold border transition-all ${
                  customerType === 'Commercial'
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-surface text-muted-foreground border-border'
                }`}
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('Industrial')}
                className={`px-3 py-2 rounded-card text-xs font-semibold border transition-all ${
                  customerType === 'Industrial'
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-surface text-muted-foreground border-border'
                }`}
              >
                Industrial
              </button>
            </div>
          </div>

          {/* Monthly Consumption kWh */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-card-foreground flex justify-between">
              <span>Monthly Consumption (kWh)</span>
              <span className="text-primary font-mono font-bold">{monthlyKwh.toLocaleString()} kWh</span>
            </label>
            <input
              type="number"
              step="500"
              value={monthlyKwh}
              onChange={(e) => setMonthlyKwh(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Operating Months */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-card-foreground">Operating Months / Year</label>
            <input
              type="number"
              min="1"
              max="12"
              value={operatingMonths}
              onChange={(e) => setOperatingMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 12)))}
              className="w-full bg-surface border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Options Toggles */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="flex items-center gap-2 text-xs text-card-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeFuelSurcharge}
                onChange={(e) => setIncludeFuelSurcharge(e.target.checked)}
                className="rounded bg-surface border-border text-primary focus:ring-0"
              />
              <span>Include July 2026 Fuel Surcharge (AED 0.06/kWh)</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-card-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
                className="rounded bg-surface border-border text-primary focus:ring-0"
              />
              <span>Include 5% UAE Value Added Tax (VAT)</span>
            </label>
          </div>
        </div>

        {/* Cost Summary Cards & Tariff Table */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground font-medium">Base Tariff Cost</span>
              <p className="text-lg font-bold text-foreground mt-1">{formatAED(baseCost, 2)}</p>
              <span className="text-[10px] text-muted-foreground font-mono">Monthly Base</span>
            </div>
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground font-medium">Fuel Surcharge</span>
              <p className="text-lg font-bold text-warning mt-1">{formatAED(fuelSurchargeCost, 2)}</p>
              <span className="text-[10px] text-muted-foreground font-mono">AED 0.06/kWh</span>
            </div>
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground font-medium">Total Monthly Cost</span>
              <p className="text-lg font-bold text-primary mt-1">{formatAED(totalMonthlyCost, 2)}</p>
              <span className="text-[10px] text-muted-foreground font-mono">Incl. Tax & Surcharges</span>
            </div>
            <div className="glass-panel p-3.5">
              <span className="text-[11px] text-muted-foreground font-medium">Total Annual Cost</span>
              <p className="text-lg font-bold text-success mt-1">{formatAED(totalAnnualCost, 0)}</p>
              <span className="text-[10px] text-muted-foreground font-mono">{operatingMonths} Months/Year</span>
            </div>
          </div>

          {/* Official DEWA Tariff Slabs Table */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
              Official DEWA Slab Tariffs (July 2026 Release)
            </h3>
            <table className="ledger-table">
              <thead>
                <tr className="bg-surface text-card-foreground text-[11px] border-b border-border">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Slab kWh Range</th>
                  <th className="py-2.5 px-3">Base Tariff (AED/kWh)</th>
                  <th className="py-2.5 px-3">Fuel Surcharge</th>
                  <th className="py-2.5 px-3">VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-card-foreground">
                <tr className={customerType === 'Commercial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Commercial</td>
                  <td className="py-2 px-3">0 – 2,000 kWh</td>
                  <td className="py-2 px-3">AED 0.23</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
                <tr className={customerType === 'Commercial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Commercial</td>
                  <td className="py-2 px-3">2,001 – 4,000 kWh</td>
                  <td className="py-2 px-3">AED 0.28</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
                <tr className={customerType === 'Commercial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Commercial</td>
                  <td className="py-2 px-3">4,001 – 6,000 kWh</td>
                  <td className="py-2 px-3">AED 0.32</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
                <tr className={customerType === 'Commercial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Commercial</td>
                  <td className="py-2 px-3">6,001+ kWh</td>
                  <td className="py-2 px-3">AED 0.38</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
                <tr className={customerType === 'Industrial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Industrial</td>
                  <td className="py-2 px-3">0 – 10,000 kWh</td>
                  <td className="py-2 px-3">AED 0.23</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
                <tr className={customerType === 'Industrial' ? 'bg-primary/20 text-primary' : ''}>
                  <td className="py-2 px-3">Industrial</td>
                  <td className="py-2 px-3">10,001+ kWh</td>
                  <td className="py-2 px-3">AED 0.38</td>
                  <td className="py-2 px-3">AED 0.06</td>
                  <td className="py-2 px-3">5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
