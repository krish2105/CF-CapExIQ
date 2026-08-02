'use client';

/**
 * AI Studio — one surface exercising every route in `src/app/api/ai/`.
 *
 * Each capability is a card: an optional input, an invoke button, the
 * rendered result, and a provenance badge showing whether the response came
 * from the model or from the deterministic advisory engine. Every response is
 * labelled advisory and subject to human approval.
 */

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import {
  ARCHETYPE_CONTEXTS,
  PROJECT_ARCHETYPE_KEYS,
  type ArchetypeKey,
} from '@/lib/ai/archetypeContext';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleSlash,
  Cpu,
  FileText,
  Gauge,
  Globe2,
  Leaf,
  Loader2,
  Mic,
  Play,
  Radar,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';

type CapabilityId =
  | 'threat-radar'
  | 'board-debate'
  | 'board-memo'
  | 'scenario-studio'
  | 'esg-impact'
  | 'parse-quote'
  | 'live-macro'
  | 'voice-intent';

interface Capability {
  id: CapabilityId;
  title: string;
  purpose: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Label for the free-text input, when the capability takes one. */
  inputLabel?: string;
  inputPlaceholder?: string;
  /** True when the route cannot be invoked without the input. */
  inputRequired?: boolean;
  rows?: number;
}

const CAPABILITIES: Capability[] = [
  {
    id: 'threat-radar',
    title: 'Threat Radar',
    purpose: 'Ranked, archetype-specific risk axes with severity, likelihood and a contractible mitigation for each.',
    icon: Radar,
    inputLabel: 'Focus (optional)',
    inputPlaceholder: 'e.g. weight the radar towards the first 18 months',
    rows: 2,
  },
  {
    id: 'board-debate',
    title: 'Board Debate',
    purpose: 'A simulated capital committee — CFO, COO, Chief Risk Officer and a sceptical NED — then a synthesis.',
    icon: Users,
    inputLabel: 'Committee context (optional)',
    inputPlaceholder: 'e.g. the sponsor has already signed a letter of intent',
    rows: 2,
  },
  {
    id: 'board-memo',
    title: 'Board Memorandum',
    purpose: 'A full memorandum draft in structured sections, ready for the committee pack.',
    icon: FileText,
    inputLabel: 'Sponsor notes (optional)',
    inputPlaceholder: 'e.g. background the sponsor wants reflected in the memo',
    rows: 2,
  },
  {
    id: 'scenario-studio',
    title: 'Scenario Studio',
    purpose: 'Proposes named scenarios beyond Optimistic / Base / Pessimistic as multiplier sets. The engine evaluates them — the AI never states a result.',
    icon: Gauge,
    inputLabel: 'Focus (optional)',
    inputPlaceholder: 'e.g. we are most worried about the operational ramp',
    rows: 2,
  },
  {
    id: 'esg-impact',
    title: 'ESG & Green Financing',
    purpose: 'ESG commentary for physical-asset archetypes. Returns a flagged "not applicable" for AI platform, new product and online service rather than inventing content.',
    icon: Leaf,
    inputLabel: 'Sustainability commitments (optional)',
    inputPlaceholder: 'e.g. group commitment to a certified building specification',
    rows: 2,
  },
  {
    id: 'parse-quote',
    title: 'Vendor Quote Parser',
    purpose: 'Extracts structured capex line items from a pasted quotation with a confidence score. Ambiguous lines are listed as unparsed, never guessed.',
    icon: Receipt,
    inputLabel: 'Paste vendor quotation text',
    inputPlaceholder:
      'Robotic shuttle system (32 units) AED 8,450,000\nWMS/WCS licence and integration AED 1,250,000\nInstallation and commissioning USD 640,000\nSubtotal AED 10,340,000',
    inputRequired: true,
    rows: 6,
  },
  {
    id: 'live-macro',
    title: 'Macro Lens',
    purpose: 'Summarises the macro drivers that matter for this archetype. No live market access — it reasons only over data you supply here.',
    icon: Globe2,
    inputLabel: 'Macro observations, one per line as "name: value"',
    inputPlaceholder: 'Policy rate: 4.50 %\nAED/USD: 3.6725\nConstruction cost index: 118.4\nWage inflation: 5.2 %',
    rows: 5,
  },
  {
    id: 'voice-intent',
    title: 'Voice Intent',
    purpose: 'Maps a spoken command to a structured app intent. Returns "unknown" with a clarification prompt rather than guessing.',
    icon: Mic,
    inputLabel: 'Transcribed command',
    inputPlaceholder: 'e.g. switch to the pessimistic scenario',
    inputRequired: true,
    rows: 2,
  },
];

