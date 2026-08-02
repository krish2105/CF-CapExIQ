'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED } from '@/lib/utils/formatting';
import { ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, Lock, UserCheck } from 'lucide-react';

export default function ApprovalsPage() {
  const { getActiveScenarioResult, selectedRole } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [isSigned, setIsSigned] = useState(false);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);

  const handleSignDecision = () => {
    setIsSigned(true);
    setSnapshotTimestamp(new Date().toLocaleString());
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Approval Workflow & Immutable Decision Snapshot
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Executive Committee Sign-Off, Conditions of Approval & Audit Snapshot Lock
          </p>
        </div>

        {!isSigned ? (
          <button
            onClick={handleSignDecision}
            className="px-4 py-2 rounded-card bg-accent text-accent-foreground text-xs font-bold flex items-center gap-2 transition-all"
          >
            <FileCheck className="h-4 w-4" /> Sign & Lock Decision Snapshot ({selectedRole})
          </button>
        ) : (
          <div className="px-3.5 py-1.5 rounded-card bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
            <Lock className="h-4 w-4" /> Decision Locked ({snapshotTimestamp})
          </div>
        )}
      </div>

      {/* Decision Pack Summary */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-primary" /> Executive Investment Decision Snapshot Pack
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-card bg-muted/60 border border-border space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company Entity:</span>
              <span className="font-bold text-foreground">NovaRetail GCC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project Evaluation:</span>
              <span className="font-bold text-foreground">Automated Micro-Fulfilment Centre</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Capital Outlay:</span>
              <span className="font-bold text-primary">{formatAED(metrics.totalInitialOutlay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Present Value (NPV):</span>
              <span className="font-bold text-success">{formatAED(metrics.npv)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Internal Rate of Return (IRR):</span>
              <span className="font-bold text-info">{(metrics.irr! * 100).toFixed(2)}%</span>
            </div>
          </div>

          <div className="p-4 rounded-card bg-muted/60 border border-border space-y-2 font-sans">
            <span className="font-bold text-foreground">Conditions of Approval:</span>
            <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-1">
              <li>Phase 1 rollout limited to AED 14.0M until Stage Gate 4 WCS API latency benchmark (&lt; 50ms) is verified.</li>
              <li>Supplier contract must enforce 26-week equipment delivery guarantee with liquidated damages clause.</li>
              <li>Post-Investment Review audit required at Month 12 to verify Year-1 labor savings (AED 5.0M).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
