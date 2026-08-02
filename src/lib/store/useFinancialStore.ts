import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PersistOptions } from 'zustand/middleware';
import { FinancialAssumptions, AssumptionItem, AssumptionAuditEntry, ScenarioType, ScenarioResult, ExecutiveRole } from '../types/finance';
import { DEFAULT_FINANCIAL_ASSUMPTIONS, DEFAULT_ASSUMPTIONS_REGISTER } from '../data/defaultAssumptions';
import { BASE_SCENARIO_DEFINITIONS, evaluateScenario, transformAssumptionsForScenario } from '../finance/scenarios';
import { calculateFinancialMetrics } from '../finance/metrics';
import { calculateCashFlowSchedule } from '../finance/cashflow';
import type { Citation } from '../rag/types';

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
  /**
   * Investment archetype this project was modelled as.
   *
   * OPTIONAL BY DESIGN: profiles saved before the archetype system existed do not carry one.
   * Every read site resolves it with `?? DEFAULT_ARCHETYPE` ('automation'), which is the archetype
   * the original NovaRetail micro-fulfilment case maps to, so legacy projects behave exactly as
   * they always did.
   */
  archetype?: ProjectArchetype;
  /** Archetype drivers captured at save time; absent for legacy profiles. */
  archetypeDrivers?: ArchetypeDrivers;
  /** Shared finance-policy inputs captured at save time; absent for legacy profiles. */
  commonInputs?: CommonInputs;
}

/** Archetype state seeded from a config, used by the initial state and by the picker. */
function seedArchetypeState(archetype: ProjectArchetype): {
  archetype: ProjectArchetype;
  archetypeDrivers: ArchetypeDrivers;
  commonInputs: CommonInputs;
  assumptions: FinancialAssumptions;
} {
  const config = ARCHETYPE_CONFIGS[archetype];
  const drivers: ArchetypeDrivers = { ...config.defaultDrivers };
  const common: CommonInputs = { ...config.defaultCommon };
  return {
    archetype,
    archetypeDrivers: drivers,
    commonInputs: common,
    assumptions: buildAnnualFCF<ProjectArchetype>(drivers, archetype, common),
  };
}

export const DEFAULT_PROJECT_PROFILES: ProjectProfile[] = [
  {
    id: 'proj-dubai-mfc',
    name: 'Dubai Automated MFC (Base Case)',
    description: 'AED 24.0M Automated Micro-Fulfilment Centre in urban Dubai.',
    updatedAt: new Date().toISOString(),
    assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
    archetype: 'automation',
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
    archetype: 'automation',
  },
];

interface FinancialStoreState {
  assumptions: FinancialAssumptions;
  /** Investment archetype currently being appraised. */
  archetype: ProjectArchetype;
  /** Archetype-specific business drivers behind `assumptions`. */
  archetypeDrivers: ArchetypeDrivers;
  /** Shared finance-policy inputs (horizon, hurdle, MIRR rates, tax). */
  commonInputs: CommonInputs;
  assumptionsRegister: AssumptionItem[];
  selectedScenario: ScenarioType;
  selectedRole: ExecutiveRole;
  customScenarioSliders: CustomScenarioSliders;
  chatMessages: ChatMessage[];
  auditLog: AssumptionAuditEntry[];
  projectProfiles: ProjectProfile[];
  activeProfileId: string;

  // Computed / Action helpers
  updateAssumptions: (newAssumptions: Partial<FinancialAssumptions>) => void;
  resetAssumptions: () => void;
  setScenario: (scenario: ScenarioType) => void;
  setRole: (role: ExecutiveRole) => void;
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

  /** Select an archetype and seed its (fully editable) default drivers and assumptions. */
  setArchetype: (archetype: ProjectArchetype) => void;
  /** Edit archetype drivers; fields foreign to the active archetype are ignored. */
  updateArchetypeDrivers: (patch: ArchetypeDriverPatch) => void;
  /** Edit the shared finance-policy inputs. */
  updateCommonInputs: (patch: Partial<CommonInputs>) => void;

  // Helper getters
  getActiveAssumptions: () => FinancialAssumptions;
  getActiveScenarioResult: () => ScenarioResult;
}

/* ------------------------------------------------------------------------------------------- */
/* Persistence: versioning and migration                                                        */
/* ------------------------------------------------------------------------------------------- */

/**
 * The slice of store state that is written to localStorage.
 *
 * Declared explicitly (rather than inferred from `partialize`) so that `migrate` has a precise
 * return type and cannot silently drop a field.
 */
