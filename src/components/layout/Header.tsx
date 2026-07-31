'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ScenarioType, ExecutiveRole } from '@/lib/types/finance';
import { getDecisionBadgeColor } from '@/lib/utils/formatting';
import { ThemeToggle } from '@/components/theme-toggle';
import { ModelHealthPanel } from '@/components/finance/ModelHealthPanel';
import { Building2, Sliders, RotateCcw, ShieldCheck, UserCheck, AlertTriangle, Activity, Monitor, X, FolderKanban, Users, FileText, Wand2, ShieldAlert, Box, Leaf } from 'lucide-react';
import { LiveMacroTicker } from '@/components/layout/LiveMacroTicker';

export const Header: React.FC = () => {
  const { selectedScenario, setScenario, selectedRole, setRole, resetAssumptions, getActiveScenarioResult, projectProfiles, activeProfileId, loadProjectProfile, duplicateProjectProfile } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const decision = scenarioResult.metrics.decisionStatus;

  const [showHealthModal, setShowHealthModal] = useState(false);

  return (
    <>
      <LiveMacroTicker />
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-md px-4 lg:px-6 py-3 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Company & Project Branding */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-foreground tracking-tight">CapExIQ</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                <AlertTriangle className="h-3 w-3" /> Hypothetical Entity
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">NovaRetail GCC</strong> — Automated Micro-Fulfilment Centre Capital Budgeting
            </p>
          </div>
        </div>

        {/* Header Controls in exact order: Profile | Role | Decision | Scenario | Theme | Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Profile Selector */}
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border text-xs">
            <span className="px-2 py-1 text-muted-foreground font-medium flex items-center gap-1">
              <FolderKanban className="h-3.5 w-3.5 text-primary" /> Profile:
            </span>
            <select
              value={activeProfileId}
              onChange={(e) => loadProjectProfile(e.target.value)}
              className="bg-card text-foreground font-semibold px-2 py-1 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-xs max-w-[160px] truncate"
            >
              {projectProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => duplicateProjectProfile(activeProfileId)}
              title="Duplicate current project profile"
              className="px-1.5 py-1 text-muted-foreground hover:text-foreground text-[10px] font-bold"
            >
              +Copy
            </button>
          </div>
          {/* 1. Executive Role Selector */}
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border text-xs">
            <span className="px-2 py-1 text-muted-foreground font-medium flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-primary" /> Role:
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setRole(e.target.value as ExecutiveRole)}
              className="bg-card text-foreground font-semibold px-2 py-1 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-xs"
            >
              <option value="CEO">CEO (Chief Executive)</option>
              <option value="CFO">CFO (Chief Financial)</option>
              <option value="COO">COO (Chief Operations)</option>
              <option value="CTO">CTO (Chief Technology)</option>
              <option value="Capital Committee">Capital Committee</option>
              <option value="Analyst">Analyst (Detailed)</option>
            </select>
          </div>

          {/* 2. Active Decision Status Badge */}
          <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${getDecisionBadgeColor(decision)}`}>
            <ShieldCheck className="h-4 w-4" />
            <span>Decision: {decision}</span>
          </div>

          {/* 3. Scenario Selector Pill */}
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border text-xs">
            <span className="px-2 py-1 text-muted-foreground font-medium flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5" /> Scenario:
            </span>
            {(['Base', 'Optimistic', 'Pessimistic', 'Custom'] as ScenarioType[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                className={`px-2 py-0.5 rounded-md transition-all font-medium ${
                  selectedScenario === sc
                    ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* 4. Theme Toggle Dropdown */}
          <ThemeToggle />

          {/* 5. Reset Button */}
          <button
            onClick={resetAssumptions}
            title="Reset model assumptions to defaults"
            aria-label="Reset model assumptions to defaults"
            className="p-1.5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Additional Action Pill: Model Health Diagnostics */}
          <button
            onClick={() => setShowHealthModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-success/20 transition-colors"
          >
            <Activity className="h-3.5 w-3.5" /> Health: 100%
          </button>

          {/* Board Debate Mode Button */}
          <Link
            href="/board-debate"
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-500/20 transition-colors"
          >
            <Users className="h-3.5 w-3.5" /> Board Debate
          </Link>

          {/* Board Memo Button */}
          <Link
            href="/board-memo"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" /> Board Memo
          </Link>

          {/* Scenario Studio Button */}
          <Link
            href="/ai-scenario-studio"
            className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-500 dark:text-purple-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-purple-500/20 transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" /> Scenario Studio
          </Link>

          {/* Threat Radar Button */}
          <Link
            href="/ai-threat-radar"
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-500/20 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Threat Radar
          </Link>

          {/* 3D Digital Twin Button */}
          <Link
            href="/3d-digital-twin"
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-cyan-500/20 transition-colors"
          >
            <Box className="h-3.5 w-3.5" /> 3D Twin
          </Link>

          {/* ESG Sustainability Button */}
          <Link
            href="/esg-sustainability"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
          >
            <Leaf className="h-3.5 w-3.5" /> ESG Score
          </Link>

          {/* Board Presentation Mode Button */}
          <Link
            href="/presentation"
            className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
          >
            <Monitor className="h-3.5 w-3.5" /> Presentation
          </Link>
        </div>
      </div>

      {/* Model Health Diagnostic Modal Overlay */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Model Diagnostic Health Checks
              </span>
              <button onClick={() => setShowHealthModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ModelHealthPanel />
          </div>
        </div>
      )}
    </header>
    </>
  );
};