interface CapabilityState {
  loading: boolean;
  error: string | null;
  /** Raw JSON payload returned by the route. */
  data: Record<string, any> | null;
  source: 'model' | 'deterministic' | null;
  fallbackReason: string | null;
}

const EMPTY_STATE: CapabilityState = {
  loading: false,
  error: null,
  data: null,
  source: null,
  fallbackReason: null,
};

const FALLBACK_REASON_LABEL: Record<string, string> = {
  'no-api-key': 'No API key configured — deterministic advisory engine',
  'model-error': 'Model unavailable or timed out — deterministic advisory engine',
  'invalid-model-output': 'Model output failed validation — deterministic advisory engine',
};

/** Parses the macro textarea into the shape `/api/ai/live-macro` accepts. */
function parseMacroLines(raw: string): Array<{ name: string; value?: string }> {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      const separator = line.indexOf(':');
      if (separator === -1) return { name: line.slice(0, 120) };
      return {
        name: line.slice(0, separator).trim().slice(0, 120),
        value: line.slice(separator + 1).trim().slice(0, 120) || undefined,
      };
    })
    .filter((item) => item.name.length > 0);
}

export default function AiStudioPage() {
  const { getActiveAssumptions, getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const metrics = getActiveScenarioResult().metrics;

  const [archetype, setArchetype] = useState<ArchetypeKey>('automation');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, CapabilityState>>({});

  const stateFor = (id: CapabilityId): CapabilityState => states[id] ?? EMPTY_STATE;

  const setState = (id: CapabilityId, patch: Partial<CapabilityState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_STATE), ...patch } }));

  const buildPayload = (id: CapabilityId): Record<string, unknown> => {
    const text = (inputs[id] ?? '').trim();
    const base = { archetype, metrics, assumptions };

    switch (id) {
      case 'parse-quote':
        return { archetype, quoteText: text };
      case 'voice-intent':
        return { archetype, transcript: text };
      case 'live-macro':
        return { ...base, macroData: parseMacroLines(text) };
      case 'board-memo':
        return { ...base, ...(text ? { sponsorNotes: text } : {}) };
      case 'board-debate':
        return { ...base, ...(text ? { context: text } : {}) };
      case 'esg-impact':
        return { ...base, ...(text ? { sustainabilityNotes: text } : {}) };
      default:
        return { ...base, ...(text ? { focus: text } : {}) };
    }
  };

  const invoke = async (capability: Capability) => {
    const text = (inputs[capability.id] ?? '').trim();
    if (capability.inputRequired && !text) {
      setState(capability.id, { error: `${capability.inputLabel} is required for this capability.` });
      return;
    }

    setState(capability.id, { loading: true, error: null });

    try {
      const response = await fetch(`/api/ai/${capability.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(capability.id)),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setState(capability.id, {
          loading: false,
          data: null,
          source: null,
          fallbackReason: null,
          error:
            typeof payload?.error === 'string'
              ? `HTTP ${response.status}. ${payload.error}`
              : `The advisory service returned HTTP ${response.status}.`,
        });
        return;
      }

      setState(capability.id, {
        loading: false,
        error: null,
        data: payload as Record<string, any>,
        source: payload?.isFallback ? 'deterministic' : 'model',
        fallbackReason: typeof payload?.fallbackReason === 'string' ? payload.fallbackReason : null,
      });
    } catch (err) {
      console.error(`AI Studio request failed for /api/ai/${capability.id}:`, err);
      setState(capability.id, {
        loading: false,
        data: null,
        source: null,
        fallbackReason: null,
        error: 'The advisory service could not be reached. No result is shown for this request.',
      });
    }
  };

  const activeContext = ARCHETYPE_CONTEXTS[archetype];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" /> AI Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Archetype-aware advisory suite • Active scenario:{' '}
            <strong className="text-primary">{selectedScenario}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> AI advisory — human approval required
          </span>
        </div>
      </div>

      {/* Archetype selector + governance note */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 space-y-1.5">
            <label
              htmlFor="archetype-select"
              className="text-[11px] font-bold text-foreground uppercase tracking-wider"
            >
              Project archetype lens
            </label>
            <select
              id="archetype-select"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as ArchetypeKey)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            >
              {PROJECT_ARCHETYPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ARCHETYPE_CONTEXTS[key].label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">{activeContext.summary}</p>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Signature risk axis
              </span>
              <p className="text-xs font-bold text-foreground mt-1">{activeContext.riskAxes[0].label}</p>
              <span className="text-[10px] text-muted-foreground font-mono">
                Prior severity {activeContext.riskAxes[0].severity}/10
              </span>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                ESG module
              </span>
              <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
                {activeContext.esgApplicable ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Applicable
                  </>
                ) : (
                  <>
                    <CircleSlash className="h-3.5 w-3.5 text-muted-foreground" /> Not applicable
                  </>
                )}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono">
                {activeContext.esgApplicable ? 'Owned physical asset' : 'No owned physical asset'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 border-t border-border/50 pt-3">
          <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-px" />
          <span>
            Every route below degrades gracefully. With no <code className="font-mono">OPENAI_API_KEY</code>{' '}
            configured, each returns HTTP 200 with a deterministic advisory response derived from the
            same pre-computed figures — never an error. The AI layer computes no financial number.
          </span>
        </p>
      </div>

      {/* Capability cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {CAPABILITIES.map((capability) => {
          const state = stateFor(capability.id);
          const Icon = capability.icon;

          return (
            <div
              key={capability.id}
              className="glass-panel p-5 rounded-2xl border border-border space-y-3 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {capability.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{capability.purpose}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  /api/ai/{capability.id}
                </span>
              </div>

              {capability.inputLabel && (
                <div className="space-y-1">
                  <label
                    htmlFor={`input-${capability.id}`}
                    className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider"
                  >
                    {capability.inputLabel}
                    {capability.inputRequired ? ' (required)' : ''}
                  </label>
                  <textarea
                    id={`input-${capability.id}`}
                    rows={capability.rows ?? 2}
                    maxLength={2000}
                    value={inputs[capability.id] ?? ''}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [capability.id]: e.target.value }))
                    }
                    placeholder={capability.inputPlaceholder}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium resize-y"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {(inputs[capability.id] ?? '').length} / 2000 characters
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => invoke(capability)}
                  disabled={state.loading}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {state.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {state.loading ? 'Generating…' : 'Invoke'}
                </button>

                {state.source === 'model' && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
                    <Bot className="h-3 w-3" /> Model response
                  </span>
                )}
                {state.source === 'deterministic' && (
                  <span
                    className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono flex items-center gap-1"
                    title={
                      state.fallbackReason
                        ? FALLBACK_REASON_LABEL[state.fallbackReason] ?? state.fallbackReason
                        : undefined
                    }
                  >
                    <ShieldCheck className="h-3 w-3" /> Deterministic fallback
                  </span>
                )}
                {state.source === 'deterministic' && state.fallbackReason && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {FALLBACK_REASON_LABEL[state.fallbackReason] ?? state.fallbackReason}
                  </span>
                )}
              </div>

              {state.error && (
                <div className="text-[11px] rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 font-medium">
                  {state.error}
                </div>
              )}

              {state.data && (
                <div className="flex-1 space-y-3 border-t border-border/50 pt-3">
                  <ResultView id={capability.id} data={state.data} />
                  <p className="text-[10px] text-muted-foreground font-mono border-t border-border/40 pt-2">
                    AI advisory — human approval required. No figure on this card was computed by the
                    AI layer.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Result rendering
 * ------------------------------------------------------------------ */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  );
}

function Bullets({ items }: { items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="list-disc list-outside pl-4 space-y-1">
      {items.map((item, index) => (
        <li key={index} className="text-[11px] text-muted-foreground leading-relaxed">
          {String(item)}
        </li>
      ))}
    </ul>
  );
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'good' }) {
  const classes =
    tone === 'warn'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
      : tone === 'good'
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
        : 'bg-muted text-foreground border-border';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${classes}`}>{children}</span>
  );
}

