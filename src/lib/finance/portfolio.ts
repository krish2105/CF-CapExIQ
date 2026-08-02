import { PortfolioProject, PortfolioOptimizationResult } from '../types/finance';

export const DEFAULT_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'proj-mfc',
    name: 'Automated Micro-Fulfilment Centre (MFC)',
    category: 'Supply Chain & Automation',
    initialInvestment: 24000000,
    npv: 12083628,
    irr: 0.2630,
    profitabilityIndex: 1.5035,
    strategicScore: 4.2,
    riskScore: 2,
    isMandatory: true,
  },
  {
    id: 'proj-pos',
    name: 'Store-Front POS & Payment System Upgrade',
    category: 'Store Operations',
    initialInvestment: 6000000,
    npv: 2500000,
    irr: 0.195,
    profitabilityIndex: 1.416,
    strategicScore: 3.8,
    riskScore: 1,
    isMandatory: false,
  },
  {
    id: 'proj-fleet',
    name: 'Last-Mile Electric Van Fleet',
    category: 'Logistics',
    initialInvestment: 12000000,
    npv: 3800000,
    irr: 0.178,
    profitabilityIndex: 1.316,
    strategicScore: 4.5,
    riskScore: 2,
    isMandatory: false,
  },
  {
    id: 'proj-erp',
    name: 'Central ERP Cloud Migration',
    category: 'IT Infrastructure',
    initialInvestment: 15000000,
    npv: 1200000,
    irr: 0.132,
    profitabilityIndex: 1.08,
    strategicScore: 4.7,
    riskScore: 3,
    isMandatory: false,
  },
  {
    id: 'proj-darkstore',
    name: 'Dark Store Expansion - Abu Dhabi',
    category: 'Retail Expansion',
    initialInvestment: 8000000,
    npv: -500000,
    irr: 0.085,
    profitabilityIndex: 0.937,
    strategicScore: 3.2,
    riskScore: 4,
    isMandatory: false,
  },
];

export function optimizeCapitalPortfolio(
  projects: PortfolioProject[],
  budgetLimit: number
): PortfolioOptimizationResult {
  const selected: PortfolioProject[] = [];
  const deferred: PortfolioProject[] = [];
  let remainingBudget = budgetLimit;

  // 1. Force select mandatory projects if within budget
  const mandatory = projects.filter((p) => p.isMandatory);
  const discretionary = projects.filter((p) => !p.isMandatory && p.npv > 0);

  for (const proj of mandatory) {
    if (proj.initialInvestment <= remainingBudget) {
      selected.push({ ...proj, selected: true });
      remainingBudget -= proj.initialInvestment;
    } else {
      deferred.push({ ...proj, selected: false });
    }
  }

  // 2. Run 0-1 DP Knapsack on discretionary positive-NPV projects
  const scale = 100000; // Scale to 100k units for exact DP memory efficiency
  const W = Math.floor(remainingBudget / scale);
  const n = discretionary.length;

  if (n > 0 && W > 0) {
    const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      const proj = discretionary[i - 1];
      const wt = Math.ceil(proj.initialInvestment / scale);
      const val = Math.max(0, proj.npv);

      for (let w = 0; w <= W; w++) {
        if (wt <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - wt] + val);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    // Backtrack to identify selected discretionary projects
    let w = W;
    const selectedDiscretionarySet = new Set<string>();

    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        const proj = discretionary[i - 1];
        selectedDiscretionarySet.add(proj.id);
        const wt = Math.ceil(proj.initialInvestment / scale);
        w -= wt;
      }
    }

    for (const proj of discretionary) {
      if (selectedDiscretionarySet.has(proj.id)) {
        selected.push({ ...proj, selected: true });
        remainingBudget -= proj.initialInvestment;
      } else {
        deferred.push({ ...proj, selected: false });
      }
    }
  } else {
    for (const proj of discretionary) {
      deferred.push({ ...proj, selected: false });
    }
  }

  // Add non-positive NPV projects to deferred list
  const nonPositiveNpv = projects.filter((p) => !p.isMandatory && p.npv <= 0);
  for (const proj of nonPositiveNpv) {
    deferred.push({ ...proj, selected: false });
  }

  const totalInvestmentCommitted = selected.reduce((sum, p) => sum + p.initialInvestment, 0);
  const totalPortfolioNpv = selected.reduce((sum, p) => sum + p.npv, 0);

  // APPROXIMATION ONLY - investment-weighted arithmetic mean of individual project IRRs.
  // IRRs are roots of NPV polynomials and are not additive, so this is a presentational headline,
  // not a true portfolio IRR. A true portfolio IRR requires summing the selected projects'
  // cash-flow streams period by period and solving NPV = 0 on the aggregated stream; PortfolioProject
  // stores only summary metrics (no cash flows), so that is not derivable here.
  const investmentWeightedAverageIrrApprox = totalInvestmentCommitted > 0
    ? selected.reduce((sum, p) => sum + p.irr * p.initialInvestment, 0) / totalInvestmentCommitted
    : 0;

  const averageStrategicScore = selected.length > 0
    ? parseFloat((selected.reduce((sum, p) => sum + p.strategicScore, 0) / selected.length).toFixed(2))
    : 0;

  return {
    totalBudget: budgetLimit,
    totalInvestmentCommitted,
    remainingCapital: budgetLimit - totalInvestmentCommitted,
    totalPortfolioNpv,
    investmentWeightedAverageIrrApprox,
    averageStrategicScore,
    selectedProjects: selected,
    deferredProjects: deferred,
  };
}
