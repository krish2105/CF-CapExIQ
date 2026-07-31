'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { BoardDebateResponse, BoardMemberStatement } from '@/app/api/ai/board-debate/route';
import { Users, ShieldCheck, Play, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function BoardDebatePanel() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [loading, setLoading] = useState(false);
  const [debateData, setDebateData] = useState<BoardDebateResponse | null>(null);

  const runBoardDebate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/board-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assumptions,
          metrics,
          selectedScenario,
        }),
      });

      if (!res.ok) throw new Error('Failed to run board debate');
      const data = await res.json();
      setDebateData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: BoardMemberStatement['verdict']) => {
    switch (verdict) {
      case 'APPROVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle className="h-3 w-3" /> APPROVE</span>;
      case 'CONDITIONAL':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20"><AlertTriangle className="h-3 w-3" /> CONDITIONAL</span>;
      case 'DEFER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20"><Clock className="h-3 w-3" /> DEFER</span>;
      case 'REJECT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20"><XCircle className="h-3 w-3" /> REJECT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Banner */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <Users className="h-4 w-4" /> Multi-Agent C-Suite Simulation Engine
          </div>
          <h2 className="text-xl font-bold text-foreground">Autonomous Investment Committee Debate</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Simulate a live capital allocation debate across four executive roles (CFO, COO, Risk Officer, Strategy Director) evaluated against current model metrics.
          </p>
        </div>
        <button
          onClick={runBoardDebate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 shadow-md"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Debating Investment...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Run Board Debate Swarm
            </>
          )}
        </button>
      </div>

      {debateData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Consensus Overview Card */}
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 rounded-xl p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Board Decision Consensus</span>
                <h3 className="text-2xl font-black text-primary mt-1">{debateData.consensusDecision}</h3>
              </div>
              <div className="flex items-center gap-2 bg-background/80 px-4 py-2 rounded-lg border border-border text-xs">
                <span className="text-emerald-500 font-bold">{debateData.voteCount.approve} Approve</span> • 
                <span className="text-amber-500 font-bold">{debateData.voteCount.conditional} Conditional</span> • 
                <span className="text-rose-500 font-bold">{debateData.voteCount.reject} Reject</span>
              </div>
            </div>
            <p className="text-sm text-foreground/90 mt-4 leading-relaxed">{debateData.consensusSummary}</p>

            {/* Stage Gates */}
            {debateData.stageGates && debateData.stageGates.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Mandated Capital Release Stage-Gates
                </h4>
                <ul className="space-y-2">
                  {debateData.stageGates.map((gate, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 bg-background/50 p-2.5 rounded-md border border-border/40">
                      <span className="font-mono text-primary font-bold">{i + 1}.</span> {gate}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Statements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debateData.statements.map((stmt, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{stmt.avatar}</span>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{stmt.name}</h4>
                        <p className="text-xs text-muted-foreground">{stmt.title}</p>
                      </div>
                    </div>
                    {getVerdictBadge(stmt.verdict)}
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed italic mb-3">
                    "{stmt.statement}"
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 mt-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Primary Driver / Concern</span>
                  <p className="text-xs font-medium text-primary mt-0.5">{stmt.keyConcernOrDriver}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center italic mt-2">
            {debateData.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
