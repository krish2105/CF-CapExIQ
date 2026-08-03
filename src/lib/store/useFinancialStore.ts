import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FinancialAssumptions, AssumptionItem, AssumptionAuditEntry, ScenarioType, ScenarioResult, ExecutiveRole } from '../types/finance';
import { DEFAULT_FINANCIAL_ASSUMPTIONS, DEFAULT_ASSUMPTIONS_REGISTER } from '../data/defaultAssumptions';
import { BASE_SCENARIO_DEFINITIONS, evaluateScenario, transformAssumptionsForScenario } from '../finance/scenarios';
import { calculateFinancialMetrics } from '../finance/metrics';
import { calculateCashFlowSchedule } from '../finance/cashflow';
import type { Citation } from '../rag/types';
import {
  queueAssumptionChange,
  type SyncStatus,
  type ServerSnapshot,
} from './modelSync';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  /**
   * Retrieved sources backing an assistant answer.
   *
   * Held on the message rather than in page state so provenance survives a
   * reload — an answer whose citations have been lost is no more checkable
   * than one that never had them.
   */
  citations?: Citation[];
  /** True when the provider was unreachable and the deterministic text ran. */
  isFallback?: boolean;
}

/**
 * Memo for the scenario evaluation.
 *
 * `getActiveScenarioResult()` runs the full cash-flow schedule *and* the
 * metrics engine (NPV/IRR/MIRR — IRR and MIRR are iterative root-finds). It
 * is called at 20 sites across 18 components, every one of them during
 * render, so a single dashboard paint re-ran the whole model a dozen times
 * over for byte-identical output.
 *
 * Zustand state is immutable, so identity of the three inputs is a sound
 * cache key: any real change produces a new object reference. The cache is
 * depth-1 — the only access pattern is "the current scenario", and a larger
 * cache would retain assumption objects long after a profile switch.
 */
interface ScenarioMemo {
  assumptions: FinancialAssumptions;
  scenario: ScenarioType;
  sliders: CustomScenarioSliders;
  assumptionsResult: FinancialAssumptions;
  result: ScenarioResult;
}
let scenarioMemo: ScenarioMemo | null = null;

/** Invalidate on any write that can move the model. */
function clearScenarioMemo() {
  scenarioMemo = null;
}

export interface CustomScenarioSliders {
  investmentMultiplier: number;
  operatingBenefitMultiplier: number;
  operatingCostMultiplier: number;
  discountRate: number;
}

/**
 * Admissible range for each custom-scenario parameter.
 *
 * Owned here rather than by the tuner UI because the sliders are not the only
 * writer: the AI Scenario Studio pipes model-generated multipliers straight
 * into `updateCustomScenarioSliders`, and the model happily returns values
 * such as 1.55x that no range input can represent. Committing those produced a
 * state the tuner could not display — the thumb pinned to max while the
 * read-out claimed 1.55x — so the bound is enforced at the write instead.
 */
export const CUSTOM_SLIDER_BOUNDS = {
  investmentMultiplier: { min: 0.75, max: 1.3, step: 0.05 },
  operatingBenefitMultiplier: { min: 0.5, max: 1.3, step: 0.05 },
  operatingCostMultiplier: { min: 0.75, max: 1.3, step: 0.05 },
  discountRate: { min: 0.08, max: 0.18, step: 0.005 },
} as const;

export const DEFAULT_CUSTOM_SLIDERS: CustomScenarioSliders = {
  investmentMultiplier: 1.0,
  operatingBenefitMultiplier: 1.0,
  operatingCostMultiplier: 1.0,
  discountRate: 0.115,
};

const SLIDER_KEYS = Object.keys(CUSTOM_SLIDER_BOUNDS) as Array<keyof CustomScenarioSliders>;

/** Clamp to range, dropping any non-finite value back to its default. */
export function clampCustomSliders(sliders: CustomScenarioSliders): CustomScenarioSliders {
  const out = { ...sliders };
  for (const key of SLIDER_KEYS) {
    const { min, max } = CUSTOM_SLIDER_BOUNDS[key];
    const value = out[key];
    out[key] = Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : DEFAULT_CUSTOM_SLIDERS[key];
  }
  return out;
}

