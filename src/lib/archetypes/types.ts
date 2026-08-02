/**
 * ARCHETYPE TEMPLATE SYSTEM - TYPE CONTRACTS
 * ==========================================
 *
 * CapExIQ was originally hard-wired to a single project type (the NovaRetail GCC automated
 * micro-fulfilment centre). This module generalises the app to eight investment archetypes
 * without touching the audited deterministic finance engine.
 *
 * The layering is deliberately one-directional:
 *
 *      ArchetypeConfig.defaultDrivers  (archetype-specific business inputs)
 *              |
 *              v
 *      buildAnnualFCF(drivers, archetype, common)      <- the only archetype-aware maths
 *              |
 *              v
 *      FinancialAssumptions            (the engine's existing input contract)
 *              |
 *              v
 *      calculateCashFlowSchedule -> calculateFinancialMetrics   <- UNCHANGED, audited
 *              |
 *              v
 *      existing dashboards, scenarios, sensitivity, Monte Carlo, portfolio, reports
 *
 * Nothing downstream of `FinancialAssumptions` knows an archetype exists, which is what keeps the
 * NovaRetail regression exact and every existing module working unmodified.
 *
 * All monetary values are AED unless a field name says otherwise. All rates are decimals
 * (0.09 = 9%), never percentages.
 */

import type { FinancialMetrics, YearlyCashFlow } from '../types/finance';

/* ------------------------------------------------------------------------------------------- */
/* Archetype identity                                                                           */
/* ------------------------------------------------------------------------------------------- */

/** The eight investment archetypes the platform can appraise. */
export type ProjectArchetype =
  | 'new-branch'
  | 'machinery'
  | 'new-product'
  | 'ai-platform'
  | 'facility-expansion'
  | 'online-service'
  | 'automation'
  | 'market-entry';

/** Iteration order used by the picker screen and by the test suite. */
export const PROJECT_ARCHETYPES: readonly ProjectArchetype[] = [
  'new-branch',
  'machinery',
  'new-product',
  'ai-platform',
  'facility-expansion',
  'online-service',
  'automation',
  'market-entry',
] as const;

/**
 * The archetype every pre-existing project falls back to.
 *
 * The published NovaRetail micro-fulfilment case is a hybrid of a facility expansion and an
 * automation programme; its economics (labour displacement plus a throughput contribution
 * uplift) are those of an automation investment, so that is where it is mapped. Any persisted
 * project saved before the archetype field existed migrates to this value and must continue to
 * produce byte-identical output.
 */
export const DEFAULT_ARCHETYPE: ProjectArchetype = 'automation';

/* ------------------------------------------------------------------------------------------- */
/* Inputs shared by every archetype                                                             */
/* ------------------------------------------------------------------------------------------- */

/**
 * The finance-policy inputs that are NOT archetype-specific: appraisal horizon, hurdle rate,
 * MIRR reinvestment/finance rates and the corporate tax rate. Everything else (capex buckets,
 * benefit drivers, working capital, terminal value) lives in the archetype's own driver shape,
 * because those genuinely differ in kind - an AI platform has no salvage value and a machinery
 * purchase has no market-share curve.
 */
export interface CommonInputs {
  /** Appraisal horizon in whole years. Also the depreciation life used by the engine. */
  projectLifeYears: number;
  /** Hurdle rate / WACC used to discount the free cash flows. */
  discountRate: number;
  /** Finance rate for the MIRR calculation (rate at which outflows are funded). */
  financeRateMIRR: number;
  /** Reinvestment rate for the MIRR calculation. */
  reinvestmentRateMIRR: number;
  /** Statutory corporate tax rate applied to positive EBIT. */
  corporateTaxRate: number;
}

/* ------------------------------------------------------------------------------------------- */
/* Archetype-specific driver shapes                                                             */
/* ------------------------------------------------------------------------------------------- */

