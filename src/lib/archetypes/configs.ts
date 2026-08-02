/**
 * ARCHETYPE CONFIGURATION REGISTRY
 * ================================
 *
 * Eight board-ready templates. Every default below is a defensible mid-market UAE/GCC figure, not
 * a placeholder: each block carries the arithmetic that produced it and the source-style reasoning
 * a CFO would be asked for in committee.
 *
 * CALIBRATION POLICY
 * ------------------
 * A template pack in which all eight archetypes are wildly profitable is not credible and teaches
 * the user nothing. These defaults were deliberately calibrated to spread across the decision
 * space, because that is what a real capital pipeline looks like:
 *
 *   Clear value creation   automation +12.08M, facility-expansion +7.28M, machinery +1.57M
 *   Marginal / borderline  ai-platform -0.01M, new-branch -0.10M, new-product -0.55M
 *   Value destroying       online-service -1.49M, market-entry -2.21M
 *
 * (NPVs at each archetype's own default hurdle rate and horizon; verified by executing the engine
 * against these defaults - see `tests/archetypes.test.ts`.)
 *
 * The marginal and negative cases are not strawmen. Each fails for the specific reason named in
 * its `distinctiveRisk`: cannibalisation, inference-cost scaling, demand-forecast error, CAC
 * inflation, and the cost of establishing a beachhead in a market you do not yet have share in.
 *
 * ACCENT COLOURS
 * --------------
 * Every `accentColor` is lifted verbatim from a CSS custom property in `src/app/globals.css` so
 * the picker cannot drift from the design system:
 *   #06b6d4 --chart-1 (dark)   #10b981 --chart-2 (dark)   #f59e0b --chart-3 (dark)
 *   #a855f7 --chart-4 (dark)   #f43f5e --chart-5 (dark)   #38bdf8 --info (dark)
 *   #67e8f9 --accent-foreground (dark)                    #0284c7 --primary (light) / --ring
 *
 * All money is AED. All rates are decimals.
 */

import type { FinancialMetrics, YearlyCashFlow } from '../types/finance';
import type {
  AiPlatformDrivers,
  AnyArchetypeConfig,
  ArchetypeConfig,
  ArchetypeDrivers,
  DriversFor,
  KpiFormat,
  ArchetypeConfigRegistry,
  AutomationDrivers,
  FacilityExpansionDrivers,
  MachineryDrivers,
  MarketEntryDrivers,
  NewBranchDrivers,
  NewProductDrivers,
  OnlineServiceDrivers,
  ProjectArchetype,
} from './types';

/* ------------------------------------------------------------------------------------------- */
/* 1. NEW BRANCH                                                                                */
/* ------------------------------------------------------------------------------------------- */

/**
 * A single additional specialty-retail branch in a UAE community mall.
 *
 *   Fit-out          AED 3.80M   ~ AED 4,200/sqm over a 900 sqm unit, mid-market shopfit.
 *   Equipment & IT   AED 0.90M   POS, back-office, CCTV, network, fixtures.
 *   Pre-opening      AED 0.50M   Recruitment, 6 weeks pre-opening payroll, opening campaign.
 *   Opening stock    AED 1.60M   ~7 weeks of cost of sales; 90% recoverable on exit.
 *   Steady sales     AED 13.5M   AED 15,000/sqm/yr, a realistic community-mall productivity.
 *   Gross margin     38%         Specialty retail after markdowns and shrink.
 *   Branch opex      AED 2.65M   ~19.6% of sales: rent ~9%, payroll ~7%, other ~3.6%.
 *   Cannibalisation  10%         The single most contested number in any network appraisal.
 *
 * Result: marginal. The branch clears its own operating costs comfortably but the group only
 * banks 90% of the gross margin, and the 7-year lease horizon gives no going-concern terminal
 * value. Push cannibalisation to 15% and the case fails outright - which is exactly the
 * conversation this template is meant to force.
 */
const NEW_BRANCH_DRIVERS: NewBranchDrivers = {
  kind: 'new-branch',
  leaseholdFitOut: 3_800_000,
  branchEquipmentAndIt: 900_000,
  preOpeningCosts: 500_000,
  openingInventory: 1_600_000,
  inventoryRecoveryPct: 0.9,
  steadyStateAnnualRevenue: 13_500_000,
  // Trading builds through the first two years as catchment awareness develops.
  revenueRampByYear: [0.6, 0.85, 1.0],
  matureRevenueGrowth: 0.03,
  grossMarginPct: 0.38,
  cannibalisationPct: 0.1,
  year1BranchOperatingCost: 2_650_000,
  branchOperatingCostGrowth: 0.035,
  // Regional office, distribution and brand spend that the branch network must collectively cover.
  sharedNetworkOverheadPerYear: 6_500_000,
  fitOutResidualValue: 350_000,
};

