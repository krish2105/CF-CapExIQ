'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { useHasMounted } from '@/lib/hooks/useHasMounted';
import { NegotiatedRfpTerms } from '../api/ai/rfp-negotiator/route';
import { FallbackNotice } from '@/components/ai/FallbackNotice';
import {
  Handshake,
  Bot,
  ShieldCheck,
  Zap,
  TrendingDown,
  Building2,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

const INITIAL_RFP_DATA: NegotiatedRfpTerms = {
  vendorName: 'Swisslog Logistics Automation',
  initialQuotedCapex: 25500000,
  finalNegotiatedCapex: 22000000,
  savingsAchievedAED: 3500000,
  savingsAchievedPct: 13.72,
  warrantyPeriodYears: 5,
  liquidDamagesPctPerWeek: 1.5,
  wcsApiLatencyGuaranteeMs: 45,
  gameTheoryNashEquilibrium: 'NASH EQUILIBRIUM ACHIEVED (Payoff Ratio: 1.42x Buyer Value Creation vs 1.15x Vendor Target Margin)',
  negotiationRounds: [
    {
      round: 1,
      agentRole: 'AI Buyer Agent',
      proposalText: 'Submitted counter-proposal targeting 15% CapEx reduction (AED 21.67M) based on regional GCC benchmark quotes.',
      offeredCapex: 21675000,
      concessionSummary: 'Targeted competitive multi-vendor bidding leverage.',
    },
    {
      round: 2,
      agentRole: 'Vendor Sales AI',
      proposalText: 'Swisslog offered AED 22.8M CapEx with 3-year standard warranty and 99.5% uptime SLA.',
      offeredCapex: 22800000,
      concessionSummary: 'Reduced primary AMR fleet price by AED 2.7M.',
    },
    {
      round: 3,
      agentRole: 'AI Buyer Agent',
      proposalText: 'Demanded 5-year extended warranty and 1.5%/week liquid damages penalty clause for commissioning delays exceeding 14 days.',
      offeredCapex: 22000000,
      concessionSummary: 'Conditioned final award on stage-gate WCS API performance benchmark.',
    },
    {
      round: 4,
      agentRole: 'Vendor Sales AI',
      proposalText: 'Accepted AED 22.0M binding CapEx with 5-year warranty, 1.5% liquid damages, and < 45ms API latency guarantee.',
      offeredCapex: 22000000,
      concessionSummary: 'Final agreement reached with full stage-gate enforcement.',
    },
  ],
  executiveSummary: 'AI Game Theory negotiation successfully optimized CapEx outlay from AED 25.50M down to AED 22.00M (saving AED 3.50M / 13.72%), while securing a 5-year extended warranty and 1.5%/week liquid damages penalty clause.',
};

export default function RfpNegotiatorPage() {
  const hasMounted = useHasMounted();
  const { updateAssumptions } = useFinancialStore();
  const [rfpData, setRfpData] = useState<NegotiatedRfpTerms>(INITIAL_RFP_DATA);
  const [loading, setLoading] = useState(false);

  // Sliders
  const [vendorName, setVendorName] = useState('Swisslog Logistics Automation');
  const [targetDiscountPct, setTargetDiscountPct] = useState(15);
  const [liquidDamagesPct, setLiquidDamagesPct] = useState(1.5);
  const [appliedStatus, setAppliedStatus] = useState<string | null>(null);

  const runNegotiation = async () => {
    setLoading(true);
    setAppliedStatus(null);
    try {
      const res = await fetch('/api/ai/rfp-negotiator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName, targetDiscountPct, targetLiquidDamagesPct: liquidDamagesPct }),
      });
      const data = await res.json();
      setRfpData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyToFinancialModel = () => {
    if (!rfpData) return;
    const newEquip = Math.round(rfpData.finalNegotiatedCapex * 0.818); // ~18M
    const newInstall = Math.round(rfpData.finalNegotiatedCapex * 0.114); // ~2.5M
    const newSoftware = Math.round(rfpData.finalNegotiatedCapex * 0.054); // ~1.2M
    const newTraining = Math.round(rfpData.finalNegotiatedCapex * 0.014); // ~300k

    updateAssumptions({
      automationEquipment: newEquip,
      installationIntegration: newInstall,
      softwareCybersecurity: newSoftware,
      trainingLaunch: newTraining,
    });

    setAppliedStatus(`Successfully synced negotiated CapEx (${formatAED(rfpData.finalNegotiatedCapex)}) to Master Assumptions Register!`);
  };

  return (
    <div className="space-y-6">
      <FallbackNotice isFallback={rfpData.isFallback} reason={rfpData.fallbackReason} />
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-pill text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Frontier AI Module
            </span>
            <span className="px-2.5 py-0.5 rounded-pill text-xs font-mono font-bold bg-info/10 text-info border border-info/20">
              Game Theory MARL
            </span>
          </div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground mt-1 flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" /> Multi-Agent Vendor RFP Negotiator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Simulates Nash Equilibrium game-theoretic price negotiations against warehouse automation suppliers.
          </p>
        </div>

        <button
          onClick={runNegotiation}
          disabled={loading}
          className="btn-primary justify-center disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Simulating Game Theory Negotiation...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Run AI Game Theory Negotiation
            </>
          )}
        </button>
      </div>

      {/* Controls & Parameters */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" /> Negotiation Parameters & Supplier Target
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Select Target Vendor</label>
            <select
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full mt-1.5 p-2.5 rounded-card bg-background border border-border text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="Swisslog Logistics Automation">Swisslog Logistics Automation</option>
              <option value="Dematic Warehouse Systems">Dematic Warehouse Systems</option>
              <option value="AutoStore System GCC">AutoStore System GCC</option>
              <option value="Knapp ASRS Solutions">Knapp ASRS Solutions</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-muted-foreground">Target CapEx Discount %</label>
              <span className="font-bold text-primary font-mono">{targetDiscountPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={targetDiscountPct}
              onChange={(e) => setTargetDiscountPct(Number(e.target.value))}
              className="w-full mt-3 accent-primary cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-muted-foreground">Liquid Damages Clause (% / Wk)</label>
              <span className="font-bold text-warning font-mono">{liquidDamagesPct}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.5"
              value={liquidDamagesPct}
              onChange={(e) => setLiquidDamagesPct(Number(e.target.value))}
              className="w-full mt-3 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground font-medium">Initial Vendor Quote</p>
          <p suppressHydrationWarning className="text-lg font-bold text-foreground mt-1">
            {formatAED(rfpData.initialQuotedCapex)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Unadjusted EPC Proposal</span>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground font-medium">Final Negotiated CapEx</p>
          <p suppressHydrationWarning className="text-lg font-bold text-success mt-1">
            {formatAED(rfpData.finalNegotiatedCapex)}
          </p>
          <span suppressHydrationWarning className="text-[10px] text-success font-bold font-mono">
            -{rfpData.savingsAchievedPct.toFixed(1)}% Discount Achieved
          </span>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground font-medium">Net Value Savings</p>
          <p suppressHydrationWarning className="text-lg font-bold text-primary mt-1">
            {formatAED(rfpData.savingsAchievedAED)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Capital Cost Reduction</span>
        </div>

        <div className="glass-panel p-4">
          <p className="text-xs text-muted-foreground font-medium">Warranty & Latency SLA</p>
          <p suppressHydrationWarning className="text-lg font-bold text-info mt-1">
            {rfpData.warrantyPeriodYears} Yrs / &lt; {rfpData.wcsApiLatencyGuaranteeMs}ms
          </p>
          <span className="text-[10px] text-info font-mono">Guaranteed Performance</span>
        </div>
      </div>

      {/* Nash Equilibrium Card */}
      <div className="p-4 rounded-card bg-surface border border-success/30 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-success" />
          <h3 className="font-sans text-xs font-semibold text-success uppercase tracking-[0.12em]">
            Game Theory Nash Equilibrium Result
          </h3>
        </div>
        <p suppressHydrationWarning className="text-sm font-semibold text-success">
          {rfpData.gameTheoryNashEquilibrium}
        </p>
        <p suppressHydrationWarning className="text-xs text-card-foreground leading-relaxed">
          {rfpData.executiveSummary}
        </p>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={applyToFinancialModel}
            className="px-4 py-2 rounded-card bg-success hover:opacity-90 text-foreground font-bold text-xs flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="h-4 w-4" /> Apply Agreed Terms to Financial Model
          </button>
          {appliedStatus && (
            <span className="text-xs font-semibold text-success font-mono flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> {appliedStatus}
            </span>
          )}
        </div>
      </div>

      {/* Negotiation Rounds Timeline */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" /> Multi-Round AI Negotiation Transcript
        </h2>

        <div className="space-y-3">
          {rfpData.negotiationRounds.map((rnd) => (
            <div
              key={rnd.round}
              className={`p-4 rounded-card border transition-all ${
                rnd.agentRole === 'AI Buyer Agent'
                  ? 'bg-primary/5 border-primary/30 text-foreground'
                  : 'bg-muted/40 border-border text-foreground'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-background border border-border">
                    Round {rnd.round}
                  </span>
                  <span className="text-xs font-bold text-primary">{rnd.agentRole}</span>
                </div>
                <span className="text-xs font-mono font-bold text-foreground">
                  Offered CapEx: {formatAED(rnd.offeredCapex)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rnd.proposalText}</p>
              <p className="text-[11px] text-primary/80 font-medium mt-1">Concession: {rnd.concessionSummary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