/**
 * 1. NEW BRANCH - opening an additional physical branch/store.
 *
 * Capex is dominated by leasehold fit-out; the benefit is a revenue ramp to a steady-state
 * per-branch sales level. The distinctive risk is cannibalisation: a share of the new branch's
 * revenue is not incremental to the group, it is simply transferred from nearby branches, so
 * only the non-cannibalised gross margin may be counted as a benefit.
 */
export interface NewBranchDrivers {
  kind: 'new-branch';

  /* CapEx */
  leaseholdFitOut: number;
  branchEquipmentAndIt: number;
  /** Recruitment, pre-opening payroll, training and the opening campaign. */
  preOpeningCosts: number;

  /* Working capital */
  openingInventory: number;
  /** Fraction of the opening inventory released at the end of the appraisal horizon. */
  inventoryRecoveryPct: number;

  /* Benefits */
  steadyStateAnnualRevenue: number;
  /** Fraction of steady-state revenue achieved in each year; element 0 = Year 1. */
  revenueRampByYear: number[];
  /** Like-for-like revenue growth applied once the ramp curve is exhausted. */
  matureRevenueGrowth: number;
  grossMarginPct: number;
  /** Share of the new branch's revenue transferred from existing branches (not incremental). */
  cannibalisationPct: number;

  /* Costs */
  /** Rent, payroll, utilities and local marketing for the branch in Year 1. */
  year1BranchOperatingCost: number;
  branchOperatingCostGrowth: number;
  /** Central/regional overhead the branch network as a whole must cover (headline-KPI input). */
  sharedNetworkOverheadPerYear: number;

  /* Terminal */
  fitOutResidualValue: number;
}

/**
 * 2. MACHINERY - purchasing a discrete production machine.
 *
 * A textbook replacement/upgrade appraisal: equipment plus installation against labour and scrap
 * savings and a throughput contribution gain. Both benefit lines escalate smoothly, so this
 * archetype maps onto the engine's native geometric form with no per-year index.
 */
export interface MachineryDrivers {
  kind: 'machinery';

  /* CapEx */
  equipmentCost: number;
  installationAndCommissioning: number;
  toolingAndSpares: number;
  operatorTraining: number;

  /* Working capital */
  initialSpareStock: number;
  spareStockRecoveryPct: number;

  /* Benefits - labour and scrap savings */
  annualLabourHoursSaved: number;
  fullyLoadedLabourRatePerHour: number;
  annualScrapAndReworkSaving: number;
  /** Escalation on the savings line, driven mainly by wage inflation. */
  savingsEscalation: number;

  /* Benefits - throughput gain */
  incrementalUnitsPerYear: number;
  contributionPerUnit: number;
  throughputGrowth: number;

  /* Costs */
  year1MaintenanceAndPower: number;
  maintenanceCostGrowth: number;

  /* Terminal */
  residualValue: number;

  /** Engineering useful life of the asset - compared against payback in the headline KPI. */
  usefulLifeYears: number;
}

/**
 * 3. NEW PRODUCT - introducing a new product line.
 *
 * Volumes follow a life cycle (launch, growth, peak, decline) rather than a smooth growth rate,
 * so this archetype supplies an explicit per-year unit curve. Price erodes as competitors
 * respond, and a share of the units are taken from the company's own existing range.
 */
export interface NewProductDrivers {
  kind: 'new-product';

  /* CapEx */
  researchAndDevelopment: number;
  toolingAndMoulds: number;
  launchMarketing: number;

  /* Working capital */
  initialStockAndReceivables: number;
  workingCapitalRecoveryPct: number;

  /* Benefits */
  /** Units sold in each year of the life cycle; element 0 = Year 1. */
  unitsByYear: number[];
  unitSellingPrice: number;
  unitVariableCost: number;
  /** Annual decline in realised selling price as the product matures. */
  priceErosionPerYear: number;
  /** Share of the new product's units that displace the company's existing range. */
  cannibalisedUnitsPct: number;
  /** Contribution per unit forgone on each cannibalised unit. */
  cannibalisedContributionPerUnit: number;

  /* Costs */
  year1IncrementalFixedCost: number;
  fixedCostGrowth: number;

