'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { useRole } from '@/components/auth/RoleProvider';
import { ScenarioType } from '@/lib/types/finance';
import { getDecisionBadgeColor } from '@/lib/utils/formatting';
import { ThemeToggle } from '@/components/theme-toggle';
import { ModelHealthPanel } from '@/components/finance/ModelHealthPanel';
import { LiveMacroTicker } from '@/components/layout/LiveMacroTicker';
import {
  PERMISSIONS,
  roleLabel,
  roleSummary,
  permissionCount,
  canAny,
  type Permission,
} from '@/lib/auth/permissions';
import {
  Sliders,
  RotateCcw,
  ShieldCheck,
  Activity,
  Monitor,
  X,
  Users,
  FileText,
  Wand2,
  ShieldAlert,
  Box,
  Leaf,
  ChevronDown,
  Copy,
  Grid3x3,
} from 'lucide-react';

/**
 * Header — rebuilt.
 *
 * The previous header carried eight colour-filled CTAs (Board Debate, Board
 * Memo, Scenario Studio, Threat Radar, 3D Twin, ESG, Presentation, Health)
 * side by side, each in a different hue. That is the single worst usability
 * defect in the app: with everything emphasised, nothing is. It also violated
 * the reference's scarcity rule for the filled action button.
 *
 * Rebuilt as a strict hierarchy:
 *   1 filled white pill   → Presentation (the one board-facing action)
 *   1 overflow menu       → the six AI/analysis modules
 *   ghost/pill controls   → scenario, role, profile, health, reset, theme
 *   1 status badge        → the current decision (read-only, not a control)
 */

const MODULES: Array<{
  href: string;
  label: string;
  icon: typeof Users;
  desc: string;
  permissions: Permission[];
}> = [
  { href: '/board-debate', label: 'Board Debate Swarm', icon: Users, desc: 'Multi-agent CFO / COO / CRO debate', permissions: ['board.materials'] },
  { href: '/board-memo', label: 'Board Memorandum', icon: FileText, desc: 'SHA-256 audited investment memo', permissions: ['board.materials'] },
  { href: '/ai-scenario-studio', label: 'Scenario Studio', icon: Wand2, desc: 'Generative macro scenarios', permissions: ['scenario.author'] },
  { href: '/ai-threat-radar', label: 'Threat Radar', icon: ShieldAlert, desc: '6-axis risk analysis', permissions: ['risk.view'] },
  { href: '/3d-digital-twin', label: '3D Digital Twin', icon: Box, desc: 'Facility layout simulation', permissions: ['operations.view'] },
  { href: '/esg-sustainability', label: 'ESG & Green Loan', icon: Leaf, desc: 'Carbon offsets & tariff discount', permissions: ['esg.view'] },
];

const SCENARIOS: ScenarioType[] = ['Base', 'Optimistic', 'Pessimistic', 'Custom'];

