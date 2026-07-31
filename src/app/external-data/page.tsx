'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { calculateWacc } from '@/lib/finance/wacc';
import { formatPercent } from '@/lib/utils/formatting';
import { Landmark, ExternalLink, Info, Calculator, ShieldCheck, Check } from 'lucide-react';

export default function ExternalDataPage() {
  const { assumptions, updateAssumptions } = useFinancialStore();
  const [activeTab, setActiveTab] = useState<'tax' | 'eibor' | 'wacc'>('wacc');

  // WACC Form States
  const [riskFreeRate, setRiskFreeRate] = useState<number>(0.042);
  const [beta, setBeta] = useState<number>(1.15);
  const [equityRiskPremium, setEquityRiskPremium] = useState<number>(0.06);
  const [eiborBenchmark, setEiborBenchmark] = useState<number>(0.0485);
  const [creditSpread, setCreditSpread] = useState<number>(0.025);
  const [debtWeight, setDebtWeight] = useState<number>(0.40);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const waccResult = calculateWacc({
    riskFreeRate,
    beta,
    equityRiskPremium,
    eiborBenchmark,
    creditSpread,
    taxRate: assumptions.corporateTaxRate,
    debtWeight,
  });

  const handleApplyWaccToModel = () => {
    updateAssumptions({
      discountRate: parseFloat(waccResult.calculatedWacc.toFixed(4)),
      financeRateMIRR: parseFloat(waccResult.calculatedWacc.toFixed(4)),
      reinvestmentRateMIRR: parseFloat(waccResult.calculatedWacc.toFixed(4)),
    });
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> UAE External Data, Tax & WACC Debt Calculator
          </h1>
          <p className="text-xs text-muted-foreground">
            UAE Ministry of Finance Corporate Tax Bands, CBUAE EIBOR Catalog & Capital Asset Pricing Model (CAPM) WACC Calculator
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveTab('wacc')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'wacc'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            WACC & CAPM
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'tax'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            UAE Corporate Tax
          </button>
          <button
            onClick={() => setActiveTab('eibor')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'eibor'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            CBUAE EIBOR
          </button>
        </div>
      </div>

      {appliedNotice && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
          <Check className="h-4 w-4" /> Calculated WACC ({formatPercent(waccResult.calculatedWacc)}) applied to model hurdle rate!
        </div>
      )}

      {activeTab === 'wacc' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Weighted Average Cost of Capital (WACC) & CAPM Estimator
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cost of Equity (CAPM) */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  1. Cost of Equity ($r_e = R_f + \beta \cdot ERP$)
                </span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Risk-Free Rate ($R_f$)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={riskFreeRate}
                      onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Equity Beta ($\beta$)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={beta}
                      onChange={(e) => setBeta(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Equity Risk Premium ($ERP$)</label>
                    <input
                      type="number"
                      step="0.005"
                      value={equityRiskPremium}
                      onChange={(e) => setEquityRiskPremium(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div className="pt-1 text-xs font-mono font-bold text-primary">
                    Cost of Equity: {formatPercent(waccResult.costOfEquity)}
                  </div>
                </div>
              </div>

              {/* Cost of Debt */}
              <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  2. Cost of Debt ($r_d = EIBOR + Spread$)
                </span>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Reference EIBOR</label>
                    <input
                      type="number"
                      step="0.001"
                      value={eiborBenchmark}
                      onChange={(e) => setEiborBenchmark(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Company Credit Spread</label>
                    <input
                      type="number"
                      step="0.001"
                      value={creditSpread}
                      onChange={(e) => setCreditSpread(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Debt Weight Ratio ($D/V$)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={debtWeight}
                      onChange={(e) => setDebtWeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-card border border-border rounded px-2.5 py-1 text-xs text-foreground mt-0.5"
                    />
                  </div>
                  <div className="pt-1 text-xs font-mono font-bold text-emerald-400">
                    After-Tax Cost of Debt: {formatPercent(waccResult.afterTaxCostOfDebt)}
                  </div>
                </div>
              </div>

              {/* WACC Result Card */}
              <div className="glass-panel p-4 rounded-xl border border-primary/30 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground">Calculated Project WACC</span>
                  <p className="text-2xl font-bold text-primary mt-2">{formatPercent(waccResult.calculatedWacc)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Equity Weight: {(waccResult.equityWeight * 100).toFixed(0)}% | Debt Weight: {(waccResult.debtWeight * 100).toFixed(0)}%
                  </p>
                </div>

                <button
                  onClick={handleApplyWaccToModel}
                  className="w-full mt-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors"
                >
                  Apply WACC to Model Hurdle Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
              Official UAE Corporate Tax Bands (Federal Decree-Law No. 47 of 2022)
            </h3>
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                  <th className="py-2.5 px-3">Taxable Income Threshold (AED)</th>
                  <th className="py-2.5 px-3">Statutory Tax Rate</th>
                  <th className="py-2.5 px-3">Authority Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                <tr>
                  <td className="py-2.5 px-3">AED 0 – AED 375,000</td>
                  <td className="py-2.5 px-3 font-bold text-success">0.0%</td>
                  <td className="py-2.5 px-3 text-primary">UAE Ministry of Finance</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3">Above AED 375,000</td>
                  <td className="py-2.5 px-3 font-bold text-purple-400">9.0%</td>
                  <td className="py-2.5 px-3 text-primary">UAE Ministry of Finance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'eibor' && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            Central Bank of the UAE (CBUAE) Official EIBOR Catalog
          </h3>
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">Coverage Period</th>
                <th className="py-2.5 px-3">Publication Date</th>
                <th className="py-2.5 px-3">Official Download URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              <tr>
                <td className="py-2.5 px-3">2026-01 to 2026-06</td>
                <td className="py-2.5 px-3">2026-07-01</td>
                <td className="py-2.5 px-3 text-primary font-sans flex items-center gap-1">
                  <a href="https://centralbank.ae/media/an0hfukx/eibor_2026.xlsx" target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                    Download 2026 EIBOR <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
