/**
 * ARCHETYPE -> ENGINE ADAPTER
 * ===========================
 *
 * `buildAnnualFCF` is the ONLY archetype-aware piece of maths in the codebase. It turns an
 * archetype's business drivers into the `FinancialAssumptions` contract that the existing,
 * audited engine (`cashflow.ts` -> `metrics.ts`) already consumes. It computes no NPV, no IRR and
 * no tax: every one of those stays in the engine, unmodified.
 *
 * HOW A NON-GEOMETRIC BENEFIT LINE IS EXPRESSED
 * ---------------------------------------------
 * The engine models each line as `year1Value * (1 + growth)^(year-1)`. Ramp curves, churn-adjusted
 * ARR, product life cycles and market-share capture are not geometric. Rather than fork the
 * engine, an archetype supplies an `AnnualBenefitProfile`: a per-year INDEX that multiplies the
 * year-1 field (see `src/lib/types/finance.ts`). Because the profile is relative rather than
 * absolute, scenario multipliers and sensitivity sweeps on the year-1 fields still scale the whole
 * curve correctly, with no change to `scenarios.ts` or `sensitivity.ts`.
 *
 * TWO ARCHETYPES DELIBERATELY EMIT NO PROFILE
 * -------------------------------------------
 * `automation` and `machinery` have genuinely geometric benefit lines (labour savings escalating
 * with wages; throughput contribution growing with volume). They are therefore expressed in the
 * engine's native year-1 + growth form. For `automation` this is not merely tidy - it is what
 * guarantees the NovaRetail micro-fulfilment case reproduces bit-for-bit, because no
 * divide-then-multiply round trip is introduced anywhere in its path.
 */

import type { AnnualBenefitProfile, FinancialAssumptions } from '../types/finance';
import type {
  AiPlatformDrivers,
  ArchetypeDrivers,
  AutomationDrivers,
  CommonInputs,
  DriversFor,
  FacilityExpansionDrivers,
  MachineryDrivers,
  MarketEntryDrivers,
  NewBranchDrivers,
  NewProductDrivers,
  OnlineServiceDrivers,
  ProjectArchetype,
} from './types';

/* ------------------------------------------------------------------------------------------- */
/* Internal helpers                                                                             */
/* ------------------------------------------------------------------------------------------- */

/** The three annual lines the engine consumes, in absolute AED, element 0 = Year 1. */
interface AnnualLines {
  /** Cost-savings benefit line (maps to `year1OperatingSavings`). */
  savings: number[];
  /** Revenue/contribution benefit line (maps to `year1ContributionMargin`). */
  margin: number[];
  /** Incremental operating cost line (maps to `year1AdditionalOpEx`). */
  opex: number[];
}

/** Number of whole operating years the engine will actually schedule. */
function operatingYears(common: CommonInputs): number {
  return Math.max(1, Math.round(common.projectLifeYears));
}

/**
 * Reads `curve[i]`, holding the last supplied value once the curve is exhausted. Archetype
 * curves are authored for a typical horizon; the user may lengthen the project life afterwards
 * and must not fall off the end of the array into `undefined`.
 */
function atOrLast(curve: readonly number[], index: number): number {
  if (curve.length === 0) return 0;
  if (index < 0) return curve[0];
  return index < curve.length ? curve[index] : curve[curve.length - 1];
}

/**
 * Converts an absolute AED series into the engine's (year-1 anchor, per-year index) pair.
 *
 * The anchor is the first non-zero element rather than simply element 0, so a profile whose first
 * year is a pure build/permitting year (zero benefit) still produces a finite, meaningful index
 * instead of dividing by zero.
 */
function toIndexedLine(values: readonly number[]): { year1Value: number; index: number[] } {
  const anchor = values.find((v) => Math.abs(v) > 1e-9);
  if (anchor === undefined) {
    return { year1Value: 0, index: values.map(() => 0) };
  }
  return { year1Value: anchor, index: values.map((v) => v / anchor) };
}

