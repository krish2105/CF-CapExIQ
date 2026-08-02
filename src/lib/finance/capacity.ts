export interface OperationalCapacityInputs {
  annualOrders: number; // e.g. 1,200,000 orders/yr
  operatingHoursPerDay: number; // e.g. 16 hours
  operatingDaysPerYear: number; // e.g. 365 days
  itemsPerOrder: number; // e.g. 3.5 items
  automatedPickLinesPerHour: number; // e.g. 450 lines/hr/robot
  robotCount: number; // e.g. 12 robots
  manualPickLinesPerHour: number; // e.g. 60 lines/hr/worker
  downtimeBufferPct: number; // e.g. 0.05 (5%)
}

export interface OperationalCapacityResult {
  totalAnnualItems: number;
  dailyOrderTarget: number;
  hourlyOrderTarget: number;
  automatedCapacityItemsPerHour: number;
  capacityUtilizationPct: number;
  laborSavingFteEquivalent: number;
  costPerOrderSavingsAed: number;
}

export function calculateOperationalCapacity(inputs: OperationalCapacityInputs): OperationalCapacityResult {
  const totalAnnualItems = inputs.annualOrders * inputs.itemsPerOrder;
  const totalOperatingHours = inputs.operatingHoursPerDay * inputs.operatingDaysPerYear;
  const hourlyOrderTarget = inputs.annualOrders / totalOperatingHours;

  const grossAutomatedItemsPerHour = inputs.automatedPickLinesPerHour * inputs.robotCount;
  const netAutomatedItemsPerHour = grossAutomatedItemsPerHour * (1 - inputs.downtimeBufferPct);

  const requiredItemsPerHour = (totalAnnualItems / totalOperatingHours);
  const capacityUtilizationPct = (requiredItemsPerHour / netAutomatedItemsPerHour) * 100;

  // Manual FTE equivalent: total annual items / (manual rate * total hours)
  const manualFteRequired = totalAnnualItems / (inputs.manualPickLinesPerHour * 2000);
  const automatedFteRequired = totalAnnualItems / (inputs.automatedPickLinesPerHour * 2000);
  const laborSavingFteEquivalent = parseFloat((manualFteRequired - automatedFteRequired).toFixed(1));

  const costPerOrderSavingsAed = parseFloat(((7500000) / inputs.annualOrders).toFixed(2));

  return {
    totalAnnualItems,
    dailyOrderTarget: parseFloat((inputs.annualOrders / inputs.operatingDaysPerYear).toFixed(0)),
    hourlyOrderTarget: parseFloat(hourlyOrderTarget.toFixed(1)),
    automatedCapacityItemsPerHour: parseFloat(netAutomatedItemsPerHour.toFixed(0)),
    capacityUtilizationPct: parseFloat(capacityUtilizationPct.toFixed(1)),
    laborSavingFteEquivalent,
    costPerOrderSavingsAed,
  };
}