export interface ProjectProfile {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  assumptions: FinancialAssumptions;
}

export const DEFAULT_PROJECT_PROFILES: ProjectProfile[] = [
  {
    id: 'proj-dubai-mfc',
    name: 'Dubai Automated MFC (Base Case)',
    description: 'AED 24.0M Automated Micro-Fulfilment Centre in urban Dubai.',
    updatedAt: new Date().toISOString(),
    assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
  },
  {
    id: 'proj-abu-dhabi-darkstore',
    name: 'Abu Dhabi Darkstore Expansion 2026',
    description: 'AED 15.0M Darkstore network expansion for Abu Dhabi retail.',
    updatedAt: new Date().toISOString(),
    assumptions: {
      ...DEFAULT_FINANCIAL_ASSUMPTIONS,
      automationEquipment: 12000000,
      year1OperatingSavings: 4500000,
    },
  },
];

interface FinancialStoreState {
  assumptions: FinancialAssumptions;
  assumptionsRegister: AssumptionItem[];
  selectedScenario: ScenarioType;
  customScenarioSliders: CustomScenarioSliders;
  chatMessages: ChatMessage[];
  auditLog: AssumptionAuditEntry[];
  projectProfiles: ProjectProfile[];
  activeProfileId: string;

  // Computed / Action helpers
  updateAssumptions: (newAssumptions: Partial<FinancialAssumptions>, actor?: string) => void;
  resetAssumptions: () => void;
  setScenario: (scenario: ScenarioType) => void;
  /** Discard all persisted user state. Called on sign-out. */
  clearSession: () => void;
  updateCustomScenarioSliders: (sliders: Partial<CustomScenarioSliders>) => void;
  addChatMessage: (
    role: 'user' | 'assistant',
    text: string,
    extra?: { citations?: Citation[]; isFallback?: boolean }
  ) => void;
  clearChat: () => void;
  saveProjectProfile: (name: string, description?: string) => void;
  loadProjectProfile: (id: string) => void;
  duplicateProjectProfile: (id: string) => void;

  /**
   * Server synchronisation.
   *
   * The shape above is unchanged so the 24 pages reading `assumptions` and
   * `getActiveScenarioResult()` keep working untouched. These fields describe
   * where that data now comes from.
   */
  syncStatus: SyncStatus;
  /** Replace local state with the server's, on mount or after a conflict. */
  applyServerSnapshot: (snapshot: ServerSnapshot) => void;
  setSyncStatus: (status: SyncStatus) => void;

  // Helper getters
  getActiveAssumptions: () => FinancialAssumptions;
  getActiveScenarioResult: () => ScenarioResult;
}

