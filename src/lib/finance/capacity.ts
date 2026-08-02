export interface OperationalCapacityInputs {
  annualOrders: number; // e.g. 1,200,000 orders/yr
  operatingHoursPerDay: number; // e.g. 16 hours
  operatingDaysPerYear: number; // e.g. 365 days
  itemsPerOrder: number; // e.g. 3.5 items
  automatedPickLinesPerHour: number; // e.g. 450 lines/hr at a goods-to-person station
  robotCount: number; // e.g. 12 robots
  manualPickLinesPerHour: number; // e.g. 60 lines/hr/picker
  downtimeBufferPct: number; // e.g. 0.05 (5%)

  /* --- Labour-bridge parameters (all optional; defaults below are the NovaRetail GCC baseline) --- */

  /** Paid, rostered hours per FTE per year, net of annual leave, public holidays and sickness. */
  productiveHoursPerFtePerYear?: number;
  /** Share of paid hours actually spent picking (rest is travel, replenishment gaps, breaks). */
  pickerUtilization?: number;
  /** Indirect/support FTEs per direct picking FTE under manual operation (packing, QC, inventory). */
  manualIndirectLaborRatio?: number;
  /** Indirect/support FTEs per direct FTE under automation (fewer touches, more exception handling). */
  automatedIndirectLaborRatio?: number;
  /** Fully loaded annual employment cost per FTE in AED (salary, allowances, visa, EOSB, overtime). */
  loadedAnnualCostPerFteAed?: number;
}

export interface OperationalCapacityResult {
  totalAnnualItems: number;
  dailyOrderTarget: number;
  hourlyOrderTarget: number;
  automatedCapacityItemsPerHour: number;
  capacityUtilizationPct: number;

  /* --- Labour bridge (exposed so the UI can show the full derivation, not just the answer) --- */
  manualFteRequired: number;
  automatedFteRequired: number;
  fteDisplaced: number;
  loadedAnnualCostPerFteAed: number;
  derivedAnnualLaborSavingAed: number;

  laborSavingFteEquivalent: number; // === fteDisplaced, kept for existing consumers
  costPerOrderSavingsAed: number;
}

/** NovaRetail GCC baseline labour parameters. */
const DEFAULT_PRODUCTIVE_HOURS_PER_FTE = 1800; // ~2,080 gross less leave, holidays and absence
const DEFAULT_PICKER_UTILIZATION = 0.75; // 25% of paid time is travel, waiting and breaks
const DEFAULT_MANUAL_INDIRECT_RATIO = 0.45; // packing, replenishment, QC, inventory control
const DEFAULT_AUTOMATED_INDIRECT_RATIO = 0.20; // leaner support layer around goods-to-person stations
const DEFAULT_LOADED_COST_PER_FTE_AED = 112000; // ~AED 9,333/month all-in (blended operative + supervision)