export interface PersistedFinancialState {
  assumptions: FinancialAssumptions;
  archetype: ProjectArchetype;
  archetypeDrivers: ArchetypeDrivers;
  commonInputs: CommonInputs;
  selectedScenario: ScenarioType;
  selectedRole: ExecutiveRole;
  customScenarioSliders: CustomScenarioSliders;
  chatMessages: ChatMessage[];
  auditLog: AssumptionAuditEntry[];
}

/**
 * Current persisted-schema version.
 *
 *   v0 (unversioned) - no archetype concept; the store held only the micro-fulfilment assumptions.
 *   v1               - adds `archetype`, `archetypeDrivers` and `commonInputs`.
 *
 * Before this existed the store had no `version` at all, so zustand treated every stored blob as
 * version 0 and merged it straight into the current state. Any field added to the store was
 * therefore silently absent for returning users until they cleared their browser storage.
 */
export const FINANCIAL_STORE_VERSION = 1;

const DEFAULT_CUSTOM_SCENARIO_SLIDERS: CustomScenarioSliders = {
  investmentMultiplier: 1.0,
  operatingBenefitMultiplier: 1.0,
  operatingCostMultiplier: 1.0,
  discountRate: 0.115,
};

function isKnownArchetype(value: unknown): value is ProjectArchetype {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ARCHETYPE_CONFIGS, value);
}

/**
 * Brings a persisted blob of any earlier version up to the current schema.
 *
 * BACKWARD-COMPATIBILITY CONTRACT
 * -------------------------------
 * A v0 blob is a project that pre-dates the archetype system. It is migrated to `'automation'`
 * (the archetype the NovaRetail micro-fulfilment case maps to) and given that archetype's default
 * drivers - but its stored `assumptions` are carried over UNTOUCHED and are never rebuilt from
 * those drivers. That is the whole point: a returning user's saved model must produce exactly the
 * numbers it produced before this feature existed, even if they had edited the assumptions away
 * from the defaults.
 */
export function migrateFinancialStore(
  persistedState: unknown,
  version: number,
): PersistedFinancialState {
  const legacy = (persistedState ?? {}) as Partial<PersistedFinancialState>;
  const archetype = isKnownArchetype(legacy.archetype) ? legacy.archetype : DEFAULT_ARCHETYPE;
  const config = ARCHETYPE_CONFIGS[archetype];

  const migrated: PersistedFinancialState = {
    // Never recomputed from drivers - see the contract note above.
    assumptions: legacy.assumptions ?? DEFAULT_FINANCIAL_ASSUMPTIONS,
    archetype,
    archetypeDrivers:
      legacy.archetypeDrivers && legacy.archetypeDrivers.kind === archetype
        ? legacy.archetypeDrivers
        : { ...config.defaultDrivers },
    commonInputs: legacy.commonInputs ?? { ...config.defaultCommon },
    selectedScenario: legacy.selectedScenario ?? 'Base',
    selectedRole: legacy.selectedRole ?? 'CFO',
    customScenarioSliders: legacy.customScenarioSliders ?? { ...DEFAULT_CUSTOM_SCENARIO_SLIDERS },
    chatMessages: legacy.chatMessages ?? [],
    auditLog: legacy.auditLog ?? [],
  };

  if (version > FINANCIAL_STORE_VERSION) {
    // Storage written by a newer build of the app. Keep the fields this build understands rather
    // than throwing the user's work away.
    return migrated;
  }

  return migrated;
}

const financialStorePersistOptions: PersistOptions<FinancialStoreState, PersistedFinancialState> = {
  name: 'capexiq-financial-store',
  storage: createJSONStorage(() => localStorage),
  version: FINANCIAL_STORE_VERSION,
  migrate: migrateFinancialStore,
  partialize: (state) => ({
    assumptions: state.assumptions,
    archetype: state.archetype,
    archetypeDrivers: state.archetypeDrivers,
    commonInputs: state.commonInputs,
    selectedScenario: state.selectedScenario,
    selectedRole: state.selectedRole,
    customScenarioSliders: state.customScenarioSliders,
    chatMessages: state.chatMessages,
    auditLog: state.auditLog,
  }),
};