export const useFinancialStore = create<FinancialStoreState>()(
  persist(
    (set, get) => ({
      assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
      assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
      selectedScenario: 'Base',
      customScenarioSliders: DEFAULT_CUSTOM_SLIDERS,
      chatMessages: [],
      auditLog: [],
      projectProfiles: DEFAULT_PROJECT_PROFILES,
      activeProfileId: 'proj-dubai-mfc',
      // 'loading' until the first snapshot arrives, so the UI can distinguish
      // "the shared model has not loaded yet" from "these are the defaults".
      syncStatus: { state: 'loading' } as SyncStatus,

      applyServerSnapshot: (snapshot) => {
        clearScenarioMemo();
        set((state) => {
          const profiles = snapshot.profiles.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            updatedAt: p.updatedAt,
            assumptions: p.assumptions as unknown as FinancialAssumptions,
          }));

          const activeId = snapshot.workspace.activeProfileId ?? profiles[0]?.id ?? state.activeProfileId;
          const active = snapshot.profiles.find((p) => p.id === activeId);

          return {
            projectProfiles: profiles.length ? profiles : state.projectProfiles,
            activeProfileId: activeId,
            // Merged over the defaults rather than replacing them: a profile
            // saved before the model grew a field would otherwise leave that
            // field undefined, and the finance engine would produce NaN.
            assumptions: active
              ? { ...DEFAULT_FINANCIAL_ASSUMPTIONS, ...(active.assumptions as object) }
              : state.assumptions,
            selectedScenario: (snapshot.workspace.selectedScenario as ScenarioType) ?? state.selectedScenario,
            syncStatus: {
              state: 'idle',
              version: active?.version,
              lastSyncedAt: new Date().toISOString(),
            } as SyncStatus,
          };
        });
      },

      setSyncStatus: (status) => set({ syncStatus: status }),

      updateAssumptions: (newAssumptions, actor) => {
        clearScenarioMemo();

        // Optimistic: applied locally below, queued for the server here.
        // Debounced and batched by ModelSync, so a slider drag produces one
        // PATCH rather than one per frame. A no-op when no provider is
        // mounted, which is what keeps the store's unit tests unchanged.
        queueAssumptionChange(newAssumptions);

        set((state) => {
          const newAuditEntries: AssumptionAuditEntry[] = Object.entries(newAssumptions).map(
            ([key, newVal]) => ({
              id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              timestamp: new Date().toISOString(),
              fieldKey: key,
              fieldName: key,
              previousValue: (state.assumptions as any)[key] ?? '',
              newValue: typeof newVal === 'object' ? JSON.stringify(newVal) : newVal ?? '',
              scenario: state.selectedScenario,
              // Supplied by the caller from the verified session, because the
              // store no longer holds a role to attribute this to.
              //
              // Worth stating plainly: this is a client-side change log, not
              // an audit trail. It lives in localStorage, the actor label is
              // whatever the calling component passed, and both are erased on
              // sign-out. A real audit record has to be written server-side
              // against the session — see the database work still outstanding.
              userLabel: actor ?? 'Unattributed',
            })
          );

          return {
            assumptions: { ...state.assumptions, ...newAssumptions },
            auditLog: [...newAuditEntries, ...state.auditLog],
          };
        });
      },

      resetAssumptions: () => {
        clearScenarioMemo();
        set({
          assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
          assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
          selectedScenario: 'Base',
          customScenarioSliders: DEFAULT_CUSTOM_SLIDERS,
          auditLog: [],
        });
      },

      setScenario: (scenario) => {
        clearScenarioMemo();
        set({ selectedScenario: scenario });
      },

      /**
       * Wipe everything this browser retained about the signed-in user.
       *
       * Signing out cleared the session cookie and nothing else. The store is
       * persisted to localStorage, so the previous user's chat transcript,
       * assumption audit trail and edited capital model stayed on disk and
       * were rehydrated for whoever signed in next — on a shared demo machine
       * that is cross-user disclosure, and the audit log is exactly the record
       * that must not be attributable to the wrong person.
       *
       * Everything resets, including the working model. Losing an unsaved
       * scenario on sign-out is a smaller harm than handing it to the next
       * person at the keyboard, and profiles exist for work worth keeping.
       */
      clearSession: () => {
        clearScenarioMemo();
        set({
          assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
          assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
          selectedScenario: 'Base',
          customScenarioSliders: DEFAULT_CUSTOM_SLIDERS,
          chatMessages: [],
          auditLog: [],
        });
        // Remove the persisted copy outright rather than relying on the
        // rehydrated defaults being written back: if the tab closes before
        // the next write, the old payload would still be on disk.
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem('capexiq-financial-store');
          } catch {
            /* private mode or a disabled store — nothing recoverable to do */
          }
        }
      },

      updateCustomScenarioSliders: (sliders) => {
        clearScenarioMemo();
        set((state) => ({
          customScenarioSliders: clampCustomSliders({
            ...state.customScenarioSliders,
            ...sliders,
          }),
        }));
      },

      addChatMessage: (role, text, extra) => {
        const newMessage: ChatMessage = {
          id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          role,
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ...(extra?.citations?.length ? { citations: extra.citations } : {}),
          ...(extra?.isFallback ? { isFallback: true } : {}),
        };
        set((state) => ({ chatMessages: [...state.chatMessages, newMessage] }));
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      saveProjectProfile: (name, description = '') => {
        set((state) => {
          const newProfile: ProjectProfile = {
            id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name,
            description,
            updatedAt: new Date().toISOString(),
            assumptions: { ...state.assumptions },
          };
          return {
            projectProfiles: [newProfile, ...state.projectProfiles],
            activeProfileId: newProfile.id,
          };
        });
      },

      loadProjectProfile: (id) => {
        clearScenarioMemo();
        set((state) => {
          const found = state.projectProfiles.find((p) => p.id === id);
          if (!found) return state;
          return {
            activeProfileId: id,
            assumptions: { ...found.assumptions },
          };
        });
      },

      duplicateProjectProfile: (id) => {
        clearScenarioMemo();
        set((state) => {
          const target = state.projectProfiles.find((p) => p.id === id);
          if (!target) return state;
          const copy: ProjectProfile = {
            id: 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: target.name + ' (Copy)',
            description: target.description,
            updatedAt: new Date().toISOString(),
            assumptions: { ...target.assumptions },
          };
          return {
            projectProfiles: [copy, ...state.projectProfiles],
            activeProfileId: copy.id,
            assumptions: { ...copy.assumptions },
          };
        });
      },

      getActiveAssumptions: () => {
        const { assumptions, selectedScenario, customScenarioSliders } = get();

        if (
          scenarioMemo &&
          scenarioMemo.assumptions === assumptions &&
          scenarioMemo.scenario === selectedScenario &&
          scenarioMemo.sliders === customScenarioSliders
        ) {
          return scenarioMemo.assumptionsResult;
        }

        if (selectedScenario === 'Base') return assumptions;
        if (selectedScenario === 'Custom') {
          return transformAssumptionsForScenario(assumptions, {
            type: 'Custom',
            name: 'Custom Scenario',
            description: 'User-tuned scenario parameters',
            ...customScenarioSliders,
          });
        }
        return transformAssumptionsForScenario(assumptions, BASE_SCENARIO_DEFINITIONS[selectedScenario]);
      },

      getActiveScenarioResult: () => {
        const { assumptions, selectedScenario, customScenarioSliders } = get();

        if (
          scenarioMemo &&
          scenarioMemo.assumptions === assumptions &&
          scenarioMemo.scenario === selectedScenario &&
          scenarioMemo.sliders === customScenarioSliders
        ) {
          return scenarioMemo.result;
        }

        const activeAssumptions = get().getActiveAssumptions();

        const def =
          selectedScenario === 'Custom'
            ? {
                type: 'Custom' as ScenarioType,
                name: 'Custom Scenario',
                description: 'User-tuned scenario parameters',
                ...customScenarioSliders,
              }
            : BASE_SCENARIO_DEFINITIONS[selectedScenario];

        const yearlyCashFlows = calculateCashFlowSchedule(activeAssumptions);
        const metrics = calculateFinancialMetrics(activeAssumptions, yearlyCashFlows);

        const result: ScenarioResult = {
          definition: def,
          metrics,
          yearlyCashFlows,
        };

        scenarioMemo = {
          assumptions,
          scenario: selectedScenario,
          sliders: customScenarioSliders,
          assumptionsResult: activeAssumptions,
          result,
        };

        return result;
      },
    }),
    {
      name: 'capexiq-financial-store',
      storage: createJSONStorage(() => localStorage),
      /**
       * Only what the server does not own.
       *
       * `assumptions`, `selectedScenario` and the profiles used to be
       * persisted here, which made localStorage the authority — on load it
       * rehydrated over whatever the shared model said, so a stale tab
       * silently reintroduced its own numbers and then wrote them back. The
       * server is the authority now, and this cache must not be able to
       * out-rank it.
       *
       * What remains is genuinely local: the chat transcript and the custom
       * slider positions are this person's working context, not the committee's
       * model. `auditLog` is retained only for the legacy in-page view — the
       * durable trail is `audit_events`, queried through /api/audit.
       */
      partialize: (state) => ({
        customScenarioSliders: state.customScenarioSliders,
        chatMessages: state.chatMessages,
        auditLog: state.auditLog,
      }),
    }
  )
);
