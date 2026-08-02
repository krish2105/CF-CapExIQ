'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { BoardDebateResponse, BoardMemberStatement } from '@/app/api/ai/board-debate/route';
import { Users, ShieldCheck, Play, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

const INITIAL_DEBATE_DATA: BoardDebateResponse = {
  consensusDecision: 'APPROVE WITH GATES',
  consensusSummary: 'The Board conditionally approves the AED 24M capital expenditure for NovaRetail GCC automated micro-fulfilment centre. CFO and COO vote to approve; Risk Officer requests stage-gate latency milestones.',
  voteCount: { approve: 2, conditional: 1, defer: 1, reject: 0 },
  stageGates: [
    'Enforce Swisslog SLA penalty cap (1.5%/wk) in final EPC contract.',
    'Stage-gate AED 10M capital release subject to Phase-1 WCS API latency < 50ms.',
    'Secure 5-year fixed debt margin from Emirates NBD at 5.25%.',
  ],
  disclaimer: 'AI-generated executive debate simulation based on corporate hurdle rates and risk profiles.',
  statements: [
    {
      role: 'CFO',
      name: 'Tariq Al-Mansoori',
      avatar: '👔',
      title: 'Capital Return & Liquidity Assessment',
      verdict: 'APPROVE',
      statement: 'Project NPV of AED 12.08M and 26.3% IRR exceed our 11.5% hurdle rate. Payback period of 3.1 years is acceptable given cash flow stability.',
      keyConcernOrDriver: 'Strong financial returns and rapid payback period.',
    },
    {
      role: 'COO',
      name: 'Elena Rostova',
      avatar: '⚙️',
      title: 'Operational Capacity & Throughput SLA',
      verdict: 'APPROVE',
      statement: 'Automated warehouse operations cut fulfilment lag from 24h to 2h, expanding e-commerce capacity by 3.5x across Dubai & Abu Dhabi hubs.',
      keyConcernOrDriver: 'Critical operational bottleneck resolution.',
    },
    {
      role: 'CRO',
      name: 'Marcus Vance',
      avatar: '🛡️',
      title: 'Downside Exposure & Mitigation Triggers',
      verdict: 'CONDITIONAL',
      statement: 'Pessimistic scenario shows negative NPV (-AED 4.9M) if CapEx overruns by 15% and DEWA rates spike. We must enforce stage-gate capital releases.',
      keyConcernOrDriver: 'Downside operational stress in pessimistic scenario.',
    },
    {
      role: 'Strategy',
      name: 'Dr. Aisha Al-Hassan',
      avatar: '🎯',
      title: 'Regional Market Share & Competitive Positioning',
      verdict: 'DEFER',
      statement: 'Recommend deferring AED 10M Phase-2 expansion until Phase-1 darkstore order volume stabilizes above 15,000 orders/day.',
      keyConcernOrDriver: 'Phased rollout aligned with actual demand scaling.',
    },
  ],
};

export default function BoardDebatePanel() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [loading, setLoading] = useState(false);
  const [debateData, setDebateData] = useState<BoardDebateResponse>(INITIAL_DEBATE_DATA);

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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-success/10 text-success border border-success/20"><CheckCircle className="h-3 w-3" /> APPROVE</span>;
      case 'CONDITIONAL':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-warning/10 text-warning border border-warning/20"><AlertTriangle className="h-3 w-3" /> CONDITIONAL</span>;
      case 'DEFER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-primary/10 text-primary border border-primary/20"><Clock className="h-3 w-3" /> DEFER</span>;
      case 'REJECT':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20"><XCircle className="h-3 w-3" /> REJECT</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Banner */}
      <div className="bg-card border border-border rounded-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-card bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
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
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 rounded-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Board Decision Consensus</span>
                <h3 className="text-2xl font-semibold text-primary mt-1">{debateData.consensusDecision}</h3>
              </div>
              <div className="flex items-center gap-2 bg-background/80 px-4 py-2 rounded-card border border-border text-xs">
                <span className="text-success font-bold">{debateData.voteCount.approve} Approve</span> • 
                <span className="text-warning font-bold">{debateData.voteCount.conditional} Conditional</span> • 
                <span className="text-destructive font-bold">{debateData.voteCount.reject} Reject</span>
              </div>
            </div>
            <p className="text-sm text-foreground/90 mt-4 leading-relaxed">{debateData.consensusSummary}</p>

            {/* Stage Gates */}
            {debateData.stageGates && debateData.stageGates.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/60">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-success" /> Mandated Capital Release Stage-Gates
                </h4>
                <ul className="space-y-2">
                  {debateData.stageGates.map((gate, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 bg-background/50 p-2.5 rounded-card border border-border/40">
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
                className="bg-card border border-border rounded-card p-5 hover:border-primary/40 transition-colors flex flex-col justify-between"
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
                    &quot;{stmt.statement}&quot;
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