export const useFinancialStore = create<FinancialStoreState>()(
  persist(
    (set, get) => ({
      assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
      // Fresh installs open on the audited NovaRetail micro-fulfilment case. Its drivers rebuild
      // `DEFAULT_FINANCIAL_ASSUMPTIONS` exactly (asserted in tests/archetypes.test.ts), so seeding
      // the literal here rather than the rebuilt object changes nothing and keeps the published
      // baseline the single source of truth.
      archetype: DEFAULT_ARCHETYPE,
      archetypeDrivers: { ...ARCHETYPE_CONFIGS[DEFAULT_ARCHETYPE].defaultDrivers },
      commonInputs: { ...ARCHETYPE_CONFIGS[DEFAULT_ARCHETYPE].defaultCommon },
      assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
      selectedScenario: 'Base',
      selectedRole: 'CFO',
      customScenarioSliders: DEFAULT_CUSTOM_SLIDERS,
      chatMessages: [],
      auditLog: [],
      projectProfiles: DEFAULT_PROJECT_PROFILES,
      activeProfileId: 'proj-dubai-mfc',

      updateAssumptions: (newAssumptions) => {
        clearScenarioMemo();
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
              userLabel: state.selectedRole,
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
          archetype: DEFAULT_ARCHETYPE,
          archetypeDrivers: { ...ARCHETYPE_CONFIGS[DEFAULT_ARCHETYPE].defaultDrivers },
          commonInputs: { ...ARCHETYPE_CONFIGS[DEFAULT_ARCHETYPE].defaultCommon },
          assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
          selectedScenario: 'Base',
          selectedRole: 'CFO',
          customScenarioSliders: DEFAULT_CUSTOM_SLIDERS,
          auditLog: [],
        });
      },

      setScenario: (scenario) => {
        clearScenarioMemo();
        set({ selectedScenario: scenario });
      },

      setRole: (role) => {
        set({ selectedRole: role });
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
            archetype: state.archetype,
            archetypeDrivers: { ...state.archetypeDrivers },
            commonInputs: { ...state.commonInputs },
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
          // Legacy profiles carry no archetype metadata; they are automation projects by
          // definition, and their persisted `assumptions` are used verbatim so the numbers are
          // untouched by the archetype layer.
          const archetype = found.archetype ?? DEFAULT_ARCHETYPE;
          return {
            activeProfileId: id,
            assumptions: { ...found.assumptions },
            archetype,
            archetypeDrivers: found.archetypeDrivers
              ? { ...found.archetypeDrivers }
              : { ...ARCHETYPE_CONFIGS[archetype].defaultDrivers },
            commonInputs: found.commonInputs
              ? { ...found.commonInputs }
              : { ...ARCHETYPE_CONFIGS[archetype].defaultCommon },
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
            archetype: target.archetype ?? DEFAULT_ARCHETYPE,
            archetypeDrivers: target.archetypeDrivers ? { ...target.archetypeDrivers } : undefined,
            commonInputs: target.commonInputs ? { ...target.commonInputs } : undefined,
          };
          const archetype = copy.archetype ?? DEFAULT_ARCHETYPE;
          return {
            projectProfiles: [copy, ...state.projectProfiles],
            activeProfileId: copy.id,
            assumptions: { ...copy.assumptions },
            archetype,
            archetypeDrivers: copy.archetypeDrivers
              ? { ...copy.archetypeDrivers }
              : { ...ARCHETYPE_CONFIGS[archetype].defaultDrivers },
            commonInputs: copy.commonInputs
              ? { ...copy.commonInputs }
              : { ...ARCHETYPE_CONFIGS[archetype].defaultCommon },
          };
        });
      },

      setArchetype: (archetype) => {
        // Selecting an archetype seeds its defaults. They are ordinary editable state - nothing is
        // locked - and the derived `assumptions` are rebuilt so every downstream module (dashboard,
        // scenarios, sensitivity, Monte Carlo, reports) immediately reflects the new template.
        set(seedArchetypeState(archetype));
      },

      updateArchetypeDrivers: (patch) => {
        set((state) => {
          const merged: ArchetypeDrivers = { ...state.archetypeDrivers };
          const writable = merged as unknown as Record<string, number | number[]>;
          Object.entries(patch).forEach(([field, value]) => {
            if (value === undefined) return;
            // Silently ignore fields belonging to a different archetype's driver shape; this can
            // only happen if a stale form submits after the archetype was switched.
            if (!Object.prototype.hasOwnProperty.call(merged, field)) return;
            writable[field] = value;
          });

          return {
            archetypeDrivers: merged,
            assumptions: buildAnnualFCF<ProjectArchetype>(merged, merged.kind, state.commonInputs),
          };
        });
      },

      updateCommonInputs: (patch) => {
        set((state) => {
          const common: CommonInputs = { ...state.commonInputs, ...patch };
          return {
            commonInputs: common,
            assumptions: buildAnnualFCF<ProjectArchetype>(
              state.archetypeDrivers,
              state.archetypeDrivers.kind,
              common,
            ),
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
    financialStorePersistOptions,
  )
);
