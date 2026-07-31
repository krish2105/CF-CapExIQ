import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FinancialAssumptions, AssumptionItem, AssumptionAuditEntry, ScenarioType, ScenarioResult, ExecutiveRole } from '../types/finance';
import { DEFAULT_FINANCIAL_ASSUMPTIONS, DEFAULT_ASSUMPTIONS_REGISTER } from '../data/defaultAssumptions';
import { BASE_SCENARIO_DEFINITIONS, evaluateScenario, transformAssumptionsForScenario } from '../finance/scenarios';
import { calculateFinancialMetrics } from '../finance/metrics';
import { calculateCashFlowSchedule } from '../finance/cashflow';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface CustomScenarioSliders {
  investmentMultiplier: number;
  operatingBenefitMultiplier: number;
  operatingCostMultiplier: number;
  discountRate: number;
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
  addChatMessage: (role: 'user' | 'assistant', text: string) => void;
  clearChat: () => void;
  saveProjectProfile: (name: string, description?: string) => void;
  loadProjectProfile: (id: string) => void;
  duplicateProjectProfile: (id: string) => void;

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
      selectedRole: 'CFO',
      customScenarioSliders: {
        investmentMultiplier: 1.0,
        operatingBenefitMultiplier: 1.0,
        operatingCostMultiplier: 1.0,
        discountRate: 0.115,
      },
      chatMessages: [],
      auditLog: [],
      projectProfiles: DEFAULT_PROJECT_PROFILES,
      activeProfileId: 'proj-dubai-mfc',

      updateAssumptions: (newAssumptions) => {
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
        set({
          assumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
          assumptionsRegister: DEFAULT_ASSUMPTIONS_REGISTER,
          selectedScenario: 'Base',
          selectedRole: 'CFO',
          customScenarioSliders: {
            investmentMultiplier: 1.0,
            operatingBenefitMultiplier: 1.0,
            operatingCostMultiplier: 1.0,
            discountRate: 0.115,
          },
          auditLog: [],
        });
      },

      setScenario: (scenario) => {
        set({ selectedScenario: scenario });
      },

      setRole: (role) => {
        set({ selectedRole: role });
      },

      updateCustomScenarioSliders: (sliders) => {
        set((state) => ({
          customScenarioSliders: { ...state.customScenarioSliders, ...sliders },
        }));
      },

      addChatMessage: (role, text) => {
        const newMessage: ChatMessage = {
          id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          role,
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        const activeAssumptions = get().getActiveAssumptions();
        const { selectedScenario, customScenarioSliders } = get();

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

        return {
          definition: def,
          metrics,
          yearlyCashFlows,
        };
      },
    }),
    {
      name: 'capexiq-financial-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        assumptions: state.assumptions,
        selectedScenario: state.selectedScenario,
        selectedRole: state.selectedRole,
        customScenarioSliders: state.customScenarioSliders,
        chatMessages: state.chatMessages,
        auditLog: state.auditLog,
      }),
    }
  )
);