  /* Terminal */
  toolingResidualValue: number;
}

/**
 * 4. AI PLATFORM - building a commercial AI/SaaS platform.
 *
 * Revenue is subscription ARR: the retained base plus newly booked ARR recognised part-way
 * through its booking year. The distinctive risk is that inference and infrastructure cost
 * scales with usage rather than being fixed, so the cost line is expressed as a per-year
 * percentage of revenue that can be made to rise as the platform scales.
 */
export interface AiPlatformDrivers {
  kind: 'ai-platform';

  /* CapEx */
  engineeringBuildCost: number;
  cloudInfrastructureSetup: number;
  dataLicensingUpfront: number;
  goToMarketSetup: number;

  /* Working capital */
  initialWorkingCapital: number;
  workingCapitalRecoveryPct: number;

  /* Benefits */
  /** Gross new ARR booked in each year; element 0 = Year 1. */
  newArrByYear: number[];
  /** Gross annual revenue churn on the opening ARR base. */
  grossAnnualChurnPct: number;
  /** Share of newly booked ARR recognised as revenue in its booking year (0.5 = mid-year). */
  revenueRecognitionFactor: number;

  /* Costs */
  /** Inference + hosting cost as a share of revenue, per year; element 0 = Year 1. */
  inferenceCostPctOfRevenueByYear: number[];
  /** Platform engineering, data-licence renewals and support run-rate. */
  year1PlatformRunCost: number;
  platformRunCostGrowth: number;
  /** Sales and marketing spend per AED of newly booked ARR (the CAC ratio). */
  salesAndMarketingPerArr: number;

  /* KPI inputs */
  /** Customer gross margin used for the lifetime-value calculation. */
  customerGrossMarginPct: number;

  /* Terminal */
  /** Recoverable value of the platform at horizon end (data assets, tooling). Often ~0. */
  terminalAssetRecovery: number;
}

/**
 * 5. FACILITY EXPANSION - adding production capacity.
 *
 * Benefit = incremental capacity multiplied by a utilisation ramp, valued at a contribution per
 * unit that escalates with price. The distinctive risk is permitting/construction delay, modelled
 * as a pro-rata reduction of the first productive year.
 */
export interface FacilityExpansionDrivers {
  kind: 'facility-expansion';

  /* CapEx */
  construction: number;
  productionEquipment: number;
  commissioningAndValidation: number;
  permittingAndDesign: number;

  /* Working capital */
  additionalWorkingCapital: number;
  workingCapitalRecoveryPct: number;

  /* Benefits */
  incrementalAnnualCapacityUnits: number;
  /** Capacity utilisation achieved in each year; element 0 = Year 1. */
  utilisationRampByYear: number[];
  contributionPerUnit: number;
  contributionEscalation: number;

  /* Costs */
  year1IncrementalFixedCost: number;
  fixedCostGrowth: number;

  /* Risk */
  /** Months of permitting/construction slippage; reduces Year-1 output pro rata. */
  commissioningDelayMonths: number;

  /* Terminal */
  residualValue: number;
}

/**
 * 6. ONLINE SERVICE - launching a consumer online service.
 *
 * Benefit = average active users multiplied by ARPU. Acquisition spend is a variable cost that
 * scales with the user intake, and the distinctive risk is CAC inflation: paid-acquisition costs
 * rise faster than ARPU as the cheap audience is exhausted.
 */
export interface OnlineServiceDrivers {
  kind: 'online-service';

  /* CapEx */
  platformBuild: number;
  launchMarketing: number;
  contentAndOpsSetup: number;

  /* Working capital */
  initialWorkingCapital: number;
  workingCapitalRecoveryPct: number;

  /* Benefits */
  /** Newly acquired users in each year; element 0 = Year 1. */
  newUsersByYear: number[];
  /** Share of the opening user base retained into the next year. */
  annualRetentionPct: number;
  annualArpu: number;
  arpuGrowth: number;

