export interface WaccInputs {
  riskFreeRate: number; // e.g. 0.042 (4.2%)
  beta: number; // e.g. 1.15
  equityRiskPremium: number; // e.g. 0.06 (6.0%)
  eiborBenchmark: number; // e.g. 0.0485 (4.85%)
  creditSpread: number; // e.g. 0.025 (2.5%)
  taxRate: number; // e.g. 0.09 (9%)
  debtWeight: number; // e.g. 0.40 (40%)
}

export interface WaccResult {
  costOfEquity: number;
  preTaxCostOfDebt: number;
  afterTaxCostOfDebt: number;
  calculatedWacc: number;
  equityWeight: number;
  debtWeight: number;
}

export function calculateWacc(inputs: WaccInputs): WaccResult {
  const costOfEquity = inputs.riskFreeRate + inputs.beta * inputs.equityRiskPremium;
  const preTaxCostOfDebt = inputs.eiborBenchmark + inputs.creditSpread;
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - inputs.taxRate);

  const equityWeight = Math.max(0, Math.min(1, 1 - inputs.debtWeight));
  const debtWeight = Math.max(0, Math.min(1, inputs.debtWeight));

  const calculatedWacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;

  return {
    costOfEquity,
    preTaxCostOfDebt,
    afterTaxCostOfDebt,
    calculatedWacc,
    equityWeight,
    debtWeight,
  };
}
