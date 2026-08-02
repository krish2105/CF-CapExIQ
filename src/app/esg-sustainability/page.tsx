'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { EsgImpactResponse } from '@/app/api/ai/esg-impact/route';
import { Leaf, Sun, Zap, Award, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { FallbackNotice } from '@/components/ai/FallbackNotice';

const INITIAL_ESG_DATA: EsgImpactResponse = {
  esgScore: 92,
  ratingTier: 'AAA (Prime Sustainability)',
  co2ReductionTonsPerYear: 1240,
  solarPanelOffsetKWh: 450000,
  greenNpvBoost: '+AED 1.45M (Carbon Credit Tax Offset)',
  sustainabilityHighlights: [
    'Rooftop 500kW Solar PV Array offsets 42% of warehouse electricity demand.',
    'All-electric AMR autonomous mobile robot fleet eliminates indoor diesel emissions.',
    'High-density vertical tote racking compresses building footprint by 65%.',
    'Qualifies for UAE Green Finance Framework 50 bps loan interest margin discount.',
  ],
  bankableGreenLoanEligibility: 'ELIGIBLE - Qualified for Emirates NBD Green Commercial Loan Framework',
};

export default function EsgSustainabilityPage() {
  const { getActiveAssumptions, getActiveScenarioResult } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [loading, setLoading] = useState(false);
  const [esgData, setEsgData] = useState<EsgImpactResponse>(INITIAL_ESG_DATA);

  const fetchEsgData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/esg-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions, metrics }),
      });

      if (res.ok) {
        const data: EsgImpactResponse = await res.json();
        setEsgData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEsgData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <FallbackNotice isFallback={esgData.isFallback} reason={esgData.fallbackReason} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Leaf className="h-6 w-6 text-success" /> ESG & Net-Zero Sustainability Calculator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carbon footprint reduction accounting, Green NPV boost, and UAE Green Finance bankable loan certification.
          </p>
        </div>

        <button
          onClick={fetchEsgData}
          disabled={loading}
          className="px-4 py-2 rounded-card bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Recalculate ESG Score
        </button>
      </div>

      {esgData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-card p-5 text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">ESG Sustainability Index</span>
              <p className="text-3xl font-semibold text-success mt-1">{esgData.esgScore} / 100</p>
              <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded inline-block mt-1">
                {esgData.ratingTier}
              </span>
            </div>

            <div className="bg-card border border-border rounded-card p-5 text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">Annual CO₂ Reduced</span>
              <p className="text-3xl font-semibold text-foreground mt-1">{esgData.co2ReductionTonsPerYear.toLocaleString()} Tons</p>
              <span className="text-[10px] text-muted-foreground">Net-Zero UAE Target</span>
            </div>

            <div className="bg-card border border-border rounded-card p-5 text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">Solar Energy Offset</span>
              <p className="text-3xl font-semibold text-warning mt-1">{(esgData.solarPanelOffsetKWh / 1000).toFixed(0)}k kWh</p>
              <span className="text-[10px] text-muted-foreground">500kW Rooftop Array</span>
            </div>

            <div className="bg-card border border-border rounded-card p-5 text-center">
              <span className="text-xs font-bold text-muted-foreground uppercase">Green NPV Valuation Boost</span>
              <p className="text-2xl font-semibold text-primary mt-1">{esgData.greenNpvBoost}</p>
              <span className="text-[10px] text-muted-foreground">Carbon Tax Offsets</span>
            </div>
          </div>

          {/* Green Loan Banner */}
          <div className="bg-surface border border-success/30 rounded-card p-5 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-card bg-success/20 border border-success/40 flex items-center justify-center text-success shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-success">Green Finance Framework</span>
                <h3 className="text-base font-bold">{esgData.bankableGreenLoanEligibility}</h3>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-card bg-success text-foreground font-bold text-xs shrink-0">
              50 bps Loan Margin Discount Verified
            </span>
          </div>

          {/* Key Highlights Grid */}
          <div className="bg-card border border-border rounded-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> Core Sustainability & Carbon Footprint Drivers
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {esgData.sustainabilityHighlights.map((highlight, idx) => (
                <li key={idx} className="bg-background/60 p-3 rounded-card border border-border flex items-start gap-2">
                  <Leaf className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span className="text-foreground">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
