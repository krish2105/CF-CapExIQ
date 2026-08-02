import { describe, it, expect } from 'vitest';
import { DEFAULT_PORTFOLIO_PROJECTS, optimizeCapitalPortfolio } from '../src/lib/finance/portfolio';

describe('Capital Portfolio Optimizer Engine', () => {
  it('optimizes project selection under AED 40.0M capital budget constraint', () => {
    const res = optimizeCapitalPortfolio(DEFAULT_PORTFOLIO_PROJECTS, 40000000);

    expect(res.totalInvestmentCommitted).toBeLessThanOrEqual(40000000);
    expect(res.selectedProjects.length).toBeGreaterThan(0);
    expect(res.totalPortfolioNpv).toBeGreaterThan(10000000);
    // Negative NPV projects must be excluded
    const darkStore = res.selectedProjects.find((p) => p.id === 'proj-darkstore');
    expect(darkStore).toBeUndefined();
  });
});
