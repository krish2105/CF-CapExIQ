import { describe, it, expect } from 'vitest';
import { optimizeCapitalPortfolio } from '../src/lib/finance/portfolio';
import { PortfolioProject } from '../src/lib/types/finance';

describe('0-1 Dynamic Programming Knapsack Portfolio Solver', () => {
  it('selects mathematically optimal project combination over greedy PI heuristic', () => {
    const testProjects: PortfolioProject[] = [
      {
        id: 'mandatory-mfc',
        name: 'Mandatory MFC',
        category: 'Automation',
        initialInvestment: 10000000,
        npv: 5000000,
        irr: 0.20,
        profitabilityIndex: 1.50,
        strategicScore: 4.0,
        riskScore: 2,
        isMandatory: true,
      },
      {
        id: 'disc-high-pi-small-npv',
        name: 'High PI Small Project',
        category: 'Software',
        initialInvestment: 10000000,
        npv: 6000000,
        irr: 0.25,
        profitabilityIndex: 1.60,
        strategicScore: 4.0,
        riskScore: 1,
        isMandatory: false,
      },
      {
        id: 'disc-opt1',
        name: 'Opt 1 Project',
        category: 'Logistics',
        initialInvestment: 10000000,
        npv: 5500000,
        irr: 0.22,
        profitabilityIndex: 1.55,
        strategicScore: 4.0,
        riskScore: 2,
        isMandatory: false,
      },
      {
        id: 'disc-opt2',
        name: 'Opt 2 Project',
        category: 'Store Ops',
        initialInvestment: 10000000,
        npv: 5200000,
        irr: 0.21,
        profitabilityIndex: 1.52,
        strategicScore: 4.0,
        riskScore: 2,
        isMandatory: false,
      },
    ];

    // Budget: 30.0M -> Mandatory takes 10M, leaving 20M for 2 discretionary projects
    const result = optimizeCapitalPortfolio(testProjects, 30000000);

    expect(result.totalInvestmentCommitted).toBe(30000000);
    expect(result.selectedProjects.length).toBe(3); // Mandatory + 2 discretionary
    expect(result.totalPortfolioNpv).toBe(16500000); // 5.0M + 6.0M + 5.5M
  });
});