function ResultView({ id, data }: { id: CapabilityId; data: Record<string, any> }) {
  switch (id) {
    case 'threat-radar':
      return (
        <div className="space-y-3">
          <p className="text-[11px] text-foreground leading-relaxed">{data.headline}</p>
          <Chip tone={data.overallRiskPosture === 'Contained' ? 'good' : 'warn'}>
            Overall posture: {data.overallRiskPosture}
          </Chip>
          <div className="space-y-2">
            {(data.axes ?? []).map((axis: any, index: number) => (
              <div key={axis.id ?? index} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-foreground">
                    {index + 1}. {axis.label}
                  </span>
                  <Chip tone={axis.severity >= 8 ? 'warn' : 'neutral'}>
                    {axis.severity}/10 · {axis.likelihood}
                  </Chip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{axis.rationale}</p>
                <p className="text-[11px] text-foreground leading-relaxed">
                  <Label>Mitigation</Label> {axis.mitigation}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">Attacks: {axis.linkedDriver}</p>
              </div>
            ))}
          </div>
          <Bullets items={data.notes} />
        </div>
      );

    case 'board-debate':
      return (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-foreground leading-relaxed">{data.motion}</p>
          <div className="space-y-2">
            {(data.speakers ?? []).map((speaker: any, index: number) => (
              <div key={index} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-foreground">{speaker.role}</span>
                  <Chip tone={speaker.stance === 'For' ? 'good' : speaker.stance === 'Against' ? 'warn' : 'neutral'}>
                    {speaker.stance}
                  </Chip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{speaker.argument}</p>
                <p className="text-[11px] text-foreground leading-relaxed">
                  <Label>Challenge</Label> {speaker.challenge}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label>Synthesis</Label>
            <p className="text-[11px] text-foreground leading-relaxed">{data.synthesis}</p>
          </div>
          <div className="space-y-1">
            <Label>Unresolved</Label>
            <Bullets items={data.unresolvedQuestions} />
          </div>
          <div className="space-y-1">
            <Label>Recommended next step</Label>
            <p className="text-[11px] text-foreground leading-relaxed">{data.recommendedNextStep}</p>
          </div>
        </div>
      );

    case 'board-memo':
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-foreground">{data.title}</p>
            <p className="text-[10px] text-muted-foreground font-mono">Prepared for: {data.preparedFor}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone={data.confidence === 'High' ? 'good' : 'warn'}>Confidence: {data.confidence}</Chip>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <Label>Decision requested</Label>
            <p className="text-[11px] text-foreground leading-relaxed mt-1">{data.decisionRequested}</p>
          </div>
          <div className="space-y-2">
            {(data.sections ?? []).map((section: any, index: number) => (
              <div key={index} className="space-y-1">
                <p className="text-[11px] font-bold text-foreground">{section.heading}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{section.body}</p>
                <Bullets items={section.bullets} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'scenario-studio':
      return (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{data.note}</p>
          <div className="space-y-2">
            {(data.proposedScenarios ?? []).map((scenario: any, index: number) => (
              <div key={index} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <span className="text-[11px] font-bold text-foreground">{scenario.name}</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{scenario.rationale}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(scenario.multipliers ?? {}).map(([key, value]) => (
                    <Chip key={key} tone={Number(value) === 1 ? 'neutral' : Number(value) < 1 ? 'warn' : 'good'}>
                      {key} ×{String(value)}
                    </Chip>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{scenario.watchIndicator}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'esg-impact':
      return (
        <div className="space-y-3">
          {data.notApplicable ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1">
              <Chip>Not applicable to this archetype</Chip>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{data.explanation}</p>
            </div>
          ) : (
            <p className="text-[11px] text-foreground leading-relaxed">{data.explanation}</p>
          )}
          <div className="space-y-2">
            {(data.dimensions ?? []).map((dimension: any, index: number) => (
              <div key={index} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-foreground">{dimension.metric}</span>
                  <Chip tone={dimension.dataAvailability === 'Auditable' ? 'good' : 'warn'}>
                    {dimension.pillar} · {dimension.dataAvailability}
                  </Chip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{dimension.commentary}</p>
              </div>
            ))}
          </div>
          {Array.isArray(data.greenFinancingOptions) && data.greenFinancingOptions.length > 0 && (
            <div className="space-y-1">
              <Label>Green financing options</Label>
              <Bullets items={data.greenFinancingOptions} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Caveats</Label>
            <Bullets items={data.caveats} />
          </div>
        </div>
      );

    case 'parse-quote':
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone={Number(data.overallConfidence) >= 0.7 ? 'good' : 'warn'}>
              Overall confidence {(Number(data.overallConfidence) * 100).toFixed(0)}%
            </Chip>
            <Chip>{(data.lineItems ?? []).length} extracted</Chip>
            <Chip tone={(data.unparsed ?? []).length > 0 ? 'warn' : 'neutral'}>
              {(data.unparsed ?? []).length} unparsed
            </Chip>
          </div>
          {(data.lineItems ?? []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground font-mono text-[10px] uppercase">
                    <th className="py-1 pr-2">Description</th>
                    <th className="py-1 pr-2">Category</th>
                    <th className="py-1 pr-2 text-right">Amount</th>
                    <th className="py-1 text-right">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.lineItems ?? []).map((item: any, index: number) => (
                    <tr key={index} className="border-t border-border/40">
                      <td className="py-1.5 pr-2 text-foreground">{item.description}</td>
                      <td className="py-1.5 pr-2 text-muted-foreground">{item.category}</td>
                      <td className="py-1.5 pr-2 text-right font-mono text-foreground">
                        {item.currency} {Number(item.amount).toLocaleString('en-US')}
                      </td>
                      <td className="py-1.5 text-right font-mono text-muted-foreground">
                        {(Number(item.confidence) * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(data.unparsed ?? []).length > 0 && (
            <div className="space-y-1">
              <Label>Unparsed — not guessed</Label>
              <div className="space-y-1">
                {(data.unparsed ?? []).map((entry: any, index: number) => (
                  <div key={index} className="rounded-lg border border-border bg-muted/30 p-2">
                    <p className="text-[11px] text-foreground font-mono">{entry.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">{data.currencyNote}</p>
          <Bullets items={data.warnings} />
        </div>
      );

    case 'live-macro':
      return (
        <div className="space-y-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
              {data.dataProvenance}
            </p>
          </div>
          <p className="text-[11px] text-foreground leading-relaxed">{data.summary}</p>
          <div className="space-y-2">
            {(data.drivers ?? []).map((driver: any, index: number) => (
              <div key={index} className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-foreground">{driver.name}</span>
                  <Chip tone={driver.suppliedValue ? 'neutral' : 'warn'}>
                    {driver.suppliedValue ?? 'not supplied'}
                  </Chip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{driver.relevance}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{driver.transmission}</p>
                <Chip tone={driver.directionOnNpv === 'Reduces NPV' ? 'warn' : 'neutral'}>
                  {driver.directionOnNpv}
                </Chip>
              </div>
            ))}
          </div>
          {Array.isArray(data.missingInputs) && data.missingInputs.length > 0 && (
            <div className="space-y-1">
              <Label>Missing inputs — not substituted</Label>
              <Bullets items={data.missingInputs} />
            </div>
          )}
          <Bullets items={data.caveats} />
        </div>
      );

    case 'voice-intent':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip tone={data.intent === 'unknown' ? 'warn' : 'good'}>intent: {data.intent}</Chip>
            <Chip>confidence {(Number(data.confidence) * 100).toFixed(0)}%</Chip>
          </div>
          {Object.keys(data.parameters ?? {}).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.parameters ?? {}).map(([key, value]) => (
                <Chip key={key}>
                  {key}: {String(value)}
                </Chip>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">{data.reasoning}</p>
          {data.clarificationPrompt && (
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <Label>Clarification</Label>
              <p className="text-[11px] text-foreground leading-relaxed mt-1">{data.clarificationPrompt}</p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <pre className="text-[10px] text-muted-foreground overflow-x-auto font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}
