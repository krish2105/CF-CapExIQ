'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { BoardMemoResponse } from '@/app/api/ai/board-memo/route';
import { FileText, Printer, ShieldCheck, Sparkles, CheckCircle2, Lock, Download, RefreshCw } from 'lucide-react';

export default function BoardMemoPage() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [loading, setLoading] = useState(false);
  const [memoData, setMemoData] = useState<BoardMemoResponse | null>(null);

  const fetchBoardMemo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/board-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assumptions,
          metrics,
          selectedScenario,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate memo');
      const data = await res.json();
      setMemoData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardMemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border print:hidden">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Formal Executive Board Memorandum
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            C-Level Board Investment Proposal with SHA-256 Cryptographic Audit Trail Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBoardMemo}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Regenerate
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md"
          >
            <Printer className="h-4 w-4" /> Print / Export PDF
          </button>
        </div>
      </div>

      {memoData && (
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl p-8 shadow-lg space-y-6 text-foreground print:shadow-none print:border-none print:p-0">
          {/* Header Bar */}
          <div className="border-b-2 border-primary pb-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-1">
                <Sparkles className="h-4 w-4" /> CapExIQ Formal Board Memorandum
              </div>
              <h2 className="text-2xl font-black text-foreground">{memoData.memoTitle}</h2>
              <p className="text-xs text-muted-foreground mt-1">{memoData.targetEntity}</p>
            </div>
            <div className="text-right text-xs font-mono">
              <span className="font-bold text-foreground block">{memoData.documentRef}</span>
              <span className="text-muted-foreground">{memoData.date}</span>
            </div>
          </div>

          {/* Cryptographic Hash Banner */}
          <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-muted-foreground truncate">
              <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">SHA-256 Audit Hash: <strong className="text-foreground">{memoData.auditHash}</strong></span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Model Verified
            </span>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1">
              1. Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">{memoData.executiveSummary}</p>
          </div>

          {/* Financial Justification */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1">
              2. Financial Viability & Capital Justification
            </h3>
            <p className="text-sm leading-relaxed text-foreground/90">{memoData.financialJustification}</p>
          </div>

          {/* Key Value Drivers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1">
              3. Key Strategic & Value Drivers
            </h3>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {memoData.keyDrivers.map((driver, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Principal Risks */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/50 pb-1">
              4. Principal Operational & Market Risks
            </h3>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {memoData.principalRisks.map((risk, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendation */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Final Board Recommendation</span>
            <h4 className="text-xl font-black text-primary">{memoData.recommendedDecision}</h4>
          </div>

          {/* Signature Blocks */}
          <div className="pt-6 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              5. C-Level Governance Sign-Off Blocks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {memoData.signoffBlocks.map((block, idx) => (
                <div key={idx} className="border border-border/80 rounded-lg p-4 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{block.role}</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {block.status}
                    </span>
                  </div>
                  <div className="pt-4 border-b border-dashed border-border text-center pb-2">
                    <span className="font-serif italic text-sm text-primary">{block.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">{block.title}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center italic border-t border-border pt-4">
            {memoData.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