/**
 * Compound annual growth rate implied by a series, used only to populate the engine's `growth`
 * fields for display/audit purposes. The supplied index always takes precedence in the maths.
 */
function impliedCagr(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return 0;
  return Math.pow(last / first, 1 / (values.length - 1)) - 1;
}

/**
 * Assembles the engine input from capex buckets, terminal values and the three annual lines.
 *
 * Each line is emitted as `year-1 anchor + index`. Where a line is exactly geometric the caller
 * should use `assembleGeometric` instead, which emits no index at all.
 */
function assembleIndexed(input: {
  capex: {
    automationEquipment: number;
    installationIntegration: number;
    softwareCybersecurity: number;
    trainingLaunch: number;
  };
  initialWorkingCapital: number;
  workingCapitalRecovery: number;
  salvageValue: number;
  lines: AnnualLines;
  common: CommonInputs;
}): FinancialAssumptions {
  const savings = toIndexedLine(input.lines.savings);
  const margin = toIndexedLine(input.lines.margin);
  const opex = toIndexedLine(input.lines.opex);

  const profile: AnnualBenefitProfile = {
    operatingSavingsIndex: savings.index,
    contributionMarginIndex: margin.index,
    additionalOpExIndex: opex.index,
  };

  return {
    automationEquipment: input.capex.automationEquipment,
    installationIntegration: input.capex.installationIntegration,
    softwareCybersecurity: input.capex.softwareCybersecurity,
    trainingLaunch: input.capex.trainingLaunch,
    initialWorkingCapital: input.initialWorkingCapital,

    projectLifeYears: input.common.projectLifeYears,

    year1OperatingSavings: savings.year1Value,
    // Display/audit value only - `annualBenefitProfile` governs the actual schedule.
    annualSavingsGrowth: impliedCagr(input.lines.savings),
    year1ContributionMargin: margin.year1Value,
    annualMarginGrowth: impliedCagr(input.lines.margin),

    year1AdditionalOpEx: opex.year1Value,
    annualOpExGrowth: impliedCagr(input.lines.opex),

    discountRate: input.common.discountRate,
    financeRateMIRR: input.common.financeRateMIRR,
    reinvestmentRateMIRR: input.common.reinvestmentRateMIRR,
    corporateTaxRate: input.common.corporateTaxRate,

    salvageValue: input.salvageValue,
    workingCapitalRecovery: input.workingCapitalRecovery,

    annualBenefitProfile: profile,
  };
}

/* ------------------------------------------------------------------------------------------- */
/* 1. New branch                                                                                */
/* ------------------------------------------------------------------------------------------- */

