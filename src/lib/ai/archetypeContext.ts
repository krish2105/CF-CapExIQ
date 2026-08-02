/**
 * Archetype context for the AI advisory layer.
 *
 * NOTE ON THE UNION TYPE
 * ----------------------
 * The canonical `ProjectArchetype` union is being introduced separately at
 * `src/lib/archetypes/types.ts`. To avoid a cross-module build dependency
 * while both are in flight, this file declares its own local mirror of the
 * same eight keys. Once `src/lib/archetypes/types.ts` lands, these two
 * should be unified (this file should import the canonical union and delete
 * `PROJECT_ARCHETYPE_KEYS`). Keep the key strings byte-identical until then.
 */

import { z } from 'zod';

export const PROJECT_ARCHETYPE_KEYS = [
  'new-branch',
  'machinery',
  'new-product',
  'ai-platform',
  'facility-expansion',
  'online-service',
  'automation',
  'market-entry',
] as const;

/** Local mirror of `ProjectArchetype` — see the note at the top of this file. */
export type ArchetypeKey = (typeof PROJECT_ARCHETYPE_KEYS)[number];

export const ArchetypeSchema = z.enum(PROJECT_ARCHETYPE_KEYS);

export interface ArchetypeRiskAxis {
  /** Stable identifier, kebab-case. */
  id: string;
  label: string;
  /** Why this axis matters for this archetype specifically. */
  description: string;
  /** Deterministic prior severity on a 1-10 scale; the model may re-rank. */
  severity: number;
  /** Likelihood band used by the deterministic fallback. */
  likelihood: 'Low' | 'Medium' | 'High';
  mitigation: string;
  /** Which model input this axis attacks, so it can be traced to the maths. */
  linkedDriver: string;
}

export interface ArchetypeScenarioTheme {
  name: string;
  rationale: string;
  /**
   * Multiplier suggestions handed to the deterministic engine. The AI layer
   * proposes assumptions only; it never evaluates them.
   */
  multipliers: {
    operatingBenefits: number;
    capex: number;
    opex: number;
    discountRate: number;
    projectLife: number;
  };
}

export interface ArchetypePersonaSlant {
  cfo: string;
  coo: string;
  cro: string;
  ned: string;
}

export interface ArchetypeContext {
  key: ArchetypeKey;
  label: string;
  /** One-line description of the capital archetype. */
  summary: string;
  /** Ordered most-severe first; index 0 is the archetype's signature risk. */
  riskAxes: ArchetypeRiskAxis[];
  /** Domain KPI vocabulary the model should prefer over generic finance terms. */
  kpiVocabulary: string[];
  /** App modules that carry signal for this archetype. */
  relevantModules: string[];
  /** App modules that carry little or no signal — the model should not lean on them. */
  irrelevantModules: string[];
  /** ESG / green-financing commentary is only meaningful for physical assets. */
  esgApplicable: boolean;
  esgAngle: string;
  /** Macro variables that actually move this archetype's cash flows. */
  macroDrivers: string[];
  /** Extra named scenarios beyond Optimistic / Base / Pessimistic. */
  scenarioThemes: ArchetypeScenarioTheme[];
  /** How each board persona reads this archetype. */
  personaSlant: ArchetypePersonaSlant;
  /** Capex categories used when classifying vendor quotation line items. */
  capexCategories: string[];
}