export const Header: React.FC = () => {
  const {
    selectedScenario,
    setScenario,
    resetAssumptions,
    getActiveScenarioResult,
    projectProfiles,
    activeProfileId,
    loadProjectProfile,
    duplicateProjectProfile,
    clearSession,
  } = useFinancialStore();
  const selectedRole = useRole();

  const decision = getActiveScenarioResult().metrics.decisionStatus;

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const modulesRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (modulesRef.current && !modulesRef.current.contains(e.target as Node)) setModulesOpen(false);
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) setContextOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModulesOpen(false);
        setContextOpen(false);
        setShowHealthModal(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const activeProfile = projectProfiles.find((p) => p.id === activeProfileId);

  // The overflow menu is authorisation-aware for the same reason the sidebar
  // is: offering a route the lens will refuse to render is a dead end.
  const visibleModules = React.useMemo(
    () => MODULES.filter((m) => canAny(selectedRole, m.permissions)),
    [selectedRole]
  );

  return (
    <div className="sticky top-0 z-50 w-full">
      <LiveMacroTicker />

      <header className="w-full border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 lg:px-6 h-14">
          {/* ---- Brand ---- */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <span className="icon-well h-8 w-8 relative overflow-hidden">
              <span className="font-display text-[15px] leading-none text-primary">C</span>
              <span
                className="absolute inset-x-0 bottom-0 h-px bg-gilded opacity-70"
                aria-hidden="true"
              />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[19px] text-foreground tracking-display">
                CapExIQ
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 tracking-[0.06em]">
                NovaRetail GCC · Micro-Fulfilment Centre
              </span>
            </span>
          </Link>

          {/* ---- Scenario switch (the highest-frequency control) ---- */}
          <div className="hidden lg:flex items-center gap-1 rounded-pill border border-border bg-muted/50 p-1">
            <span className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Scenario
            </span>
            {SCENARIOS.map((sc) => (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                aria-pressed={selectedScenario === sc}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  selectedScenario === sc
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* ---- Right cluster ---- */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Decision status — read-only signal, paired with an icon so
                colour is never the sole encoding. */}
            <span
              suppressHydrationWarning
              className={`hidden xl:inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[11px] ${getDecisionBadgeColor(
                decision
              )}`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {decision}
            </span>

            {/* Context popover: profile + role + reset */}
            <div className="relative" ref={contextRef}>
              <button
                onClick={() => setContextOpen((v) => !v)}
                aria-expanded={contextOpen}
                aria-controls="hdr-context-panel"
                aria-haspopup="true"
                className="pill h-8"
                title="Project profile and executive role"
              >
                <Sliders className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="hidden md:inline max-w-[110px] truncate">
                  {activeProfile?.name ?? 'Context'}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                    contextOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {contextOpen && (
                <div
                  id="hdr-context-panel"
                  className="absolute right-0 mt-2 w-72 rounded-card border border-border-strong bg-popover p-4 space-y-4 animate-slide-down z-50"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor="hdr-profile"
                      className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      Project Profile
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        id="hdr-profile"
                        value={activeProfileId}
                        onChange={(e) => loadProjectProfile(e.target.value)}
                        className="flex-1 min-w-0 rounded-pill border border-border-strong bg-popover px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {projectProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => duplicateProjectProfile(activeProfileId)}
                        title="Duplicate current profile"
                        aria-label="Duplicate current profile"
                        className="icon-well h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Signed-in identity, not a selector.
                      This was a free dropdown over every role, which meant the
                      permission matrix decided nothing — anyone could read the
                      funding structure by choosing "CFO". Authority now comes
                      from the signed session cookie and is enforced in
                      middleware, so the header reports it rather than sets it. */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Signed in as
                    </span>
                    <div className="rounded-card border border-border-strong bg-popover px-3 py-2">
                      <p className="text-xs font-semibold text-foreground">{roleLabel(selectedRole)}</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                        {roleSummary(selectedRole)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono pt-1">
                        {permissionCount(selectedRole)} of {PERMISSIONS.length} permissions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        // Clear local state even if the network call fails —
                        // a user who clicks "Sign out" on a shared machine has
                        // to end up signed out locally regardless, and leaving
                        // the transcript behind because a fetch timed out is
                        // the failure mode that matters here.
                        try {
                          await fetch('/api/auth/logout', { method: 'POST' });
                        } finally {
                          clearSession();
                          window.location.href = '/login';
                        }
                      }}
                      className="w-full rounded-pill border border-border-strong px-3 py-1.5 text-xs text-foreground hover:border-foreground hover:bg-muted transition-colors"
                    >
                      Sign out
                    </button>
                  </div>

                  {/* Scenario switch, surfaced here for narrow viewports */}
                  <div className="space-y-1.5 lg:hidden">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Scenario
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {SCENARIOS.map((sc) => (
                        <button
                          key={sc}
                          onClick={() => setScenario(sc)}
                          className={`rounded-pill border px-2 py-1.5 text-xs transition-colors ${
                            selectedScenario === sc
                              ? 'border-primary bg-accent text-primary font-medium'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {sc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <button
                      onClick={() => {
                        setShowHealthModal(true);
                        setContextOpen(false);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                    >
                      <Activity className="h-3.5 w-3.5" /> Diagnostics
                    </button>
                    <button
                      onClick={resetAssumptions}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-pill border border-border-strong px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modules overflow — replaces six coloured CTAs */}
            <div className="relative" ref={modulesRef}>
              <button
                onClick={() => setModulesOpen((v) => !v)}
                aria-expanded={modulesOpen}
                aria-controls="hdr-modules-panel"
                aria-haspopup="true"
                className="pill h-8"
                title="AI and analysis modules"
              >
                <Grid3x3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Modules</span>
                <ChevronDown
                  className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                    modulesOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {modulesOpen && (
                <div
                  id="hdr-modules-panel"
                  className="absolute right-0 mt-2 w-[300px] rounded-card border border-border-strong bg-popover p-2 animate-slide-down z-50"
                >
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    AI &amp; Advanced Intelligence
                  </p>
                  {visibleModules.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-muted-foreground leading-relaxed">
                      No advanced modules are available under the current
                      Executive Lens.
                    </p>
                  ) : (
                    visibleModules.map((m) => {
                      const Icon = m.icon;
                      return (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={() => setModulesOpen(false)}
                          className="flex items-start gap-3 rounded-card px-3 py-2.5 hover:bg-muted transition-colors group"
                        >
                          <Icon
                            className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-foreground">
                              {m.label}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {m.desc}
                            </span>
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* The single filled action. Per the reference: one per viewport. */}
            <Link href="/presentation" className="btn-primary h-8 !py-0 text-[13px]">
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Present</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Diagnostics modal */}
      {showHealthModal && (
        <div
          className="fixed inset-0 z-[60] bg-obsidian/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Model diagnostic health checks"
          onClick={() => setShowHealthModal(false)}
        >
          <div
            className="glass-panel panel-gilded w-full max-w-xl p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-[22px] text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Model Diagnostics
              </h3>
              <button
                onClick={() => setShowHealthModal(false)}
                aria-label="Close diagnostics"
                className="icon-well h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ModelHealthPanel />
          </div>
        </div>
      )}
    </div>
  );
};
