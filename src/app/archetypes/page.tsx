'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ARCHETYPE_CONFIG_LIST, computeHeadlineKpi } from '@/lib/archetypes/configs';
import type { AnyArchetypeConfig, KpiFormat, ProjectArchetype } from '@/lib/archetypes/types';
import { formatAED, formatNumber, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import {
  BrainCircuit,
  CheckCircle2,
  CircuitBoard,
  Cog,
  Factory,
  Globe,
  Info,
  LayoutGrid,
  Map as MapIcon,
  Package,
  ShieldAlert,
  Store,
  type LucideIcon,
} from 'lucide-react';

/**
 * Lucide icon NAME (carried as a string in each archetype config, so the config module stays free
 * of React imports) resolved to a component here, at the only place that renders it.
 */
const ICONS: Record<string, LucideIcon> = {
  Store,
  Cog,
  Package,
  BrainCircuit,
  Factory,
  Globe,
  CircuitBoard,
  Map: MapIcon,
};

function formatKpi(value: number | null, format: KpiFormat): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  switch (format) {
    case 'aed':
      return formatAED(value);
    case 'percent':
      return formatPercent(value, 1);
    case 'ratio':
      return `${formatNumber(value, 2)}x`;
    case 'years':
      return `${formatNumber(value, 2)} yrs`;
    case 'months':
      return `${formatNumber(value, 1)} months`;
    case 'count':
      return Math.round(value).toLocaleString('en-US');
    case 'number':
    default:
      return formatNumber(value, 2);
  }
}

export default function ArchetypesPage() {
  const archetype = useFinancialStore((state) => state.archetype);
  const archetypeDrivers = useFinancialStore((state) => state.archetypeDrivers);
  const setArchetype = useFinancialStore((state) => state.setArchetype);
  const getActiveScenarioResult = useFinancialStore((state) => state.getActiveScenarioResult);

  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const kpi = computeHeadlineKpi(archetypeDrivers, metrics, scenarioResult.yearlyCashFlows);

  const activeConfig = ARCHETYPE_CONFIG_LIST.find((c) => c.key === archetype);

  const handleSelect = (key: ProjectArchetype) => {
    setArchetype(key);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-primary" /> Investment Archetype Library
          </h1>
          <p className="text-xs text-muted-foreground">
            Choose the template that matches the capital request. Selecting an archetype seeds a
            defensible set of starting assumptions &mdash; every figure stays fully editable.
          </p>
        </div>
        <div
          className={`px-4 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${getDecisionBadgeColor(
            metrics.decisionStatus,
          )}`}
        >
          <ShieldAlert className="h-4 w-4" /> Current Template Verdict: {metrics.decisionStatus}
        </div>
      </div>

      {/* Active archetype summary */}
      {activeConfig && (
        <div className="glass-panel p-4 rounded-2xl border border-border">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">Active Archetype</span>
              <p className="text-lg font-bold text-foreground mt-1">{activeConfig.label}</p>
              <span className="text-[10px] text-muted-foreground font-mono">{activeConfig.key}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">Initial Outlay</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatAED(metrics.totalInitialOutlay)}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">Time Zero (Y0)</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">Net Present Value</span>
              <p
                className={`text-lg font-bold mt-1 ${
                  metrics.npv >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {formatAED(metrics.npv)}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">
                Hurdle @ {formatPercent(scenarioResult.definition.discountRate)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">IRR</span>
              <p className="text-lg font-bold text-primary mt-1">{formatPercent(metrics.irr)}</p>
              <span className="text-[10px] text-muted-foreground font-mono">
                PI {metrics.profitabilityIndex.toFixed(2)}x
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground font-medium">{kpi.label}</span>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatKpi(kpi.value, kpi.format)}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">Headline KPI</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
            <Info className="h-3.5 w-3.5 inline-block mr-1 text-primary align-text-bottom" />
            {kpi.interpretation}
          </p>
        </div>
      )}

      {/* Archetype cards */}
      <ul
        role="list"
        aria-label="Investment archetypes"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 list-none p-0 m-0"
      >
        {ARCHETYPE_CONFIG_LIST.map((config: AnyArchetypeConfig) => {
          const Icon = ICONS[config.icon] ?? LayoutGrid;
          const isActive = config.key === archetype;

          return (
            <li key={config.key} className="h-full">
              <button
                type="button"
                onClick={() => handleSelect(config.key)}
                aria-pressed={isActive}
                aria-label={`Select the ${config.label} archetype. ${config.shortDescription} Headline KPI: ${config.headlineKpi.label}.`}
                className={`glass-panel h-full w-full text-left p-4 rounded-2xl border transition-all
                  hover:border-primary/50 hover:shadow-md
                  focus:outline-none focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2
                  focus-visible:ring-offset-[var(--background)]
                  ${isActive ? 'border-primary/60 shadow-md ring-1 ring-primary/30' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${config.accentColor}22`,
                      border: `1px solid ${config.accentColor}55`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: config.accentColor }} aria-hidden="true" />
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Selected
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-bold text-foreground mt-3">{config.label}</h2>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {config.shortDescription}
                </p>

                <dl className="mt-3 pt-3 border-t border-border space-y-2">
                  <div>
                    <dt className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Headline KPI
                    </dt>
                    <dd className="text-[11px] text-foreground font-medium">
                      {config.headlineKpi.label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Distinctive Risk
                    </dt>
                    <dd className="text-[11px] text-muted-foreground leading-relaxed">
                      {config.distinctiveRisk}
                    </dd>
                  </div>
                </dl>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Module relevance for the active archetype */}
      {activeConfig && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" aria-hidden="true" /> Module Relevance &mdash;{' '}
            {activeConfig.label}
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                Applicable modules
              </p>
              <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                {activeConfig.relevantModules.map((module) => (
                  <li
                    key={module}
                    className="px-2 py-1 rounded-md bg-primary/10 border border-primary/25 text-[10px] font-mono text-primary"
                  >
                    {module}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                Not applicable
              </p>
              {Object.keys(activeConfig.excludedModules).length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Every module in the platform is meaningful for this archetype.
                </p>
              ) : (
                <ul className="space-y-1.5 list-none p-0 m-0">
                  {Object.entries(activeConfig.excludedModules).map(([module, reason]) => (
                    <li key={module} className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-mono text-[10px] text-foreground">{module}</span>
                      {' — '}
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Archetype defaults are seeded assumptions, not constraints. They are grounded in mid-market
        UAE/GCC figures and are deliberately calibrated across the decision spectrum &mdash; several
        archetypes are marginal or value destroying at their defaults. Edit every driver in the
        Assumptions Register before taking any figure to committee.
      </p>
    </div>
  );
}
