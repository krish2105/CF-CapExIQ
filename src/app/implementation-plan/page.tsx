'use client';

import React from 'react';
import { DEFAULT_STAGE_GATES } from '@/lib/finance/implementation';
import { formatAED } from '@/lib/utils/formatting';
import { Calendar, CheckCircle2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';

export default function ImplementationPlanPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Implementation Timeline & Stage-Gate Governance
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • 12-Month Project Delivery Gantt Timeline, Milestones & Stage-Gate Controls
          </p>
        </div>
      </div>

      {/* Stage Gate Milestones Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Project Milestones & Stage-Gate Review Controls
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3">Gate #</th>
              <th className="py-2.5 px-3">Milestone Name</th>
              <th className="py-2.5 px-3">Owner</th>
              <th className="py-2.5 px-3 text-center">Planned Schedule</th>
              <th className="py-2.5 px-3 text-right">Budget (AED)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-center">Gate Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {DEFAULT_STAGE_GATES.map((gate) => (
              <tr key={gate.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">Gate {gate.stageNumber}</td>
                <td className="py-2.5 px-3 font-bold text-foreground">{gate.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground font-sans">{gate.ownerRole}</td>
                <td className="py-2.5 px-3 text-center font-bold text-purple-400">{gate.plannedMonths}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatAED(gate.budgetAllocatedAed)}</td>
                <td className="py-2.5 px-3 text-center font-sans font-semibold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    gate.status === 'Completed' ? 'bg-success/20 text-success' : gate.status === 'In Progress' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {gate.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-sans font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    gate.gateDecision === 'Continue' ? 'bg-success/20 text-success' : gate.gateDecision === 'Continue with Conditions' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {gate.gateDecision}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
