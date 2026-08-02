import type { FinancialAssumptions } from '../types/finance';

/**
 * Input-side anomaly detection.
 *
 * The existing risk engine (`risk.ts`) screens the *output* of the model: it
 * fires once a negative NPV or a sub-hurdle IRR has already been computed. That
 * is the right place to catch a bad result, but the wrong place to catch a bad
 * input — by then the implausible assumption has already been discounted,
 * charted and written into a memorandum.
 *
 * This module screens assumptions before they are evaluated, against plausible
 * ranges with a stated basis. It is deliberately conservative: it flags for
 * review rather than blocking, because an unusual assumption is sometimes
 * correct and a hard stop would train users to work around the tool.
 */

export type AnomalySeverity = 'Critical' | 'High' | 'Medium';

export interface AssumptionAnomaly {
  id: string;
  severity: AnomalySeverity;
  field: string;
  observed: string;
  /** Plausible range and where it comes from. */
  expectation: string;
  /** What could go wrong if this is left unchallenged. */
  consequence: string;
}

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const aed = (v: number) => `AED ${Math.round(v).toLocaleString('en-US')}`;

export function detectAssumptionAnomalies(a: FinancialAssumptions): AssumptionAnomaly[] {
  const found: AssumptionAnomaly[] = [];

  const capex =
    a.automationEquipment + a.installationIntegration + a.softwareCybersecurity + a.trainingLaunch;
  const totalOutlay = capex + a.initialWorkingCapital;
  const year1Benefit = a.year1OperatingSavings + a.year1ContributionMargin;

  // --- Growth rates ------------------------------------------------------
  const growths: Array<[string, number, string]> = [
    ['annualSavingsGrowth', a.annualSavingsGrowth, 'Savings growth'],
    ['annualMarginGrowth', a.annualMarginGrowth, 'Margin growth'],
    ['annualOpExGrowth', a.annualOpExGrowth, 'Operating cost growth'],
  ];
  for (const [id, value, label] of growths) {
    if (value > 0.25) {
      found.push({
        id: `ANOM-${id}`,
        severity: 'High',
        field: label,
        observed: pct(value),
        expectation:
          'Sustained real growth above 25% a year is rare outside a start-up ramp and compounds hard over a six-year horizon.',
        consequence:
          'Terminal-year benefits are inflated, which flatters NPV most in the years the discount factor protects least.',
      });
    }
    if (value < -0.10) {
      found.push({
        id: `ANOM-${id}-NEG`,
        severity: 'Medium',
        field: label,
        observed: pct(value),
        expectation: 'A decline steeper than 10% a year implies the benefit case erodes rather than holds.',
        consequence: 'If genuine, the investment thesis needs restating; if a data-entry error, NPV is understated.',
      });
    }
  }

  // --- Benefit plausibility versus outlay --------------------------------
  if (totalOutlay > 0 && year1Benefit / totalOutlay > 0.6) {
    found.push({
      id: 'ANOM-BENEFIT-RATIO',
      severity: 'Critical',
      field: 'Year-1 benefits versus total outlay',
      observed: `${pct(year1Benefit / totalOutlay)} of outlay recovered in Year 1`,
      expectation:
        'Recovering more than 60% of a capital outlay in the first year implies a payback under two years, which is exceptional for capital equipment.',
      consequence:
        'The single largest driver of NPV may be overstated. This is the assumption most worth independent verification before approval.',
    });
  }

  // --- Salvage ------------------------------------------------------------
  if (capex > 0 && a.salvageValue / capex > 0.35) {
    found.push({
      id: 'ANOM-SALVAGE',
      severity: 'High',
      field: 'Salvage value',
      observed: `${aed(a.salvageValue)} (${pct(a.salvageValue / capex)} of capex)`,
      expectation:
        'Specialised automation assets are hard to redeploy; residual value above 35% of capex assumes a liquid secondary market that may not exist.',
      consequence: 'Terminal value — the least certain cash flow — carries an outsized share of NPV.',
    });
  }

  // --- Working capital recovery ------------------------------------------
  if (a.workingCapitalRecovery > a.initialWorkingCapital) {
    found.push({
      id: 'ANOM-NWC-RECOVERY',
      severity: 'Critical',
      field: 'Working capital recovery',
      observed: `${aed(a.workingCapitalRecovery)} recovered against ${aed(a.initialWorkingCapital)} invested`,
      expectation: 'Recovery cannot exceed the working capital originally committed.',
      consequence: 'The model books a terminal inflow that has no corresponding outflow — NPV is overstated outright.',
    });
  }

  // --- Discount rate ------------------------------------------------------
  if (a.discountRate < 0.05) {
    found.push({
      id: 'ANOM-WACC-LOW',
      severity: 'High',
      field: 'Discount rate',
      observed: pct(a.discountRate),
      expectation:
        'A cost of capital below 5% is below plausible UAE corporate funding costs and understates the hurdle the project must clear.',
      consequence: 'Every project looks acceptable at a low enough discount rate; the ranking becomes meaningless.',
    });
  }
  if (a.discountRate > 0.30) {
    found.push({
      id: 'ANOM-WACC-HIGH',
      severity: 'Medium',
      field: 'Discount rate',
      observed: pct(a.discountRate),
      expectation: 'A hurdle above 30% implies distress or venture-stage risk pricing.',
      consequence: 'Viable projects are rejected on a financing assumption rather than on their own economics.',
    });
  }

  // --- Tax -----------------------------------------------------------------
  if (a.corporateTaxRate < 0 || a.corporateTaxRate > 0.5) {
    found.push({
      id: 'ANOM-TAX',
      severity: 'High',
      field: 'Corporate tax rate',
      observed: pct(a.corporateTaxRate),
      expectation: 'The UAE headline rate is 9% above AED 375,000 (Federal Decree-Law 47/2022).',
      consequence: 'Both the tax charge and the depreciation tax shield are misstated.',
    });
  }

  // --- Project life --------------------------------------------------------
  if (a.projectLifeYears > 15) {
    found.push({
      id: 'ANOM-LIFE',
      severity: 'Medium',
      field: 'Project life',
      observed: `${a.projectLifeYears} years`,
      expectation:
        'Automation hardware is typically modelled over 5-10 years; beyond 15 the technology-obsolescence assumption dominates the result.',
      consequence: 'NPV is carried by cash flows well past the point the equipment is likely to remain competitive.',
    });
  }

  const rank: Record<AnomalySeverity, number> = { Critical: 0, High: 1, Medium: 2 };
  return found.sort((x, y) => rank[x.severity] - rank[y.severity]);
}