export const ARCHETYPE_CONTEXTS: Record<ArchetypeKey, ArchetypeContext> = {
  'new-branch': {
    key: 'new-branch',
    label: 'New Branch / Outlet',
    summary:
      'Opening an additional physical trading location inside an existing catchment served by the network.',
    riskAxes: [
      {
        id: 'cannibalisation',
        label: 'Cannibalisation of existing catchment',
        description:
          'A new outlet inside an existing trade area transfers rather than creates demand. Incremental revenue is overstated whenever the model books gross branch turnover instead of net-of-transfer turnover.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Model revenue net of transfer using a catchment-overlap study; hold the branch to an incremental-basket KPI, not gross turnover, at every capital-release gate.',
        linkedDriver: 'Operating benefits / incremental contribution margin',
      },
      {
        id: 'footfall-ramp',
        label: 'Footfall ramp-up slower than modelled',
        description:
          'Branch economics are front-loaded in the model but back-loaded in reality; a slow ramp pushes payback out and compounds against the discount rate.',
        severity: 7,
        likelihood: 'Medium',
        mitigation:
          'Phase fit-out spend against a footfall trigger; retain a break clause in the first 24 months of the lease.',
        linkedDriver: 'Year-1 operating benefits, project life',
      },
      {
        id: 'lease-escalation',
        label: 'Lease and service-charge escalation',
        description:
          'Retail lease escalators in the GCC frequently outrun general inflation and are contractually locked for the project life.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Cap the escalator contractually and stress OpEx at the cap, not at the expectation.',
        linkedDriver: 'Operating expenditure growth',
      },
      {
        id: 'local-competition',
        label: 'Competitive entry into the same catchment',
        description:
          'A competing format opening after commitment erodes the contribution margin the branch was underwritten on.',
        severity: 5,
        likelihood: 'Medium',
        mitigation: 'Underwrite at a defended-margin case; monitor competitor planning applications quarterly.',
        linkedDriver: 'Contribution margin',
      },
    ],
    kpiVocabulary: [
      'like-for-like sales transfer rate',
      'incremental basket value',
      'sales per square metre',
      'catchment overlap %',
      'footfall conversion rate',
      'branch contribution margin',
    ],
    relevantModules: ['Scenario analysis', 'Sensitivity / tornado', 'Break-even', 'Payback'],
    irrelevantModules: ['Real-options staging beyond the lease break', 'Electricity estimator'],
    esgApplicable: true,
    esgAngle:
      'Fit-out embodied carbon, store energy intensity (kWh per square metre), refrigerant selection and waste-to-landfill diversion are auditable and can support a green-lease or sustainability-linked facility.',
    macroDrivers: [
      'Retail rental index',
      'Consumer confidence / discretionary spend',
      'Headline CPI (affects OpEx escalators)',
      'Policy rate (affects the discount rate)',
    ],
    scenarioThemes: [
      {
        name: 'Cannibalisation Stress',
        rationale:
          'Assumes a materially higher share of branch turnover is transferred from existing outlets rather than newly created.',
        multipliers: { operatingBenefits: 0.7, capex: 1.0, opex: 1.0, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Slow Ramp',
        rationale: 'Footfall reaches steady state two years later than modelled; benefits defer, costs do not.',
        multipliers: { operatingBenefits: 0.8, capex: 1.0, opex: 1.05, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Lease Escalator Cap Breach',
        rationale: 'Service charges and rent escalate at the contractual cap for the full term.',
        multipliers: { operatingBenefits: 1.0, capex: 1.0, opex: 1.2, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on whether incremental revenue is genuinely incremental and on lease liability recognised on balance sheet.',
      coo: 'Focuses on staffing, stock availability and whether the network can absorb another site without service degradation.',
      cro: 'Focuses on the lease break clause, catchment concentration and single-site dependency.',
      ned: 'Presses on whether the board has ever seen a branch business case that assumed transfer rather than growth.',
    },
    capexCategories: ['Fit-out & shopfitting', 'IT & POS', 'Refrigeration & MEP', 'Signage & branding', 'Professional fees', 'Working capital'],
  },

  machinery: {
    key: 'machinery',
    label: 'Plant & Machinery',
    summary: 'Acquisition of production or handling equipment with a defined economic life and residual value.',
    riskAxes: [
      {
        id: 'obsolescence',
        label: 'Technological obsolescence before end of economic life',
        description:
          'The asset is depreciated and underwritten over its accounting life, but a step-change in equipment technology can strand it earlier, destroying the assumed salvage value and the tail-year cash flows.',
        severity: 9,
        likelihood: 'Medium',
        mitigation:
          'Underwrite salvage conservatively, secure a written secondary-market buyback or trade-in undertaking, and test NPV with terminal value set to zero.',
        linkedDriver: 'Project life, terminal / salvage value',
      },
      {
        id: 'maintenance-escalation',
        label: 'Maintenance and spares cost escalation',
        description:
          'Maintenance cost curves are convex: they are flat under warranty and rise steeply afterwards, which the straight-line OpEx assumption understates.',
        severity: 7,
        likelihood: 'High',
        mitigation: 'Fix a full-service maintenance contract for the majority of the asset life with a capped uplift.',
        linkedDriver: 'Operating expenditure growth',
      },
      {
        id: 'utilisation',
        label: 'Utilisation below the underwritten rate',
        description:
          'Machinery economics are almost entirely a utilisation story; below the breakeven duty cycle the fixed cost base dominates.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Gate the purchase on a signed volume commitment; retain an option to lease rather than buy.',
        linkedDriver: 'Operating benefits',
      },
      {
        id: 'lead-time',
        label: 'Supply-chain lead time and installation slippage',
        description: 'Long-lead equipment delays the entire benefit stream while the capital is already sunk.',
        severity: 5,
        likelihood: 'Medium',
        mitigation: 'Stage payments against delivery and commissioning milestones with liquidated damages.',
        linkedDriver: 'Timing of Year-1 benefits',
      },
    ],
    kpiVocabulary: [
      'overall equipment effectiveness (OEE)',
      'duty cycle / utilisation rate',
      'mean time between failures',
      'cost per unit throughput',
      'residual value ratio',
      'maintenance cost per operating hour',
    ],
    relevantModules: ['Sensitivity / tornado', 'Break-even', 'Salvage & terminal value', 'Real options (defer / abandon)'],
    irrelevantModules: ['Customer acquisition analytics', 'Churn modelling'],
    esgApplicable: true,
    esgAngle:
      'Energy consumption per unit of throughput, refrigerant and lubricant handling, noise, and end-of-life recyclability are measurable and can qualify the asset for green equipment financing.',
    macroDrivers: ['Industrial equipment price index', 'FX on imported equipment', 'Import tariffs', 'Energy tariffs', 'Policy rate'],
    scenarioThemes: [
      {
        name: 'Early Obsolescence',
        rationale: 'Economic life truncated and salvage value written down as newer equipment displaces the asset.',
        multipliers: { operatingBenefits: 1.0, capex: 1.0, opex: 1.0, discountRate: 1.0, projectLife: 0.67 },
      },
      {
        name: 'Post-Warranty Maintenance Shock',
        rationale: 'Maintenance and spares step up sharply once the warranty period lapses.',
        multipliers: { operatingBenefits: 1.0, capex: 1.0, opex: 1.25, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Low Utilisation',
        rationale: 'Duty cycle settles materially below the underwritten rate.',
        multipliers: { operatingBenefits: 0.75, capex: 1.0, opex: 0.95, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on capital allowances, the depreciation profile and whether salvage value is contractually secured.',
      coo: 'Focuses on throughput, commissioning risk and the maintenance skills base.',
      cro: 'Focuses on single-supplier dependency and stranded-asset exposure.',
      ned: 'Asks what the asset is worth on the second-hand market on the day after commissioning.',
    },
    capexCategories: ['Equipment & machinery', 'Installation & commissioning', 'Spares & tooling', 'Freight & duties', 'Professional fees', 'Working capital'],
  },

  'new-product': {
    key: 'new-product',
    label: 'New Product Launch',
    summary: 'Investment in developing and launching a new product line into an existing customer base.',
    riskAxes: [
      {
        id: 'cannibalisation',
        label: 'Cannibalisation of the existing product portfolio',
        description:
          'A new line sold to the same customers substitutes existing volume. Booking gross launch revenue as incremental is the single most common overstatement in launch business cases.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Underwrite on net-of-substitution contribution; require a portfolio-level margin bridge rather than a product-level P&L at every gate.',
        linkedDriver: 'Operating benefits / incremental contribution margin',
      },
      {
        id: 'demand-uncertainty',
        label: 'Demand uncertainty and forecast dispersion',
        description:
          'Launch volumes have no historic base, so the forecast standard deviation dwarfs that of the rest of the model.',
        severity: 8,
        likelihood: 'High',
        mitigation: 'Stage the launch regionally; treat the national roll-out as a real option contingent on pilot data.',
        linkedDriver: 'Operating benefits',
      },
      {
        id: 'price-erosion',
        label: 'Price erosion after competitor response',
        description: 'Launch pricing rarely holds; margin decays as competitors match.',
        severity: 7,
        likelihood: 'High',
        mitigation: 'Underwrite the year-three price, not the launch price.',
        linkedDriver: 'Contribution margin growth rate',
      },
      {
        id: 'time-to-market',
        label: 'Time-to-market slippage',
        description: 'Development overrun defers the whole benefit stream while development OpEx continues.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Hard stage-gates with a defined kill criterion, not just a delay criterion.',
        linkedDriver: 'Project life, timing of benefits',
      },
    ],
    kpiVocabulary: [
      'net-of-cannibalisation contribution',
      'substitution rate',
      'gross margin after launch support',
      'sell-in vs sell-through',
      'trade spend ratio',
      'time to first repeat purchase',
    ],
    relevantModules: ['Scenario analysis', 'Monte Carlo', 'Real options (staged launch)', 'Break-even'],
    irrelevantModules: ['Electricity estimator', 'Facility capacity model', 'ESG / green-financing commentary'],
    esgApplicable: false,
    esgAngle:
      'No material owned physical asset is created, so green-financing and asset-level ESG metrics do not apply. Packaging and supply-chain footprint belong in the product design review, not in this capital appraisal.',
    macroDrivers: ['Category demand growth', 'Input cost inflation', 'FX on imported inputs', 'Consumer confidence'],
    scenarioThemes: [
      {
        name: 'High Cannibalisation',
        rationale: 'A large share of launch volume is drawn from the existing portfolio rather than from the market.',
        multipliers: { operatingBenefits: 0.6, capex: 1.0, opex: 1.0, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Price War',
        rationale: 'Competitor response compresses realised price and therefore contribution margin.',
        multipliers: { operatingBenefits: 0.75, capex: 1.0, opex: 1.1, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Delayed Launch',
        rationale: 'Development overruns by roughly one year; the benefit window shortens.',
        multipliers: { operatingBenefits: 0.85, capex: 1.1, opex: 1.05, discountRate: 1.0, projectLife: 0.83 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on whether the revenue is incremental at group level and on the capitalisation of development spend.',
      coo: 'Focuses on supply readiness, SKU proliferation and service-level impact on the existing range.',
      cro: 'Focuses on forecast dispersion and on the absence of a kill gate.',
      ned: 'Asks what happens to the business case if the product simply replaces the existing best-seller.',
    },
    capexCategories: ['Product development', 'Tooling & moulds', 'Launch marketing', 'Inventory build (working capital)', 'Regulatory & certification'],
  },

  'ai-platform': {
    key: 'ai-platform',
    label: 'AI Platform / Model Deployment',
    summary: 'Investment in building or deploying an AI/ML platform whose running cost scales with usage.',
    riskAxes: [
      {
        id: 'inference-cost-scaling',
        label: 'Inference cost scaling with adoption',
        description:
          'Unlike a fixed-capex asset, the dominant cost is variable and rises with the very adoption that drives the benefit. Success and cost are correlated, so the upside case carries its own cost escalation and the OpEx line is not independent of the benefit line.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Model unit economics per thousand inferences, not a flat annual OpEx; negotiate committed-use discounts and enforce a per-tenant token budget with hard cut-offs.',
        linkedDriver: 'Operating expenditure growth (correlated with operating benefits)',
      },
      {
        id: 'model-drift',
        label: 'Model drift and accuracy degradation',
        description:
          'Accuracy decays as the input distribution moves away from the training distribution. The benefit case assumes a static accuracy that will not hold without continuous retraining spend.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Fund a standing retraining and evaluation budget inside OpEx from Year 1; define an accuracy floor below which the benefit claim is withdrawn.',
        linkedDriver: 'Operating benefits, operating expenditure',
      },
      {
        id: 'vendor-lock-in',
        label: 'Foundation-model vendor concentration and repricing',
        description:
          'Provider price changes or deprecation of a model version can reset the cost base mid-life with no contractual protection.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Maintain a tested second-source model behind an abstraction layer; avoid provider-specific prompt or tooling dependencies.',
        linkedDriver: 'Operating expenditure',
      },
      {
        id: 'data-governance',
        label: 'Data governance and AI regulatory exposure',
        description:
          'Data-residency, consent and emerging AI-assurance obligations can force rework or restrict the use case after capital is committed.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Complete a data protection and AI impact assessment before capital release; keep processing in-region.',
        linkedDriver: 'Capex (rework), project life',
      },
      {
        id: 'talent-concentration',
        label: 'Talent concentration risk',
        description: 'Delivery depends on a small number of specialists whose departure stalls the benefit stream.',
        severity: 5,
        likelihood: 'Medium',
        mitigation: 'Mandate documentation, pairing and a named deputy for each critical component.',
        linkedDriver: 'Timing of benefits',
      },
    ],
    kpiVocabulary: [
      'cost per thousand inferences',
      'tokens per transaction',
      'model accuracy / F1 against the acceptance floor',
      'drift rate between retraining cycles',
      'GPU-hour utilisation',
      'automation rate / human-in-the-loop escalation rate',
    ],
    relevantModules: ['Sensitivity / tornado (OpEx axis)', 'Monte Carlo', 'Real options (staged rollout)', 'Break-even'],
    irrelevantModules: ['Salvage / residual value', 'Electricity estimator', 'ESG / green-financing commentary', 'Facility capacity model'],
    esgApplicable: false,
    esgAngle:
      'No owned physical asset is created and compute is consumed through a third-party provider, so asset-level green-financing metrics do not apply. Provider-side energy intensity is not auditable by NovaRetail GCC and should not be asserted.',
    macroDrivers: ['Compute and GPU pricing', 'Foundation-model list pricing', 'Cloud FX exposure (USD-denominated)', 'AI regulatory timetable', 'Specialist wage inflation'],
    scenarioThemes: [
      {
        name: 'Inference Cost Blow-out',
        rationale: 'Adoption exceeds plan and variable inference cost scales faster than the realised benefit.',
        multipliers: { operatingBenefits: 1.15, capex: 1.0, opex: 1.6, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Accuracy Decay (No Retraining Budget)',
        rationale: 'Model drift erodes the automation rate; the benefit case degrades year on year.',
        multipliers: { operatingBenefits: 0.65, capex: 1.0, opex: 1.05, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Provider Repricing',
        rationale: 'The foundation-model provider resets pricing mid-life with no contractual cap.',
        multipliers: { operatingBenefits: 1.0, capex: 1.05, opex: 1.35, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on the opex-heavy shape of the case, on whether cost scales with benefit, and on the absence of a residual asset.',
      coo: 'Focuses on the human-in-the-loop fallback when accuracy drops and on integration with existing workflows.',
      cro: 'Focuses on model drift, data residency and the absence of a second-source provider.',
      ned: 'Asks what this costs at ten times the volume and who owns the model output.',
    },
    capexCategories: ['Platform engineering', 'Data pipeline & integration', 'Model licensing & prepaid compute', 'Security & governance tooling', 'Professional fees'],
  },

  'facility-expansion': {
    key: 'facility-expansion',
    label: 'Facility Expansion',
    summary: 'Extension of an existing site or construction of additional built capacity.',
    riskAxes: [
      {
        id: 'permitting-delay',
        label: 'Permitting and authority approval delay',
        description:
          'Building permits, civil-defence sign-off, utility connections and municipality NOCs sit on the critical path and are outside management control. Every month of permitting delay defers the entire benefit stream while capital is already committed.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Do not release construction capital until the permit pack is granted; hold a permitting float in the programme and stage the drawdown against authority milestones rather than calendar dates.',
        linkedDriver: 'Timing of benefits, project life',
      },
      {
        id: 'construction-escalation',
        label: 'Construction cost escalation and variation orders',
        description:
          'Built-asset capex is the least reliable line in the model; variation orders accumulate after the contract is signed and cannot be recovered.',
        severity: 8,
        likelihood: 'High',
        mitigation: 'Lump-sum fixed-price contract with a capped variation allowance and a retention held to practical completion.',
        linkedDriver: 'Capital expenditure',
      },
      {
        id: 'capacity-absorption',
        label: 'Capacity absorption below plan',
        description: 'Built capacity is indivisible; if demand does not arrive, the fixed cost of the shell is carried regardless.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Design for phased fit-out so shell and core precede the fit-out decision; keep the second phase optional.',
        linkedDriver: 'Operating benefits',
      },
      {
        id: 'utility-connection',
        label: 'Utility connection capacity and cost',
        description: 'Power and water connection upgrades are frequently discovered late and are charged at authority tariffs.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Obtain a written load-availability confirmation from the utility before committing to the design.',
        linkedDriver: 'Capital expenditure, operating expenditure',
      },
    ],
    kpiVocabulary: [
      'cost per square metre of built area',
      'programme float against permit milestones',
      'capacity absorption rate',
      'utilisation of built capacity',
      'variation order value as % of contract sum',
      'energy intensity per square metre',
    ],
    relevantModules: ['Scenario analysis', 'Sensitivity / tornado (capex axis)', 'Real options (phased fit-out)', 'Electricity estimator', 'Capacity model'],
    irrelevantModules: ['Churn modelling', 'Customer acquisition analytics'],
    esgApplicable: true,
    esgAngle:
      'Embodied carbon in structure, operational energy intensity, green building certification (LEED / Estidama), water reuse and construction waste diversion are auditable and directly support sustainability-linked or green construction financing.',
    macroDrivers: ['Construction cost index', 'Steel and cement prices', 'Contractor capacity / labour availability', 'Policy rate', 'Municipality fee schedule'],
    scenarioThemes: [
      {
        name: 'Permitting Delay',
        rationale: 'Authority approvals slip by roughly a year; benefits defer while financing cost accrues.',
        multipliers: { operatingBenefits: 0.8, capex: 1.05, opex: 1.0, discountRate: 1.0, projectLife: 0.83 },
      },
      {
        name: 'Construction Overrun',
        rationale: 'Variation orders and escalation push the built cost materially above the contract sum.',
        multipliers: { operatingBenefits: 1.0, capex: 1.3, opex: 1.0, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Phased Fit-Out (Option Preserved)',
        rationale: 'Only shell and core are committed now; the fit-out decision is deferred, trimming both capex and early benefits.',
        multipliers: { operatingBenefits: 0.75, capex: 0.7, opex: 0.85, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on the capex profile, drawdown timing and interest during construction.',
      coo: 'Focuses on operating through construction and on the commissioning-to-steady-state curve.',
      cro: 'Focuses on the permit critical path, contractor solvency and health-and-safety exposure.',
      ned: 'Asks who has ever delivered a build of this size on budget within the group.',
    },
    capexCategories: ['Civil & structural works', 'MEP & utilities', 'Fit-out', 'Authority fees & permits', 'Professional fees', 'Contingency'],
  },

  'online-service': {
    key: 'online-service',
    label: 'Online Service / Digital Channel',
    summary: 'Investment in a digital service or subscription channel where growth is bought through marketing.',
    riskAxes: [
      {
        id: 'cac-inflation',
        label: 'Customer acquisition cost inflation',
        description:
          'Paid acquisition costs rise as the addressable audience saturates and auction competition increases. A business case underwritten on todays CAC is underwritten on the cheapest customers the service will ever buy, and the LTV/CAC ratio decays even when the model holds churn constant.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Underwrite on a blended CAC that rises each year; hold a payback-on-CAC ceiling (months) as a hard spend gate rather than an aspiration.',
        linkedDriver: 'Operating expenditure, operating benefits',
      },
      {
        id: 'churn',
        label: 'Churn above the underwritten rate',
        description:
          'Lifetime value is the denominator of the whole case; small absolute increases in monthly churn compound into large lifetime-value reductions.',
        severity: 8,
        likelihood: 'High',
        mitigation: 'Report cohort retention, not average churn; tie the second tranche of spend to a cohort retention floor.',
        linkedDriver: 'Operating benefits, project life',
      },
      {
        id: 'platform-dependency',
        label: 'Platform and channel dependency',
        description: 'App-store rules, algorithm changes or a single dominant acquisition channel can reset unit economics without notice.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Diversify acquisition channels; maintain a direct owned channel that does not depend on an intermediary.',
        linkedDriver: 'Operating benefits, operating expenditure',
      },
      {
        id: 'payment-fraud',
        label: 'Payment fraud and chargeback leakage',
        description: 'Fraud and chargeback losses scale with volume and hit contribution directly.',
        severity: 5,
        likelihood: 'Medium',
        mitigation: 'Provision fraud losses as a percentage of gross merchandise value in the base case, not as an exception.',
        linkedDriver: 'Contribution margin',
      },
    ],
    kpiVocabulary: [
      'customer acquisition cost (CAC)',
      'lifetime value to CAC ratio',
      'CAC payback period in months',
      'cohort retention curve',
      'monthly recurring revenue and net revenue retention',
      'contribution margin per active user',
    ],
    relevantModules: ['Monte Carlo', 'Scenario analysis', 'Break-even', 'Sensitivity / tornado'],
    irrelevantModules: ['Salvage / residual value', 'Electricity estimator', 'ESG / green-financing commentary', 'Facility capacity model'],
    esgApplicable: false,
    esgAngle:
      'The investment creates no owned physical asset, so asset-level green-financing metrics and embodied-carbon commentary do not apply to this appraisal.',
    macroDrivers: ['Digital advertising cost index', 'Consumer discretionary spend', 'Payment interchange fees', 'FX on USD-denominated ad platforms'],
    scenarioThemes: [
      {
        name: 'CAC Inflation',
        rationale: 'Acquisition cost rises materially year on year as the audience saturates.',
        multipliers: { operatingBenefits: 0.85, capex: 1.0, opex: 1.4, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Churn Shock',
        rationale: 'Cohort retention falls below the underwritten floor and lifetime value contracts.',
        multipliers: { operatingBenefits: 0.6, capex: 1.0, opex: 1.0, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Channel Disintermediation',
        rationale: 'The dominant acquisition channel changes its terms and unit economics reset.',
        multipliers: { operatingBenefits: 0.7, capex: 1.0, opex: 1.2, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on CAC payback in months and whether growth spend is capitalised or expensed.',
      coo: 'Focuses on support load per active user and on service reliability at scale.',
      cro: 'Focuses on channel concentration, fraud exposure and data protection.',
      ned: 'Asks what the business looks like if paid acquisition is switched off entirely.',
    },
    capexCategories: ['Platform development', 'Third-party licences & integrations', 'Launch marketing', 'Security & compliance', 'Professional fees'],
  },

  automation: {
    key: 'automation',
    label: 'Automation / Robotics',
    summary:
      'Capital deployed to automate a labour-intensive process, converting variable labour cost into fixed capital and maintenance cost.',
    riskAxes: [
      {
        id: 'workforce-transition',
        label: 'Workforce transition and redeployment cost',
        description:
          'The benefit case is a labour-saving case, so it is only realised if headcount actually changes. Redundancy, redeployment, retraining, end-of-service liabilities, consultation timelines and industrial-relations exposure sit between the model and the saving, and are routinely omitted from the outlay.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Book the full transition cost (severance, end-of-service benefits, retraining) in the initial outlay; publish a redeployment plan before capital release and gate benefit recognition on verified establishment reduction.',
        linkedDriver: 'Initial outlay, operating benefits (labour savings)',
      },
      {
        id: 'throughput-ramp',
        label: 'Throughput ramp and integration risk',
        description:
          'Automated systems rarely reach design throughput at go-live; the WMS/WCS integration layer is where the schedule is lost, deferring the saving while the manual process is still being run in parallel.',
        severity: 8,
        likelihood: 'High',
        mitigation:
          'Milestone-gated capital release tied to integration sign-off and a witnessed throughput acceptance test at design rate.',
        linkedDriver: 'Timing and level of operating benefits',
      },
      {
        id: 'change-adoption',
        label: 'Change management and operational adoption',
        description: 'Workarounds and manual overrides quietly erode the saving after go-live.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Measure the automation rate monthly against the acceptance floor and escalate override volume to the sponsor.',
        linkedDriver: 'Operating benefits',
      },
      {
        id: 'maintenance-skills',
        label: 'Maintenance skills gap and spares dependency',
        description: 'Automation shifts cost from operators to specialist maintenance; that labour market is thinner and more expensive.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Contract vendor maintenance for the early life while building an internal capability with a defined handover date.',
        linkedDriver: 'Operating expenditure growth',
      },
    ],
    kpiVocabulary: [
      'labour hours displaced per period',
      'establishment reduction actually realised',
      'automation rate / manual override rate',
      'units per labour hour',
      'system availability and mean time to repair',
      'cost per pick or per unit handled',
    ],
    relevantModules: ['Sensitivity / tornado (operating benefits axis)', 'Break-even', 'Scenario analysis', 'Capacity model', 'Electricity estimator'],
    irrelevantModules: ['Customer acquisition analytics', 'Churn modelling'],
    esgApplicable: true,
    esgAngle:
      'Energy intensity per unit handled, refrigerant and battery handling, workplace-injury reduction and the social dimension of a documented, funded workforce transition plan are auditable and material to a sustainability-linked facility.',
    macroDrivers: ['Wage inflation (sets the size of the saving)', 'Energy tariffs', 'Robotics equipment pricing and FX', 'Import tariffs', 'Policy rate'],
    scenarioThemes: [
      {
        name: 'Workforce Transition Cost Overrun',
        rationale:
          'Severance, end-of-service and retraining costs land materially above plan and the establishment reduction is only partly delivered.',
        multipliers: { operatingBenefits: 0.8, capex: 1.15, opex: 1.05, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Integration Slippage',
        rationale: 'WMS/WCS integration slips and the manual process is run in parallel through the ramp.',
        multipliers: { operatingBenefits: 0.7, capex: 1.05, opex: 1.15, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Wage Inflation Upside',
        rationale: 'Labour cost inflation runs above plan, which enlarges the avoided-cost saving the automation delivers.',
        multipliers: { operatingBenefits: 1.2, capex: 1.0, opex: 1.05, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on whether the labour saving is contractually deliverable and whether transition cost is inside the outlay.',
      coo: 'Focuses on the parallel-run period, throughput acceptance and the maintenance operating model.',
      cro: 'Focuses on industrial relations, health and safety around automated equipment, and single-point-of-failure exposure.',
      ned: 'Asks how many roles actually leave the establishment and when the board will see evidence of it.',
    },
    capexCategories: [
      'Robotics & automation equipment',
      'WMS / WCS software & integration',
      'Installation & commissioning',
      'Workforce transition & retraining',
      'Spares & tooling',
      'Professional fees',
      'Working capital',
    ],
  },

  'market-entry': {
    key: 'market-entry',
    label: 'New Market Entry',
    summary: 'Committing capital to trade in a new country or jurisdiction.',
    riskAxes: [
      {
        id: 'fx-exposure',
        label: 'Foreign exchange exposure and translation risk',
        description:
          'Cash flows are earned in a currency other than the reporting currency. Even an operationally successful entry can produce a negative NPV in AED terms once translation and any devaluation are applied, and the exposure is unhedgeable at the tenor of a six-year appraisal.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Appraise in local currency and translate at a forward-implied path, not at spot; match local-currency funding to local-currency cash flows and stress the case at a material devaluation.',
        linkedDriver: 'Operating benefits, initial outlay, discount rate',
      },
      {
        id: 'regulatory-licensing',
        label: 'Regulatory, licensing and ownership restrictions',
        description:
          'Trade licences, foreign-ownership caps, local-content rules and sector-specific approvals can delay entry or force a structure that dilutes the returns underwritten here.',
        severity: 9,
        likelihood: 'High',
        mitigation:
          'Obtain written legal opinion on ownership structure and licensing before capital release; treat licence grant as a hard gate rather than a workstream.',
        linkedDriver: 'Timing of benefits, ownership share of benefits',
      },
      {
        id: 'political-sovereign',
        label: 'Political and sovereign risk',
        description:
          'Policy reversal, expropriation risk, capital controls and restrictions on profit repatriation can strand cash flows that the model assumes are freely remittable.',
        severity: 8,
        likelihood: 'Medium',
        mitigation:
          'Apply a country risk premium to the discount rate, consider political risk insurance, and test the case assuming repatriation is restricted for a period.',
        linkedDriver: 'Discount rate, terminal value',
      },
      {
        id: 'tariffs-trade',
        label: 'Tariffs and trade policy',
        description: 'Import duties and changing trade arrangements move landed cost and therefore the entire margin structure.',
        severity: 7,
        likelihood: 'Medium',
        mitigation: 'Model the landed-cost build-up explicitly and stress it at the tariff ceiling rather than the current rate.',
        linkedDriver: 'Operating expenditure, contribution margin',
      },
      {
        id: 'local-partner',
        label: 'Local partner and JV governance',
        description: 'Where entry requires a local partner, control over pricing, capital calls and exit is shared.',
        severity: 6,
        likelihood: 'Medium',
        mitigation: 'Negotiate reserved matters, deadlock resolution and a defined exit mechanic before signing.',
        linkedDriver: 'Share of operating benefits, terminal value',
      },
    ],
    kpiVocabulary: [
      'local-currency contribution translated at forward rates',
      'landed cost per unit after duty',
      'country risk premium (bps on WACC)',
      'repatriable cash as % of local cash generated',
      'licence and approval lead time',
      'local-content compliance ratio',
    ],
    relevantModules: ['Scenario analysis', 'Sensitivity / tornado (discount rate axis)', 'Monte Carlo', 'Real options (staged entry)'],
    irrelevantModules: ['Electricity estimator', 'Facility capacity model'],
    esgApplicable: true,
    esgAngle:
      'Where entry involves owned premises or distribution assets, local environmental permitting, supply-chain labour standards and anti-bribery governance are the material and auditable ESG dimensions; disclose them in local-jurisdiction terms rather than group terms.',
    macroDrivers: [
      'Bilateral FX rate and forward curve',
      'Local policy rate and inflation',
      'Import tariff schedule',
      'Country risk premium / sovereign spread',
      'Capital control and repatriation rules',
    ],
    scenarioThemes: [
      {
        name: 'Currency Devaluation',
        rationale: 'The local currency depreciates materially against AED across the appraisal period.',
        multipliers: { operatingBenefits: 0.7, capex: 1.1, opex: 1.05, discountRate: 1.0, projectLife: 1.0 },
      },
      {
        name: 'Country Risk Repricing',
        rationale: 'A country risk premium is added to the hurdle rate to reflect sovereign and political exposure.',
        multipliers: { operatingBenefits: 1.0, capex: 1.0, opex: 1.0, discountRate: 1.35, projectLife: 1.0 },
      },
      {
        name: 'Licensing Delay',
        rationale: 'Regulatory approval slips, shortening the trading window inside the appraisal period.',
        multipliers: { operatingBenefits: 0.8, capex: 1.05, opex: 1.0, discountRate: 1.0, projectLife: 0.83 },
      },
      {
        name: 'Tariff Escalation',
        rationale: 'Import duties rise to the ceiling of the current trade arrangement, raising landed cost.',
        multipliers: { operatingBenefits: 0.85, capex: 1.0, opex: 1.2, discountRate: 1.0, projectLife: 1.0 },
      },
    ],
    personaSlant: {
      cfo: 'Focuses on the currency of appraisal, hedging cost and whether cash can actually be repatriated.',
      coo: 'Focuses on supply chain into the market, local hiring and service capability at distance.',
      cro: 'Focuses on sanctions, anti-bribery exposure, licensing validity and political risk cover.',
      ned: 'Asks what the exit looks like if the entry fails in year two, and what it costs.',
    },
    capexCategories: [
      'Entity setup & licensing',
      'Local premises & fit-out',
      'Distribution & logistics assets',
      'Launch marketing',
      'Legal & advisory fees',
      'Working capital',
    ],
  },
};

/**
 * The flagship NovaRetail GCC case (an Automated Micro-Fulfilment Centre) is
 * an automation/robotics deployment, so that archetype is the safe default
 * when the caller does not supply one. Routes still report which archetype
 * was applied so the user can see the substitution.
 */
export const DEFAULT_ARCHETYPE: ArchetypeKey = 'automation';

export function isArchetypeKey(value: unknown): value is ArchetypeKey {
  return typeof value === 'string' && (PROJECT_ARCHETYPE_KEYS as readonly string[]).includes(value);
}

export function getArchetypeContext(key?: ArchetypeKey | null): ArchetypeContext {
  return ARCHETYPE_CONTEXTS[key ?? DEFAULT_ARCHETYPE];
}

/** True when asset-level ESG / green-financing commentary is meaningful. */
export function isEsgApplicable(key?: ArchetypeKey | null): boolean {
  return getArchetypeContext(key).esgApplicable;
}

/**
 * Renders the archetype context as a prompt block. This is trusted,
 * server-authored text — user-supplied free text is delimited separately by
 * `delimitUserText` in `guardrails.ts`.
 */
export function buildArchetypePromptBlock(key?: ArchetypeKey | null): string {
  const ctx = getArchetypeContext(key);
  const supplied = key ? 'supplied by the caller' : `not supplied — defaulted to "${DEFAULT_ARCHETYPE}"`;

  const axes = ctx.riskAxes
    .map((axis, index) => `  ${index + 1}. ${axis.label} (prior severity ${axis.severity}/10) — ${axis.description}`)
    .join('\n');

  return `PROJECT ARCHETYPE CONTEXT (${supplied})
- Archetype key: ${ctx.key}
- Archetype: ${ctx.label}
- Definition: ${ctx.summary}
- Signature risk axes for this archetype, most severe first:
${axes}
- Preferred KPI vocabulary: ${ctx.kpiVocabulary.join('; ')}
- Analysis modules that carry signal here: ${ctx.relevantModules.join('; ')}
- Modules that carry little or no signal here (do not lean on them): ${ctx.irrelevantModules.join('; ')}
- Macro variables that move this archetype: ${ctx.macroDrivers.join('; ')}
- Asset-level ESG / green-financing commentary applicable: ${ctx.esgApplicable ? 'YES' : 'NO'}

Your analysis must be specific to this archetype. Generic capital-budgeting commentary that
would read identically for any other archetype is not acceptable.`;
}