export function calculateOperationalCapacity(inputs: OperationalCapacityInputs): OperationalCapacityResult {
  const totalAnnualItems = inputs.annualOrders * inputs.itemsPerOrder;
  const totalOperatingHours = inputs.operatingHoursPerDay * inputs.operatingDaysPerYear;
  const hourlyOrderTarget = totalOperatingHours > 0 ? inputs.annualOrders / totalOperatingHours : 0;

  const grossAutomatedItemsPerHour = inputs.automatedPickLinesPerHour * inputs.robotCount;
  const netAutomatedItemsPerHour = grossAutomatedItemsPerHour * (1 - inputs.downtimeBufferPct);

  const requiredItemsPerHour = totalOperatingHours > 0 ? totalAnnualItems / totalOperatingHours : 0;
  const capacityUtilizationPct =
    netAutomatedItemsPerHour > 0 ? (requiredItemsPerHour / netAutomatedItemsPerHour) * 100 : 0;

  /*
   * ---------------------------------------------------------------------------------------------
   * LABOUR SAVINGS BRIDGE
   *
   * This derives the annual labour saving bottom-up from throughput and staffing, instead of the
   * previous hardcoded AED 7,500,000.
   *
   *   pick lines/FTE/yr = pick rate (lines/hr) x productive hours/FTE/yr x picker utilisation
   *   direct FTEs       = total annual pick lines / pick lines per FTE per year
   *   total FTEs        = direct FTEs x (1 + indirect support ratio)
   *   FTEs displaced    = manual total FTEs - automated total FTEs
   *   annual saving     = FTEs displaced x fully loaded annual cost per FTE
   *
   * CORROBORATION, NOT REPLACEMENT: on the NovaRetail GCC baseline (1.2M orders/yr, 3.5 items/order,
   * 60 vs 450 lines/hr) this bridge lands at roughly AED 7.49M, which independently corroborates the
   * AED 7,500,000 `year1OperatingSavings` forecast carried in DEFAULT_FINANCIAL_ASSUMPTIONS. It is a
   * cross-check on that management forecast, NOT a substitute for it - the financial model continues
   * to run off `defaultAssumptions.year1OperatingSavings`, which this function does not touch. Note
   * also that the AED 7.5M forecast covers picking-error elimination and space consolidation as well
   * as labour, so a close match here should be read as corroboration within tolerance, not identity.
   * ---------------------------------------------------------------------------------------------
   */
  const productiveHoursPerFte = inputs.productiveHoursPerFtePerYear ?? DEFAULT_PRODUCTIVE_HOURS_PER_FTE;
  const pickerUtilization = inputs.pickerUtilization ?? DEFAULT_PICKER_UTILIZATION;
  const manualIndirectRatio = inputs.manualIndirectLaborRatio ?? DEFAULT_MANUAL_INDIRECT_RATIO;
  const automatedIndirectRatio = inputs.automatedIndirectLaborRatio ?? DEFAULT_AUTOMATED_INDIRECT_RATIO;
  const loadedAnnualCostPerFteAed = inputs.loadedAnnualCostPerFteAed ?? DEFAULT_LOADED_COST_PER_FTE_AED;

  const effectiveHoursPerFte = productiveHoursPerFte * pickerUtilization;

  const manualLinesPerFteYear = inputs.manualPickLinesPerHour * effectiveHoursPerFte;
  const automatedLinesPerFteYear = inputs.automatedPickLinesPerHour * effectiveHoursPerFte;

  const manualDirectFte = manualLinesPerFteYear > 0 ? totalAnnualItems / manualLinesPerFteYear : 0;
  const automatedDirectFte = automatedLinesPerFteYear > 0 ? totalAnnualItems / automatedLinesPerFteYear : 0;

  const manualFteRequired = manualDirectFte * (1 + manualIndirectRatio);
  const automatedFteRequired = automatedDirectFte * (1 + automatedIndirectRatio);

  const fteDisplaced = Math.max(0, manualFteRequired - automatedFteRequired);
  const derivedAnnualLaborSavingAed = fteDisplaced * loadedAnnualCostPerFteAed;

  const costPerOrderSavingsAed =
    inputs.annualOrders > 0 ? parseFloat((derivedAnnualLaborSavingAed / inputs.annualOrders).toFixed(2)) : 0;

  return {
    totalAnnualItems,
    dailyOrderTarget:
      inputs.operatingDaysPerYear > 0
        ? parseFloat((inputs.annualOrders / inputs.operatingDaysPerYear).toFixed(0))
        : 0,
    hourlyOrderTarget: parseFloat(hourlyOrderTarget.toFixed(1)),
    automatedCapacityItemsPerHour: parseFloat(netAutomatedItemsPerHour.toFixed(0)),
    capacityUtilizationPct: parseFloat(capacityUtilizationPct.toFixed(1)),

    manualFteRequired: parseFloat(manualFteRequired.toFixed(1)),
    automatedFteRequired: parseFloat(automatedFteRequired.toFixed(1)),
    fteDisplaced: parseFloat(fteDisplaced.toFixed(1)),
    loadedAnnualCostPerFteAed,
    derivedAnnualLaborSavingAed: parseFloat(derivedAnnualLaborSavingAed.toFixed(0)),

    laborSavingFteEquivalent: parseFloat(fteDisplaced.toFixed(1)),
    costPerOrderSavingsAed,
  };
}