function buildNewBranch(d: NewBranchDrivers, common: CommonInputs): FinancialAssumptions {
  const years = operatingYears(common);
  const rampYears = d.revenueRampByYear.length;

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  for (let y = 1; y <= years; y++) {
    // Ramp to steady state, then like-for-like growth once the ramp curve is exhausted.
    const rampFactor = atOrLast(d.revenueRampByYear, y - 1);
    const matureYears = Math.max(0, y - rampYears);
    const revenue =
      d.steadyStateAnnualRevenue * rampFactor * Math.pow(1 + d.matureRevenueGrowth, matureYears);

    // Only the portion NOT transferred from existing branches is incremental to the group.
    const incrementalGrossMargin = revenue * d.grossMarginPct * (1 - d.cannibalisationPct);

    savings.push(0);
    margin.push(incrementalGrossMargin);
    opex.push(d.year1BranchOperatingCost * Math.pow(1 + d.branchOperatingCostGrowth, y - 1));
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.leaseholdFitOut,
      installationIntegration: d.branchEquipmentAndIt,
      softwareCybersecurity: 0,
      trainingLaunch: d.preOpeningCosts,
    },
    initialWorkingCapital: d.openingInventory,
    workingCapitalRecovery: d.openingInventory * d.inventoryRecoveryPct,
    salvageValue: d.fitOutResidualValue,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* 2. Machinery (geometric - no index emitted)                                                  */
/* ------------------------------------------------------------------------------------------- */

function buildMachinery(d: MachineryDrivers, common: CommonInputs): FinancialAssumptions {
  const year1LabourAndScrap =
    d.annualLabourHoursSaved * d.fullyLoadedLabourRatePerHour + d.annualScrapAndReworkSaving;
  const year1Throughput = d.incrementalUnitsPerYear * d.contributionPerUnit;

  return {
    automationEquipment: d.equipmentCost,
    installationIntegration: d.installationAndCommissioning,
    softwareCybersecurity: d.toolingAndSpares,
    trainingLaunch: d.operatorTraining,
    initialWorkingCapital: d.initialSpareStock,

    projectLifeYears: common.projectLifeYears,

    year1OperatingSavings: year1LabourAndScrap,
    annualSavingsGrowth: d.savingsEscalation,
    year1ContributionMargin: year1Throughput,
    annualMarginGrowth: d.throughputGrowth,

    year1AdditionalOpEx: d.year1MaintenanceAndPower,
    annualOpExGrowth: d.maintenanceCostGrowth,

    discountRate: common.discountRate,
    financeRateMIRR: common.financeRateMIRR,
    reinvestmentRateMIRR: common.reinvestmentRateMIRR,
    corporateTaxRate: common.corporateTaxRate,

    salvageValue: d.residualValue,
    workingCapitalRecovery: d.initialSpareStock * d.spareStockRecoveryPct,
  };
}

/* ------------------------------------------------------------------------------------------- */
/* 3. New product                                                                               */
/* ------------------------------------------------------------------------------------------- */

function buildNewProduct(d: NewProductDrivers, common: CommonInputs): FinancialAssumptions {
  const years = operatingYears(common);

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  for (let y = 1; y <= years; y++) {
    const units = atOrLast(d.unitsByYear, y - 1);
    const realisedPrice = d.unitSellingPrice * Math.pow(1 - d.priceErosionPerYear, y - 1);
    const grossContribution = units * (realisedPrice - d.unitVariableCost);
    // Units taken from the company's own existing range destroy the contribution they used to earn.
    const cannibalisationLoss =
      units * d.cannibalisedUnitsPct * d.cannibalisedContributionPerUnit;

    savings.push(0);
    margin.push(grossContribution - cannibalisationLoss);
    opex.push(d.year1IncrementalFixedCost * Math.pow(1 + d.fixedCostGrowth, y - 1));
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.toolingAndMoulds,
      installationIntegration: d.researchAndDevelopment,
      softwareCybersecurity: 0,
      trainingLaunch: d.launchMarketing,
    },
    initialWorkingCapital: d.initialStockAndReceivables,
    workingCapitalRecovery: d.initialStockAndReceivables * d.workingCapitalRecoveryPct,
    salvageValue: d.toolingResidualValue,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* 4. AI platform                                                                               */
/* ------------------------------------------------------------------------------------------- */

function buildAiPlatform(d: AiPlatformDrivers, common: CommonInputs): FinancialAssumptions {
  const years = operatingYears(common);

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  let openingArr = 0;

  for (let y = 1; y <= years; y++) {
    const newArr = atOrLast(d.newArrByYear, y - 1);
    const retainedArr = openingArr * (1 - d.grossAnnualChurnPct);

    // Retained base is billed for the full year; new bookings land through the year.
    const revenue = retainedArr + newArr * d.revenueRecognitionFactor;
    const closingArr = retainedArr + newArr;

    const inferencePct = atOrLast(d.inferenceCostPctOfRevenueByYear, y - 1);
    const runCost = d.year1PlatformRunCost * Math.pow(1 + d.platformRunCostGrowth, y - 1);
    // Acquisition spend scales with bookings, not with revenue - this is what defers CAC payback.
    const acquisitionSpend = newArr * d.salesAndMarketingPerArr;

    savings.push(0);
    margin.push(revenue);
    opex.push(revenue * inferencePct + runCost + acquisitionSpend);

    openingArr = closingArr;
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.engineeringBuildCost,
      installationIntegration: d.cloudInfrastructureSetup,
      softwareCybersecurity: d.dataLicensingUpfront,
      trainingLaunch: d.goToMarketSetup,
    },
    initialWorkingCapital: d.initialWorkingCapital,
    workingCapitalRecovery: d.initialWorkingCapital * d.workingCapitalRecoveryPct,
    salvageValue: d.terminalAssetRecovery,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* 5. Facility expansion                                                                        */
/* ------------------------------------------------------------------------------------------- */

function buildFacilityExpansion(
  d: FacilityExpansionDrivers,
  common: CommonInputs,
): FinancialAssumptions {
  const years = operatingYears(common);
  // Permitting/construction slippage removes productive months from the first operating year.
  const year1AvailableFraction = Math.max(0, 1 - d.commissioningDelayMonths / 12);

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  for (let y = 1; y <= years; y++) {
    const utilisation = atOrLast(d.utilisationRampByYear, y - 1);
    const availability = y === 1 ? year1AvailableFraction : 1;
    const unitsSold = d.incrementalAnnualCapacityUnits * utilisation * availability;
    const unitContribution = d.contributionPerUnit * Math.pow(1 + d.contributionEscalation, y - 1);

    savings.push(0);
    margin.push(unitsSold * unitContribution);
    opex.push(d.year1IncrementalFixedCost * Math.pow(1 + d.fixedCostGrowth, y - 1));
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.productionEquipment,
      installationIntegration: d.construction,
      softwareCybersecurity: d.commissioningAndValidation,
      trainingLaunch: d.permittingAndDesign,
    },
    initialWorkingCapital: d.additionalWorkingCapital,
    workingCapitalRecovery: d.additionalWorkingCapital * d.workingCapitalRecoveryPct,
    salvageValue: d.residualValue,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* 6. Online service                                                                            */
/* ------------------------------------------------------------------------------------------- */

function buildOnlineService(d: OnlineServiceDrivers, common: CommonInputs): FinancialAssumptions {
  const years = operatingYears(common);

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  let openingUsers = 0;

  for (let y = 1; y <= years; y++) {
    const newUsers = atOrLast(d.newUsersByYear, y - 1);
    const retainedUsers = openingUsers * d.annualRetentionPct;
    // New users join through the year, so on average only half of them are billed in year y.
    const averageActiveUsers = retainedUsers + newUsers * 0.5;

    const arpu = d.annualArpu * Math.pow(1 + d.arpuGrowth, y - 1);
    const revenue = averageActiveUsers * arpu;

    const cac = d.year1CacPerUser * Math.pow(1 + d.cacInflation, y - 1);
    const fixedCost = d.year1FixedPlatformCost * Math.pow(1 + d.fixedCostGrowth, y - 1);

    savings.push(0);
    margin.push(revenue);
    opex.push(revenue * d.variableServiceCostPctOfRevenue + newUsers * cac + fixedCost);

    openingUsers = retainedUsers + newUsers;
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.platformBuild,
      installationIntegration: d.contentAndOpsSetup,
      softwareCybersecurity: 0,
      trainingLaunch: d.launchMarketing,
    },
    initialWorkingCapital: d.initialWorkingCapital,
    workingCapitalRecovery: d.initialWorkingCapital * d.workingCapitalRecoveryPct,
    salvageValue: d.terminalAssetRecovery,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* 7. Automation (geometric - no index emitted; the NovaRetail regression path)                  */
/* ------------------------------------------------------------------------------------------- */

function buildAutomation(d: AutomationDrivers, common: CommonInputs): FinancialAssumptions {
  const year1LabourAndWasteSaving =
    d.rolesDisplaced * d.fullyLoadedCostPerRole + d.errorAndWasteSaving;
  const year1ThroughputContribution = d.incrementalThroughputUnits * d.contributionPerUnit;

  return {
    automationEquipment: d.automationEquipment,
    installationIntegration: d.systemsIntegration,
    softwareCybersecurity: d.softwareAndCybersecurity,
    trainingLaunch: d.trainingAndWorkforceTransition,
    initialWorkingCapital: d.initialWorkingCapital,

    projectLifeYears: common.projectLifeYears,

    year1OperatingSavings: year1LabourAndWasteSaving,
    annualSavingsGrowth: d.savingsEscalation,
    year1ContributionMargin: year1ThroughputContribution,
    annualMarginGrowth: d.throughputGrowth,

    year1AdditionalOpEx: d.year1RunCost,
    annualOpExGrowth: d.runCostGrowth,

    discountRate: common.discountRate,
    financeRateMIRR: common.financeRateMIRR,
    reinvestmentRateMIRR: common.reinvestmentRateMIRR,
    corporateTaxRate: common.corporateTaxRate,

    salvageValue: d.salvageValue,
    workingCapitalRecovery: d.workingCapitalRecovery,
  };
}

/* ------------------------------------------------------------------------------------------- */
/* 8. Market entry                                                                              */
/* ------------------------------------------------------------------------------------------- */

function buildMarketEntry(d: MarketEntryDrivers, common: CommonInputs): FinancialAssumptions {
  const years = operatingYears(common);

  const savings: number[] = [];
  const margin: number[] = [];
  const opex: number[] = [];

  for (let y = 1; y <= years; y++) {
    const market = d.addressableMarketAed * Math.pow(1 + d.marketGrowthPct, y - 1);
    const share = atOrLast(d.marketShareByYear, y - 1);
    const localRevenue = market * share;
    // FX, withholding and transfer friction on contribution repatriated to the home entity.
    const repatriatedContribution =
      localRevenue * d.contributionMarginPct * (1 - d.fxAndRepatriationHaircutPct);

    savings.push(0);
    margin.push(repatriatedContribution);
    opex.push(d.year1LocalFixedCost * Math.pow(1 + d.localCostGrowth, y - 1));
  }

  return assembleIndexed({
    capex: {
      automationEquipment: d.localSetupAndOffice,
      installationIntegration: d.licensingAndRegistration,
      softwareCybersecurity: d.regulatoryAndComplianceSetup,
      trainingLaunch: d.entryMarketingCampaign,
    },
    initialWorkingCapital: d.localWorkingCapital,
    workingCapitalRecovery: d.localWorkingCapital * d.workingCapitalRecoveryPct,
    salvageValue: d.exitAssetRecovery,
    lines: { savings, margin, opex },
    common,
  });
}

/* ------------------------------------------------------------------------------------------- */
/* Public entry point                                                                           */
/* ------------------------------------------------------------------------------------------- */

/**
 * Turns archetype drivers into the engine's `FinancialAssumptions` contract.
 *
 * @throws if `archetype` does not match `drivers.kind` - a mismatch means the caller has paired a
 *         stale driver object with a newly selected archetype, which would silently appraise the
 *         wrong project.
 */
export function buildAnnualFCF<K extends ProjectArchetype>(
  drivers: DriversFor<K>,
  archetype: K,
  common: CommonInputs,
): FinancialAssumptions {
  if (drivers.kind !== archetype) {
    throw new Error(
      `buildAnnualFCF: driver/archetype mismatch - drivers are for "${drivers.kind}" but "${archetype}" was requested.`,
    );
  }

  // Widened to the union so the switch below narrows on the discriminant.
  const d: ArchetypeDrivers = drivers;

  switch (d.kind) {
    case 'new-branch':
      return buildNewBranch(d, common);
    case 'machinery':
      return buildMachinery(d, common);
    case 'new-product':
      return buildNewProduct(d, common);
    case 'ai-platform':
      return buildAiPlatform(d, common);
    case 'facility-expansion':
      return buildFacilityExpansion(d, common);
    case 'online-service':
      return buildOnlineService(d, common);
    case 'automation':
      return buildAutomation(d, common);
    case 'market-entry':
      return buildMarketEntry(d, common);
    default: {
      // Exhaustiveness guard: adding a ninth archetype without a builder fails to compile here.
      const unreachable: never = d;
      throw new Error(`buildAnnualFCF: no builder for archetype ${JSON.stringify(unreachable)}`);
    }
  }
}