  /* Costs */
  year1CacPerUser: number;
  /** Annual inflation in cost per acquired user - the distinctive risk. */
  cacInflation: number;
  variableServiceCostPctOfRevenue: number;
  year1FixedPlatformCost: number;
  fixedCostGrowth: number;

  /* KPI inputs */
  /** Contribution margin on ARPU used for the CAC-payback calculation. */
  contributionMarginPct: number;

  /* Terminal */
  terminalAssetRecovery: number;
}

/**
 * 7. AUTOMATION - installing automation technology.
 *
 * THIS IS THE REGRESSION ARCHETYPE. Its default drivers are exactly the published NovaRetail GCC
 * micro-fulfilment assumptions, and `buildAnnualFCF` must reproduce
 * `DEFAULT_FINANCIAL_ASSUMPTIONS` from them field for field.
 *
 * Benefit = displaced labour cost + error/waste elimination (the savings line) plus the
 * contribution on incremental throughput (the margin line). Both escalate smoothly, so - like
 * machinery - this archetype uses the engine's native geometric form with no per-year index,
 * which is what makes bit-identical reproduction possible.
 */
export interface AutomationDrivers {
  kind: 'automation';

  /* CapEx */
  automationEquipment: number;
  systemsIntegration: number;
  softwareAndCybersecurity: number;
  /** Training, go-live support and the workforce-transition/reskilling programme. */
  trainingAndWorkforceTransition: number;

  /* Working capital */
  initialWorkingCapital: number;
  workingCapitalRecovery: number;

  /* Benefits - labour and waste */
  rolesDisplaced: number;
  fullyLoadedCostPerRole: number;
  errorAndWasteSaving: number;
  savingsEscalation: number;

  /* Benefits - throughput */
  incrementalThroughputUnits: number;
  contributionPerUnit: number;
  throughputGrowth: number;

  /* Costs */
  year1RunCost: number;
  runCostGrowth: number;

  /* Terminal */
  salvageValue: number;

  /* KPI inputs - baseline economics before automation */
  baselineUnitsPerYear: number;
  baselineCostPerUnit: number;
}

/**
 * 8. MARKET ENTRY - entering a new geography.
 *
 * Benefit = a market-share capture curve applied to a growing addressable market, at a local
 * contribution margin, less an FX/repatriation haircut that stands in for the currency,
 * regulatory and political risk of operating outside the home market.
 */
export interface MarketEntryDrivers {
  kind: 'market-entry';

  /* CapEx */
  licensingAndRegistration: number;
  localSetupAndOffice: number;
  entryMarketingCampaign: number;
  regulatoryAndComplianceSetup: number;

  /* Working capital */
  localWorkingCapital: number;
  workingCapitalRecoveryPct: number;

  /* Benefits */
  addressableMarketAed: number;
  marketGrowthPct: number;
  /** Share of the addressable market captured in each year; element 0 = Year 1. */
  marketShareByYear: number[];
  contributionMarginPct: number;
  /** Haircut on repatriated contribution covering FX, withholding and transfer friction. */
  fxAndRepatriationHaircutPct: number;

  /* Costs */
  year1LocalFixedCost: number;
  localCostGrowth: number;

  /* Terminal */
  exitAssetRecovery: number;
}

/** Discriminated union of every archetype driver shape. Narrow on `kind`. */
export type ArchetypeDrivers =
  | NewBranchDrivers
  | MachineryDrivers
  | NewProductDrivers
  | AiPlatformDrivers
  | FacilityExpansionDrivers
  | OnlineServiceDrivers
  | AutomationDrivers
  | MarketEntryDrivers;

/** Resolves an archetype key to its driver shape. */
export type DriversFor<K extends ProjectArchetype> = Extract<ArchetypeDrivers, { kind: K }>;

/**
 * Every driver field name across all eight archetypes, excluding the `kind` discriminant.
 *
 * `keyof ArchetypeDrivers` on a union yields only the keys COMMON to all members (i.e. just
 * `kind`), which is useless for a patch type, so the key sets are collected per archetype and then
 * unioned.
 */