const NEW_BRANCH: ArchetypeConfig<'new-branch'> = {
  key: 'new-branch',
  label: 'Opening a New Branch',
  shortDescription: 'Appraise an additional retail or service branch, net of cannibalisation.',
  icon: 'Store',
  accentColor: '#06b6d4',
  capexFieldLabels: {
    leaseholdFitOut: 'Leasehold fit-out',
    branchEquipmentAndIt: 'Branch equipment & IT',
    preOpeningCosts: 'Pre-opening & recruitment',
    openingInventory: 'Opening inventory (working capital)',
  },
  benefitFieldLabels: {
    steadyStateAnnualRevenue: 'Steady-state annual branch sales',
    revenueRampByYear: 'Revenue ramp to steady state',
    grossMarginPct: 'Gross margin %',
    cannibalisationPct: 'Cannibalisation of existing branches %',
  },
  distinctiveRisk:
    'Cannibalisation: a share of the new branch’s sales is transferred from nearby branches rather than won from the market, so group-incremental margin is materially below branch-level margin.',
  headlineKpi: {
    label: 'Breakeven store count',
    format: 'count',
    interpretation:
      'How many branches on these economics are needed before steady-state branch EBITDA covers shared network overhead.',
    compute: (drivers, _metrics, schedule) => {
      const operating = schedule.slice(1);
      if (operating.length === 0) return null;
      const steadyStateEbitda = operating[operating.length - 1].ebitda;
      if (steadyStateEbitda <= 0) return null;
      return Math.ceil(drivers.sharedNetworkOverheadPerYear / steadyStateEbitda);
    },
  },
  defaultDrivers: NEW_BRANCH_DRIVERS,
  defaultCommon: {
    // Seven-year horizon = the initial lease term. Retail formats carry more demand risk than
    // industrial assets, hence 12.5% against the 11.5% group WACC.
    projectLifeYears: 7,
    discountRate: 0.125,
    financeRateMIRR: 0.125,
    reinvestmentRateMIRR: 0.125,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'operational-analytics',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {
    'capacity-model': 'Throughput capacity modelling targets fulfilment and production assets, not a retail branch.',
    'vendor-analysis': 'There is no competitive equipment tender to score; fit-out is contracted as a single package.',
    'electricity-estimator': 'Branch utilities sit inside the landlord service charge and the branch operating cost line.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* 2. MACHINERY                                                                                 */
/* ------------------------------------------------------------------------------------------- */

/**
 * A CNC machining centre replacing manual/semi-automatic operations in a Sharjah light-industrial
 * plant.
 *
 *   Equipment        AED 4.20M   Mid-range 5-axis machining centre, delivered UAE.
 *   Installation     AED 0.48M   Foundation, power, commissioning, acceptance testing.
 *   Tooling & spares AED 0.26M   First tool set plus critical spares.
 *   Training         AED 0.09M   Two operators plus a maintenance technician, OEM programme.
 *   Labour saved     AED 0.82M   9,600 hrs/yr (≈ 4.6 FTE on shift) x AED 85/hr fully loaded.
 *   Scrap/rework     AED 0.24M   Reduced first-pass reject rate on higher-tolerance work.
 *   Throughput gain  AED 0.48M   42,000 extra units x AED 11.50 contribution.
 *   Maintenance/power AED 0.31M  OEM service contract plus DEWA/SEWA load.
 *
 * Result: a clean approve. This is the archetype that most often does work - a discrete asset with
 * a well-evidenced labour saving. The live risk is obsolescence: the appraisal runs 8 years
 * against a 10-year engineering life, and the headline KPI is deliberately payback-to-life so the
 * committee sees how much of the asset’s life is consumed simply repaying it.
 */
const MACHINERY_DRIVERS: MachineryDrivers = {
  kind: 'machinery',
  equipmentCost: 4_200_000,
  installationAndCommissioning: 480_000,
  toolingAndSpares: 260_000,
  operatorTraining: 90_000,
  initialSpareStock: 180_000,
  spareStockRecoveryPct: 0.8,
  annualLabourHoursSaved: 9_600,
  fullyLoadedLabourRatePerHour: 85,
  annualScrapAndReworkSaving: 240_000,
  savingsEscalation: 0.03,
  incrementalUnitsPerYear: 42_000,
  contributionPerUnit: 11.5,
  throughputGrowth: 0.04,
  year1MaintenanceAndPower: 310_000,
  maintenanceCostGrowth: 0.035,
  residualValue: 550_000,
  usefulLifeYears: 10,
};

const MACHINERY: ArchetypeConfig<'machinery'> = {
  key: 'machinery',
  label: 'Purchasing New Machinery',
  shortDescription: 'Appraise a discrete production machine against labour, scrap and throughput gains.',
  icon: 'Cog',
  accentColor: '#10b981',
  capexFieldLabels: {
    equipmentCost: 'Equipment purchase price',
    installationAndCommissioning: 'Installation & commissioning',
    toolingAndSpares: 'Tooling & critical spares',
    operatorTraining: 'Operator training',
  },
  benefitFieldLabels: {
    annualLabourHoursSaved: 'Labour hours saved per year',
    fullyLoadedLabourRatePerHour: 'Fully loaded labour rate (AED/hr)',
    annualScrapAndReworkSaving: 'Scrap & rework saving',
    incrementalUnitsPerYear: 'Incremental units per year',
    contributionPerUnit: 'Contribution per unit',
  },
  distinctiveRisk:
    'Technology obsolescence: a successor machine generation can strand the asset well before its engineering life expires, so payback must be recovered early in the life, not late.',
  headlineKpi: {
    label: 'Payback vs useful life',
    format: 'ratio',
    interpretation:
      'Fraction of the asset’s engineering life consumed repaying the investment. Below 0.5 leaves real headroom against obsolescence.',
    compute: (drivers, metrics) => {
      if (metrics.paybackPeriodYears === null || drivers.usefulLifeYears <= 0) return null;
      return metrics.paybackPeriodYears / drivers.usefulLifeYears;
    },
  },
  defaultDrivers: MACHINERY_DRIVERS,
  defaultCommon: {
    projectLifeYears: 8,
    discountRate: 0.115,
    financeRateMIRR: 0.115,
    reinvestmentRateMIRR: 0.115,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'capacity-model',
    'operational-analytics',
    'electricity-estimator',
    'vendor-analysis',
    'approvals',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {
    'real-options':
      'A single machine purchase is not meaningfully stageable - there is no partial commitment that preserves an option to expand.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* 3. NEW PRODUCT                                                                               */
/* ------------------------------------------------------------------------------------------- */

/**
 * A new consumer-durable SKU family launched into UAE and Oman retail.
 *
 *   R&D              AED 2.40M   18 months of a small design/engineering team plus certification.
 *   Tooling & moulds AED 1.80M   Injection tooling and assembly fixtures.
 *   Launch marketing AED 1.20M   Trade loading, retail media and the launch campaign.
 *   Working capital  AED 0.90M   Channel stock and receivables; 85% recovered at wind-down.
 *   Price / variable AED 48 / 28 AED 20 contribution, ~42% - typical for the category.
 *   Price erosion    3% p.a.     Competitive response and channel discounting.
 *   Volume curve     100k -> 215k peak -> 145k  A genuine product life cycle, not a growth rate.
 *   Cannibalisation  15% @ AED 13  Units taken from the company’s own existing range.
 *
 * Result: value destroying at the base case (NPV about -AED 0.55M, IRR ~10.4% against the 13.5%
 * hurdle). This is deliberate and it is the honest answer: on a AED 6.3M outlay the peak-year
 * EBITDA of only ~AED 2.1M arrives in Year 3 and has decayed to ~AED 0.5M by Year 6. The template
 * exists to
 * show that the case only works if peak volume, price erosion or cannibalisation move together -
 * which is precisely the demand-forecast-error risk.
 */
const NEW_PRODUCT_DRIVERS: NewProductDrivers = {
  kind: 'new-product',
  researchAndDevelopment: 2_400_000,
  toolingAndMoulds: 1_800_000,
  launchMarketing: 1_200_000,
  initialStockAndReceivables: 900_000,
  workingCapitalRecoveryPct: 0.85,
  unitsByYear: [100_000, 160_000, 205_000, 215_000, 185_000, 145_000],
  unitSellingPrice: 48,
  unitVariableCost: 28,
  priceErosionPerYear: 0.03,
  cannibalisedUnitsPct: 0.15,
  cannibalisedContributionPerUnit: 13,
  year1IncrementalFixedCost: 950_000,
  fixedCostGrowth: 0.04,
  toolingResidualValue: 220_000,
};

const NEW_PRODUCT: ArchetypeConfig<'new-product'> = {
  key: 'new-product',
  label: 'Introducing a New Product',
  shortDescription: 'Appraise a product launch over its full life cycle, net of cannibalisation.',
  icon: 'Package',
  accentColor: '#f59e0b',
  capexFieldLabels: {
    researchAndDevelopment: 'Research & development',
    toolingAndMoulds: 'Tooling & moulds',
    launchMarketing: 'Launch marketing',
    initialStockAndReceivables: 'Launch stock & receivables (working capital)',
  },
  benefitFieldLabels: {
    unitsByYear: 'Unit volume life cycle',
    unitSellingPrice: 'Unit selling price',
    unitVariableCost: 'Unit variable cost',
    cannibalisedUnitsPct: 'Units cannibalised from existing range %',
  },
  distinctiveRisk:
    'Demand forecast error: the entire case rests on a peak-volume estimate for a product that has never been sold, and the life cycle leaves no time to recover from a miss.',
  headlineKpi: {
    label: 'Breakeven units per year',
    format: 'count',
    interpretation:
      'Annual unit volume at which net contribution covers incremental fixed cost plus depreciation.',
    compute: (drivers, _metrics, schedule) => {
      const netContributionPerUnit =
        drivers.unitSellingPrice -
        drivers.unitVariableCost -
        drivers.cannibalisedUnitsPct * drivers.cannibalisedContributionPerUnit;
      if (netContributionPerUnit <= 0) return null;
      const depreciation = schedule.length > 1 ? schedule[1].depreciation : 0;
      return Math.ceil((drivers.year1IncrementalFixedCost + depreciation) / netContributionPerUnit);
    },
  },
  defaultDrivers: NEW_PRODUCT_DRIVERS,
  defaultCommon: {
    // A launch carries commercial risk well above the group WACC; 13.5% is the standard new-product
    // hurdle premium applied by mid-market consumer businesses in the region.
    projectLifeYears: 6,
    discountRate: 0.135,
    financeRateMIRR: 0.135,
    reinvestmentRateMIRR: 0.135,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'operational-analytics',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {
    'capacity-model': 'Volume is constrained by demand, not by an owned throughput asset.',
    'electricity-estimator': 'No material standalone energy load; utilities sit inside unit variable cost.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* 4. AI PLATFORM                                                                               */
/* ------------------------------------------------------------------------------------------- */

/**
 * A B2B vertical AI platform sold on annual subscriptions to GCC enterprises.
 *
 *   Engineering      AED 4.80M   ~2 years of a 9-person platform team at UAE market rates.
 *   Cloud setup      AED 0.70M   Landing zone, MLOps, observability, security review.
 *   Data licensing   AED 0.90M   Upfront corpus and third-party data rights.
 *   Go-to-market     AED 0.60M   Brand, partner enablement, first-reference programme.
 *   New ARR booked   1.8 -> 6.6M Bookings ramp; recognised at 0.5 (mid-year land dates).
 *   Gross churn      12%         Enterprise SaaS logo churn; better than SMB, worse than infra.
 *   Inference cost   32% -> 26%  of revenue - falls with model efficiency but never disappears.
 *   Run cost         AED 1.90M   Platform engineering, data-licence renewals, support, +6% p.a.
 *   S&M per AED ARR  0.70        AED 0.70 of acquisition spend per AED 1.00 of new ARR.
 *
 * Result: almost exactly breakeven over an 8-year horizon at a 16% venture-style hurdle. This is
 * the single most instructive default in the pack: ARR compounds to over AED 29M and the business
 * still only just earns its cost of capital, because inference cost scales with usage and
 * acquisition spend is recognised years before the revenue it buys. LTV:CAC of about 8.1x
 * (0.68 gross margin / (0.12 churn x 0.70 CAC ratio)) looks excellent in isolation and does not,
 * on its own, rescue the NPV.
 */
const AI_PLATFORM_DRIVERS: AiPlatformDrivers = {
  kind: 'ai-platform',
  engineeringBuildCost: 4_800_000,
  cloudInfrastructureSetup: 700_000,
  dataLicensingUpfront: 900_000,
  goToMarketSetup: 600_000,
  initialWorkingCapital: 800_000,
  workingCapitalRecoveryPct: 0.9,
  newArrByYear: [1_800_000, 3_200_000, 4_600_000, 5_500_000, 6_000_000, 6_300_000, 6_500_000, 6_600_000],
  grossAnnualChurnPct: 0.12,
  revenueRecognitionFactor: 0.5,
  inferenceCostPctOfRevenueByYear: [0.32, 0.3, 0.28, 0.27, 0.26, 0.26, 0.26, 0.26],
  year1PlatformRunCost: 1_900_000,
  platformRunCostGrowth: 0.06,
  salesAndMarketingPerArr: 0.7,
  customerGrossMarginPct: 0.68,
  terminalAssetRecovery: 250_000,
};

const AI_PLATFORM: ArchetypeConfig<'ai-platform'> = {
  key: 'ai-platform',
  label: 'Building an AI Platform',
  shortDescription: 'Appraise a subscription AI platform on ARR net of churn and inference cost.',
  icon: 'BrainCircuit',
  accentColor: '#a855f7',
  capexFieldLabels: {
    engineeringBuildCost: 'Engineering build cost',
    cloudInfrastructureSetup: 'Cloud infrastructure setup',
    dataLicensingUpfront: 'Data licensing (upfront)',
    goToMarketSetup: 'Go-to-market setup',
  },
  benefitFieldLabels: {
    newArrByYear: 'New ARR booked per year',
    grossAnnualChurnPct: 'Gross annual churn %',
    revenueRecognitionFactor: 'Share of new ARR recognised in booking year',
    salesAndMarketingPerArr: 'S&M spend per AED of new ARR (CAC ratio)',
  },
  distinctiveRisk:
    'Inference and infrastructure cost scales with usage rather than being fixed, so gross margin does not expand with volume the way a classical software business would.',
  headlineKpi: {
    label: 'LTV : CAC',
    format: 'ratio',
    interpretation:
      'Customer lifetime gross profit per AED of acquisition spend. Below 3.0x the growth engine is not self-funding.',
    compute: (drivers) => {
      if (drivers.grossAnnualChurnPct <= 0 || drivers.salesAndMarketingPerArr <= 0) return null;
      // LTV = ARR x gross margin / churn; CAC = ARR x S&M ratio. The ARR term cancels.
      return drivers.customerGrossMarginPct / (drivers.grossAnnualChurnPct * drivers.salesAndMarketingPerArr);
    },
  },
  defaultDrivers: AI_PLATFORM_DRIVERS,
  defaultCommon: {
    // Eight years: a subscription base needs time for retained revenue to overtake acquisition
    // spend. 16% reflects technology and execution risk well above the group WACC.
    projectLifeYears: 8,
    discountRate: 0.16,
    financeRateMIRR: 0.16,
    reinvestmentRateMIRR: 0.16,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
  ],
  excludedModules: {
    esg: 'There is no material physical footprint to score; the platform is cloud-hosted and the group ESG return already captures the provider’s emissions.',
    'capacity-model': 'Capacity is elastic cloud compute, procured on demand rather than modelled as a fixed asset.',
    'electricity-estimator': 'Compute energy is billed inside the cloud invoice, already carried in the inference cost line.',
    'vendor-analysis': 'No competitive capital-equipment tender exists for an in-house build.',
    'operational-analytics': 'Delivery performance is tracked as product telemetry, not as a physical operations KPI set.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* 5. FACILITY EXPANSION                                                                        */
/* ------------------------------------------------------------------------------------------- */

/**
 * A production-line extension at an existing KEZAD / Dubai Industrial City plant.
 *
 *   Construction     AED 14.00M  ~ AED 2,800/sqm over 5,000 sqm of light-industrial build.
 *   Equipment        AED 8.50M   Second production line plus materials handling.
 *   Commissioning    AED 1.20M   Validation, trial runs, qualification.
 *   Permitting/design AED 0.80M  Municipality approvals, civil and MEP design.
 *   Working capital  AED 2.20M   Raw material and WIP build for the added line.
 *   Added capacity   900,000 u   Contribution AED 12.50/unit, escalating 2% p.a.
 *   Utilisation ramp 45/70/85/90% Commercial fill rate, not engineering capability.
 *   Delay            3 months    Base-case permitting slippage; removes a quarter of Year 1.
 *
 * Result: clear value creation (NPV comfortably positive over a 10-year asset life). Note the
 * headline KPI is steady-state utilisation, not NPV: an expansion that only ever fills 60% of the
 * capacity it paid for is a different - and much worse - project, and utilisation is the number
 * that most reliably disappoints.
 */
const FACILITY_EXPANSION_DRIVERS: FacilityExpansionDrivers = {
  kind: 'facility-expansion',
  construction: 14_000_000,
  productionEquipment: 8_500_000,
  commissioningAndValidation: 1_200_000,
  permittingAndDesign: 800_000,
  additionalWorkingCapital: 2_200_000,
  workingCapitalRecoveryPct: 0.95,
  incrementalAnnualCapacityUnits: 900_000,
  utilisationRampByYear: [0.45, 0.7, 0.85, 0.9],
  contributionPerUnit: 12.5,
  contributionEscalation: 0.02,
  year1IncrementalFixedCost: 3_200_000,
  fixedCostGrowth: 0.035,
  commissioningDelayMonths: 3,
  residualValue: 4_500_000,
};

const FACILITY_EXPANSION: ArchetypeConfig<'facility-expansion'> = {
  key: 'facility-expansion',
  label: 'Expanding a Production Facility',
  shortDescription: 'Appraise added capacity against a utilisation ramp and construction delay risk.',
  icon: 'Factory',
  accentColor: '#f43f5e',
  capexFieldLabels: {
    construction: 'Construction & civils',
    productionEquipment: 'Production equipment',
    commissioningAndValidation: 'Commissioning & validation',
    permittingAndDesign: 'Permitting & design',
    additionalWorkingCapital: 'Additional working capital',
  },
  benefitFieldLabels: {
    incrementalAnnualCapacityUnits: 'Incremental annual capacity (units)',
    utilisationRampByYear: 'Capacity utilisation ramp',
    contributionPerUnit: 'Contribution per unit',
    commissioningDelayMonths: 'Permitting / construction delay (months)',
  },
  distinctiveRisk:
    'Permitting and construction delay: every month of slippage removes a month of contribution from the highest-value early years while the full capital cost has already been committed.',
  headlineKpi: {
    label: 'Steady-state capacity utilisation',
    format: 'percent',
    interpretation:
      'The utilisation the case assumes it will reach. Capacity paid for but never filled is the classic expansion failure.',
    compute: (drivers) => {
      if (drivers.utilisationRampByYear.length === 0) return null;
      return Math.max(...drivers.utilisationRampByYear);
    },
  },
  defaultDrivers: FACILITY_EXPANSION_DRIVERS,
  defaultCommon: {
    projectLifeYears: 10,
    discountRate: 0.115,
    financeRateMIRR: 0.115,
    reinvestmentRateMIRR: 0.115,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'capacity-model',
    'operational-analytics',
    'electricity-estimator',
    'vendor-analysis',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {},
};

/* ------------------------------------------------------------------------------------------- */
/* 6. ONLINE SERVICE                                                                            */
/* ------------------------------------------------------------------------------------------- */

/**
 * A paid consumer subscription service (≈ AED 15/month) launched across the GCC.
 *
 *   Platform build   AED 3.60M   Apps, backend, payments, ~12 months of a product team.
 *   Launch marketing AED 2.40M   Regional launch campaign and influencer programme.
 *   Content & ops    AED 0.50M   Content licensing, support tooling, trust & safety setup.
 *   New users        30k -> 32k  A mature acquisition profile, not a hyper-growth curve.
 *   ARPU             AED 178/yr  ≈ AED 14.80/month, +4% p.a.
 *   Retention        72%         Annual survival of the opening base.
 *   CAC              AED 120     Blended, inflating 10% p.a. - the distinctive risk.
 *   Variable cost    20%         Payment fees, CDN, streaming/serving, support.
 *   Fixed platform   AED 1.80M   Product and engineering run-rate, +6% p.a.
 *
 * Result: value destroying (NPV about -AED 1.5M on a AED 6.9M outlay, IRR ~14.0% against an 18%
 * hurdle). The unit economics look respectable in isolation - LTV of roughly AED 508
 * (178 x 0.80 / 0.28 churn) against a Year-1 CAC of AED 120, a CAC payback of about 10 months -
 * and the case still fails, because acquisition spend is incurred years before the retained
 * revenue it buys and CAC inflation erodes the spread every year. Flatten CAC inflation and the
 * case flips: that is precisely the sensitivity the board should be shown.
 */
const ONLINE_SERVICE_DRIVERS: OnlineServiceDrivers = {
  kind: 'online-service',
  platformBuild: 3_600_000,
  launchMarketing: 2_400_000,
  contentAndOpsSetup: 500_000,
  initialWorkingCapital: 400_000,
  workingCapitalRecoveryPct: 0.8,
  newUsersByYear: [30_000, 40_000, 42_000, 40_000, 36_000, 32_000],
  annualRetentionPct: 0.72,
  annualArpu: 178,
  arpuGrowth: 0.04,
  year1CacPerUser: 120,
  cacInflation: 0.1,
  variableServiceCostPctOfRevenue: 0.2,
  year1FixedPlatformCost: 1_800_000,
  fixedCostGrowth: 0.06,
  contributionMarginPct: 0.8,
  terminalAssetRecovery: 200_000,
};

const ONLINE_SERVICE: ArchetypeConfig<'online-service'> = {
  key: 'online-service',
  label: 'Launching an Online Service',
  shortDescription: 'Appraise a consumer digital service on user acquisition, ARPU and retention.',
  icon: 'Globe',
  accentColor: '#38bdf8',
  capexFieldLabels: {
    platformBuild: 'Platform build',
    launchMarketing: 'Launch marketing',
    contentAndOpsSetup: 'Content & operations setup',
    initialWorkingCapital: 'Initial working capital',
  },
  benefitFieldLabels: {
    newUsersByYear: 'New users acquired per year',
    annualArpu: 'Annual revenue per user (ARPU)',
    annualRetentionPct: 'Annual retention %',
    year1CacPerUser: 'Year-1 customer acquisition cost',
  },
  distinctiveRisk:
    'CAC inflation: paid acquisition gets steadily more expensive as the cheapest audience is exhausted, so the spread between lifetime value and acquisition cost narrows every year.',
  headlineKpi: {
    label: 'CAC payback',
    format: 'months',
    interpretation:
      'Months of contribution needed to repay the cost of acquiring one user. Under 12 months is the consumer-subscription benchmark.',
    compute: (drivers) => {
      const monthlyContribution = (drivers.annualArpu * drivers.contributionMarginPct) / 12;
      if (monthlyContribution <= 0) return null;
      return drivers.year1CacPerUser / monthlyContribution;
    },
  },
  defaultDrivers: ONLINE_SERVICE_DRIVERS,
  defaultCommon: {
    projectLifeYears: 6,
    discountRate: 0.18,
    financeRateMIRR: 0.18,
    reinvestmentRateMIRR: 0.18,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
  ],
  excludedModules: {
    esg: 'No material physical footprint; the group ESG return already captures cloud-provider emissions.',
    'capacity-model': 'Capacity is elastic cloud infrastructure, not a modelled physical throughput asset.',
    'electricity-estimator': 'Energy is billed inside hosting cost, already carried in the variable service cost line.',
    'vendor-analysis': 'No competitive capital-equipment tender exists for an in-house platform build.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* 7. AUTOMATION - THE NOVARETAIL REGRESSION CASE                                               */
/* ------------------------------------------------------------------------------------------- */

/**
 * NovaRetail GCC automated micro-fulfilment centre, Dubai.
 *
 * ================================ DO NOT RETUNE ================================
 * These are the published NovaRetail assumptions. `buildAnnualFCF` must map them onto
 * `DEFAULT_FINANCIAL_ASSUMPTIONS` field for field, and the resulting free-cash-flow schedule is
 * pinned by `tests/golden.test.ts` and reproduced verbatim in the board report, the deck and the
 * board PDF. Changing any number below invalidates all of those documents.
 *
 *   Equipment            AED 18,000,000  Goods-to-person robotics, ASRS shuttles, conveyors.
 *   Systems integration  AED  2,500,000  Mechanical install, electrical commissioning, WMS/ERP.
 *   Software & cyber     AED  1,200,000  WCS licences and cybersecurity hardening.
 *   Training & transition AED   300,000  Retraining, simulation, go-live support.
 *   Working capital      AED  2,000,000  Safety stock; fully recovered in Year 6.
 *
 *   Labour displaced     45 roles x AED 120,000 fully loaded  = AED 5,400,000
 *   Error/waste saving                                        = AED 2,100,000
 *                                    Year-1 savings line      = AED 7,500,000  (+4% p.a.)
 *   Throughput uplift    500,000 orders x AED 5.00 contribution = AED 2,500,000 (+5% p.a.)
 *   Run cost             AED 2,200,000 (+3% p.a.)
 *   Salvage              AED 2,000,000 in Year 6
 * ===============================================================================
 *
 * Result: NPV AED 12,083,628, IRR 26.30%, MIRR 19.34%, PI 1.5035, payback 3.10 years, Approve.
 */
const AUTOMATION_DRIVERS: AutomationDrivers = {
  kind: 'automation',
  automationEquipment: 18_000_000,
  systemsIntegration: 2_500_000,
  softwareAndCybersecurity: 1_200_000,
  trainingAndWorkforceTransition: 300_000,
  initialWorkingCapital: 2_000_000,
  workingCapitalRecovery: 2_000_000,
  rolesDisplaced: 45,
  fullyLoadedCostPerRole: 120_000,
  errorAndWasteSaving: 2_100_000,
  savingsEscalation: 0.04,
  incrementalThroughputUnits: 500_000,
  contributionPerUnit: 5,
  throughputGrowth: 0.05,
  year1RunCost: 2_200_000,
  runCostGrowth: 0.03,
  salvageValue: 2_000_000,
  // Pre-automation baseline used only by the headline KPI: 6.0M orders at AED 4.10 all-in cost.
  baselineUnitsPerYear: 6_000_000,
  baselineCostPerUnit: 4.1,
};

const AUTOMATION: ArchetypeConfig<'automation'> = {
  key: 'automation',
  label: 'Installing Automation Technology',
  shortDescription: 'Appraise robotics or process automation against labour, waste and throughput.',
  icon: 'CircuitBoard',
  accentColor: '#67e8f9',
  capexFieldLabels: {
    automationEquipment: 'Automation equipment',
    systemsIntegration: 'Installation & systems integration',
    softwareAndCybersecurity: 'Software & cybersecurity',
    trainingAndWorkforceTransition: 'Training & workforce transition',
    initialWorkingCapital: 'Initial working capital',
  },
  benefitFieldLabels: {
    rolesDisplaced: 'Roles displaced',
    fullyLoadedCostPerRole: 'Fully loaded cost per role',
    errorAndWasteSaving: 'Error & waste elimination',
    incrementalThroughputUnits: 'Incremental throughput (units)',
    contributionPerUnit: 'Contribution per unit',
  },
  distinctiveRisk:
    'Workforce transition: redeployment, reskilling and severance obligations are incurred with certainty up front while the labour saving only materialises if the redesigned process actually holds.',
  headlineKpi: {
    label: 'Cost per unit reduction',
    format: 'percent',
    interpretation:
      'Reduction in all-in cost per unit handled after automation, including the new run cost and the extra volume.',
    compute: (drivers) => {
      if (drivers.baselineUnitsPerYear <= 0 || drivers.baselineCostPerUnit <= 0) return null;
      const baselineTotalCost = drivers.baselineUnitsPerYear * drivers.baselineCostPerUnit;
      const year1Saving =
        drivers.rolesDisplaced * drivers.fullyLoadedCostPerRole + drivers.errorAndWasteSaving;
      const postTotalCost = baselineTotalCost - year1Saving + drivers.year1RunCost;
      const postUnits = drivers.baselineUnitsPerYear + drivers.incrementalThroughputUnits;
      if (postUnits <= 0) return null;
      return 1 - postTotalCost / postUnits / drivers.baselineCostPerUnit;
    },
  },
  defaultDrivers: AUTOMATION_DRIVERS,
  defaultCommon: {
    // Must match DEFAULT_FINANCIAL_ASSUMPTIONS exactly - see the regression test.
    projectLifeYears: 6,
    discountRate: 0.115,
    financeRateMIRR: 0.115,
    reinvestmentRateMIRR: 0.115,
    corporateTaxRate: 0.09,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'capacity-model',
    'operational-analytics',
    'electricity-estimator',
    'vendor-analysis',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {},
};

/* ------------------------------------------------------------------------------------------- */
/* 8. MARKET ENTRY                                                                              */
/* ------------------------------------------------------------------------------------------- */

/**
 * Entering the Saudi market from a UAE base.
 *
 *   Licensing        AED 1.50M   MISA investment licence, CR, trademark and IP registration.
 *   Local setup      AED 2.80M   Riyadh office, regional HQ compliance, first hires, fit-out.
 *   Entry marketing  AED 3.20M   Two-year brand-establishment campaign.
 *   Regulatory       AED 0.90M   Saudisation, ZATCA e-invoicing, product homologation.
 *   Working capital  AED 2.50M   Local stock and receivables at longer local payment terms.
 *   Addressable mkt  AED 900M    Category SAM, growing 6% p.a.
 *   Share capture    0.7% -> 4.8% A six-year beachhead curve from a standing start.
 *   Contribution     26%         After local landed cost and channel margin.
 *   FX/repatriation  4%          Currency, withholding and transfer friction on repatriation.
 *   Local fixed cost AED 4.20M   Local team, warehousing, compliance, +5% p.a.
 *   Tax              20%         Saudi corporate income tax, not the UAE 9%.
 *
 * Result: value destroying inside a 6-year window (NPV about -AED 2.2M, IRR ~10.7% against a 15%
 * hurdle). Years 1 and 2 run at a loss while the full local fixed-cost base is carried against
 * under 2% share, and the country-risk-adjusted discount rate heavily penalises the back-loaded
 * recovery. The template’s point is that market entry is a real option, not a straight NPV: the
 * beachhead has to be bought, and most of the value sits beyond the appraisal horizon. That is why
 * `real-options` is in this archetype’s relevant-module list.
 */
const MARKET_ENTRY_DRIVERS: MarketEntryDrivers = {
  kind: 'market-entry',
  licensingAndRegistration: 1_500_000,
  localSetupAndOffice: 2_800_000,
  entryMarketingCampaign: 3_200_000,
  regulatoryAndComplianceSetup: 900_000,
  localWorkingCapital: 2_500_000,
  workingCapitalRecoveryPct: 0.85,
  addressableMarketAed: 900_000_000,
  marketGrowthPct: 0.06,
  marketShareByYear: [0.007, 0.017, 0.028, 0.037, 0.043, 0.048],
  contributionMarginPct: 0.26,
  fxAndRepatriationHaircutPct: 0.04,
  year1LocalFixedCost: 4_200_000,
  localCostGrowth: 0.05,
  exitAssetRecovery: 500_000,
};

const MARKET_ENTRY: ArchetypeConfig<'market-entry'> = {
  key: 'market-entry',
  label: 'Entering a New Market',
  shortDescription: 'Appraise a new-geography entry on a market-share capture curve.',
  icon: 'Map',
  accentColor: '#0284c7',
  capexFieldLabels: {
    licensingAndRegistration: 'Licensing & registration',
    localSetupAndOffice: 'Local setup & office',
    entryMarketingCampaign: 'Market entry campaign',
    regulatoryAndComplianceSetup: 'Regulatory & compliance setup',
    localWorkingCapital: 'Local working capital',
  },
  benefitFieldLabels: {
    addressableMarketAed: 'Serviceable addressable market',
    marketShareByYear: 'Market share capture curve',
    contributionMarginPct: 'Local contribution margin %',
    fxAndRepatriationHaircutPct: 'FX & repatriation haircut %',
  },
  distinctiveRisk:
    'FX, regulatory and political risk: contribution is earned in a foreign currency under a different regulatory and tax regime, and localisation rules can change the cost base after the capital is committed.',
  headlineKpi: {
    label: 'Time to breakeven market share',
    format: 'years',
    interpretation:
      'Years until captured share generates enough contribution to cover the local fixed cost base.',
    compute: (_drivers, _metrics, schedule) => {
      const operating = schedule.slice(1);
      for (let i = 0; i < operating.length; i++) {
        if (operating[i].ebitda >= 0) {
          if (i === 0) return operating[0].year;
          const previous = operating[i - 1].ebitda;
          const current = operating[i].ebitda;
          const span = current - previous;
          // Linear interpolation across the year in which EBITDA crosses zero.
          const fraction = span === 0 ? 0 : -previous / span;
          return operating[i - 1].year + fraction;
        }
      }
      return null;
    },
  },
  defaultDrivers: MARKET_ENTRY_DRIVERS,
  defaultCommon: {
    projectLifeYears: 6,
    // Group WACC plus a country-risk premium for operating outside the home jurisdiction.
    discountRate: 0.15,
    financeRateMIRR: 0.15,
    reinvestmentRateMIRR: 0.15,
    // Saudi corporate income tax on the foreign-owned entity, not the UAE 9% headline rate.
    corporateTaxRate: 0.2,
  },
  relevantModules: [
    'scenarios',
    'sensitivity',
    'monte-carlo',
    'portfolio',
    'strategic-scorecard',
    'operational-analytics',
    'approvals',
    'real-options',
    'funding',
    'benefits-tracker',
    'implementation-plan',
    'csv-management',
    'external-data',
    'esg',
  ],
  excludedModules: {
    'capacity-model': 'Entry is commercial rather than asset-based; there is no owned throughput capacity to model.',
    'electricity-estimator': 'The DEWA tariff model is UAE-specific and does not apply to the entry geography.',
    'vendor-analysis': 'No capital-equipment tender; the spend is licensing, people and marketing.',
  },
};

/* ------------------------------------------------------------------------------------------- */
/* Registry                                                                                     */
/* ------------------------------------------------------------------------------------------- */

/** Every archetype config, keyed by archetype. */
export const ARCHETYPE_CONFIGS: ArchetypeConfigRegistry = {
  'new-branch': NEW_BRANCH,
  machinery: MACHINERY,
  'new-product': NEW_PRODUCT,
  'ai-platform': AI_PLATFORM,
  'facility-expansion': FACILITY_EXPANSION,
  'online-service': ONLINE_SERVICE,
  automation: AUTOMATION,
  'market-entry': MARKET_ENTRY,
};

/** Narrow accessor that preserves the per-archetype driver type. */
export function getArchetypeConfig<K extends ProjectArchetype>(key: K): ArchetypeConfig<K> {
  return ARCHETYPE_CONFIGS[key];
}

/** Configs in picker order, as a discriminated union for iteration in UI code. */
export const ARCHETYPE_CONFIG_LIST: AnyArchetypeConfig[] = [
  NEW_BRANCH,
  MACHINERY,
  NEW_PRODUCT,
  AI_PLATFORM,
  FACILITY_EXPANSION,
  ONLINE_SERVICE,
  AUTOMATION,
  MARKET_ENTRY,
];

/* ------------------------------------------------------------------------------------------- */
/* Headline KPI dispatch                                                                        */
/* ------------------------------------------------------------------------------------------- */

/** A resolved headline KPI ready for display. */
export interface ResolvedHeadlineKpi {
  label: string;
  format: KpiFormat;
  interpretation: string;
  /** Null when the KPI is undefined for these inputs (e.g. no payback inside the horizon). */
  value: number | null;
}

/**
 * Computes the headline KPI for whichever archetype the drivers belong to.
 *
 * The explicit switch is not boilerplate for its own sake: `headlineKpi.compute` accepts drivers
 * as a parameter, and function parameters are contravariant, so the union of configs cannot be
 * called generically without either narrowing like this or casting. Narrowing keeps it type-safe
 * and makes a missing archetype a compile error via the `never` guard.
 */
export function computeHeadlineKpi(
  drivers: ArchetypeDrivers,
  metrics: FinancialMetrics,
  schedule: readonly YearlyCashFlow[],
): ResolvedHeadlineKpi {
  switch (drivers.kind) {
    case 'new-branch':
      return resolve(NEW_BRANCH, drivers, metrics, schedule);
    case 'machinery':
      return resolve(MACHINERY, drivers, metrics, schedule);
    case 'new-product':
      return resolve(NEW_PRODUCT, drivers, metrics, schedule);
    case 'ai-platform':
      return resolve(AI_PLATFORM, drivers, metrics, schedule);
    case 'facility-expansion':
      return resolve(FACILITY_EXPANSION, drivers, metrics, schedule);
    case 'online-service':
      return resolve(ONLINE_SERVICE, drivers, metrics, schedule);
    case 'automation':
      return resolve(AUTOMATION, drivers, metrics, schedule);
    case 'market-entry':
      return resolve(MARKET_ENTRY, drivers, metrics, schedule);
    default: {
      const unreachable: never = drivers;
      throw new Error(`computeHeadlineKpi: unknown archetype ${JSON.stringify(unreachable)}`);
    }
  }
}

function resolve<K extends ProjectArchetype>(
  config: ArchetypeConfig<K>,
  drivers: DriversFor<K>,
  metrics: FinancialMetrics,
  schedule: readonly YearlyCashFlow[],
): ResolvedHeadlineKpi {
  return {
    label: config.headlineKpi.label,
    format: config.headlineKpi.format,
    interpretation: config.headlineKpi.interpretation,
    value: config.headlineKpi.compute(drivers, metrics, schedule),
  };
}
