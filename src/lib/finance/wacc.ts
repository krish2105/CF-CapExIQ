export interface WaccInputs {
  riskFreeRate: number; // e.g. 0.042 (4.2%) - long-dated sovereign yield proxy
  beta: number; // e.g. 1.15 - levered equity beta for GCC omnichannel retail
  equityRiskPremium: number; // e.g. 0.06 (6.0%) - mature-market equity risk premium
  /**
   * Country risk premium, e.g. 0.0075 (0.75%) for the UAE.
   * Added to the CAPM cost of equity to price sovereign / jurisdictional risk that a
   * mature-market ERP does not capture (Damodaran-style additive CRP).
   */
  countryRiskPremium: number;
  /**
   * Project execution premium, e.g. 0.035 (3.5%).
   * Added to the cost of equity to price asset-specific delivery risk that a listed-equity beta
   * cannot capture: a greenfield, first-of-a-kind robotics micro-fulfilment build carries
   * integration, ramp-up and technology-obsolescence risk beyond the sponsor's normal operations.
   */
  projectExecutionPremium: number;
  eiborBenchmark: number; // e.g. 0.0379 (3.79%) - 3-month EIBOR
  creditSpread: number; // e.g. 0.025 (2.5%) - corporate borrowing spread over EIBOR
  taxRate: number; // e.g. 0.09 (9%) - UAE headline corporate tax rate
  debtWeight: number; // e.g. 0.40 (40%) - target D/V
}

export interface WaccResult {
  costOfEquity: number;
  preTaxCostOfDebt: number;
  afterTaxCostOfDebt: number;
  calculatedWacc: number;
  equityWeight: number;
  debtWeight: number;
}

/**
 * Weighted Average Cost of Capital.
 *
 * Cost of equity (adjusted CAPM / build-up):
 *   r_e = R_f + beta * ERP + country risk premium + project execution premium
 *
 * Cost of debt:
 *   r_d(pre-tax)   = EIBOR + credit spread
 *   r_d(after-tax) = r_d(pre-tax) * (1 - tax rate)
 *
 * WACC = E/V * r_e + D/V * r_d(after-tax)
 *
 * The two additive premiums are what reconcile this calculator to the model's 11.50% hurdle rate.
 * Plain CAPM (R_f + beta * ERP) alone returns ~9.33%: a mature-market, diversified, listed-equity
 * cost of capital that understates the risk of a single greenfield capital project in the UAE.
 */
export function calculateWacc(inputs: WaccInputs): WaccResult {
  const costOfEquity =
    inputs.riskFreeRate +
    inputs.beta * inputs.equityRiskPremium +
    inputs.countryRiskPremium +
    inputs.projectExecutionPremium;

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