export type ArchetypeDriverField = Exclude<
  { [K in ProjectArchetype]: keyof DriversFor<K> }[ProjectArchetype],
  'kind'
>;

/**
 * A partial edit to an archetype's drivers. Every driver value is either a scalar or a per-year
 * curve, so the value type is closed without resorting to `any`. Fields that do not belong to the
 * currently selected archetype are ignored at runtime by the store.
 */
export type ArchetypeDriverPatch = Partial<Record<ArchetypeDriverField, number | number[]>>;

/* ------------------------------------------------------------------------------------------- */
/* Config metadata                                                                              */
/* ------------------------------------------------------------------------------------------- */

/**
 * App modules that an archetype may or may not sensibly use. Keys match the existing route
 * slugs, except `esg`, which is a planned module carried here so configs can already declare
 * whether it is meaningful for them.
 */
export type AppModule =
  | 'scenarios'
  | 'sensitivity'
  | 'monte-carlo'
  | 'portfolio'
  | 'strategic-scorecard'
  | 'capacity-model'
  | 'operational-analytics'
  | 'electricity-estimator'
  | 'vendor-analysis'
  | 'approvals'
  | 'real-options'
  | 'funding'
  | 'benefits-tracker'
  | 'implementation-plan'
  | 'csv-management'
  | 'external-data'
  | 'esg';

/** Human labels for a subset of an archetype's driver fields. */
export type FieldLabels<D> = Partial<Record<Extract<keyof D, string>, string>>;

/** How a headline KPI value should be rendered. */
export type KpiFormat = 'aed' | 'number' | 'percent' | 'ratio' | 'years' | 'months' | 'count';

/**
 * The single number a board would quote for this archetype.
 *
 * `compute` must be pure: no I/O, no mutation of its arguments, no reliance on ambient state. It
 * receives the archetype drivers plus the engine's own outputs so a KPI can be either a pure
 * business ratio (LTV:CAC) or a derived financial one (payback against useful life).
 */
export interface HeadlineKpi<K extends ProjectArchetype> {
  label: string;
  format: KpiFormat;
  /** One line explaining what the number means and why the board cares. */
  interpretation: string;
  compute: (
    drivers: DriversFor<K>,
    metrics: FinancialMetrics,
    schedule: readonly YearlyCashFlow[],
  ) => number | null;
}

/** Everything the app needs to present and seed one archetype. */
export interface ArchetypeConfig<K extends ProjectArchetype = ProjectArchetype> {
  key: K;
  label: string;
  /** One line, shown on the picker card. */
  shortDescription: string;
  /** Lucide icon NAME; the picker maps it to a component. */
  icon: string;
  /** Hex accent taken from the design tokens in `src/app/globals.css`. */
  accentColor: string;
  capexFieldLabels: FieldLabels<DriversFor<K>>;
  benefitFieldLabels: FieldLabels<DriversFor<K>>;
  distinctiveRisk: string;
  headlineKpi: HeadlineKpi<K>;
  defaultDrivers: DriversFor<K>;
  defaultCommon: CommonInputs;
  relevantModules: AppModule[];
  /** Modules that are NOT meaningful here, with the reason - shown in the UI as guidance. */
  excludedModules: Partial<Record<AppModule, string>>;
}

/** The full registry: one strongly-typed config per archetype key. */
export type ArchetypeConfigRegistry = { [K in ProjectArchetype]: ArchetypeConfig<K> };

/**
 * A config for SOME archetype, for code that iterates the registry (the picker screen, the tests).
 *
 * This is a discriminated UNION of the eight concrete config types, not `ArchetypeConfig<ProjectArchetype>`.
 * The latter is unsound: `headlineKpi.compute` takes drivers as a parameter, and function
 * parameters are contravariant, so a `ArchetypeConfig<'machinery'>` is not assignable to a config
 * whose compute accepts any archetype's drivers. Narrowing on `key` recovers full type safety.
 */
export type AnyArchetypeConfig = ArchetypeConfigRegistry[ProjectArchetype];
