# CapExIQ — Capital Portfolio Optimisation and Rationing

## Overview

The Capital Portfolio Optimiser (`/portfolio`, implemented in `src/lib/finance/portfolio.ts`) selects
the combination of competing capital projects that **maximises total portfolio NPV** subject to a hard
capital budget constraint.

## The Algorithm — Exact 0-1 Knapsack, Not a PI Ranking

The optimiser solves a **0-1 knapsack problem by dynamic programming**. It does **not** sort projects
by profitability index and allocate greedily down the list. Any earlier description of it as a
sequential PI sort was wrong: a greedy PI ranking is a heuristic that can miss the optimal
combination, whereas the DP finds the exact optimum.

The four steps:

1. **Mandatory projects are committed first.** Projects flagged `isMandatory` are taken if they fit in
   the budget, and their cost is deducted from the capital available. The MFC project itself is
   mandatory in the default portfolio.

2. **Non-positive-NPV projects are excluded.** Any discretionary project with NPV ≤ 0 goes straight to
   the deferred list and never enters the optimisation.

3. **The remaining budget is solved as a 0-1 knapsack.**
   - *Items:* the discretionary positive-NPV projects.
   - *Weight:* each project's initial investment, discretised into AED 100,000 units
     (`scale = 100000`), with weights rounded **up** so the solution can never exceed the real budget.
   - *Value:* each project's NPV.
   - *Capacity:* the budget remaining after mandatory commitments, floored to whole 100,000 units.

   The recurrence over the DP table `dp[i][w]` is the standard one:

   $$dp[i][w] = \max\left(dp[i-1][w],\ dp[i-1][w - w_i] + \text{NPV}_i\right) \quad \text{when } w_i \le w$$

   with `dp[i][w] = dp[i-1][w]` otherwise. The table is then **backtracked** from `dp[n][W]` to recover
   which projects are in the optimal set: a project is selected wherever `dp[i][w] != dp[i-1][w]`.

4. **Everything not selected is reported as deferred**, so the output always accounts for the full
   project list.

Each project is either fully funded or not funded at all — this is the "0-1" constraint. Partial
funding is not modelled.

## Profitability Index

PI is still computed and displayed for each project, because it is the standard capital-rationing
diagnostic and it answers "how much value per dirham committed":

$$PI = \frac{\text{PV of cash inflows}}{\text{Initial investment}}$$

But PI is a **reporting metric here, not the selection rule**. Selection is by DP knapsack on NPV.

## Outputs

| Output | Meaning |
| :--- | :--- |
| `selectedProjects` / `deferredProjects` | The optimal funded set and everything deferred |
| `totalInvestmentCommitted` | Capital committed across the selected set |
| `remainingCapital` | Budget headroom left unallocated |
| `totalPortfolioNpv` | Sum of the selected projects' NPVs — the quantity being maximised |
| `averageStrategicScore` | Mean strategic score across the selected set |
| `investmentWeightedAverageIrrApprox` | **Approximation only** |

### On the portfolio IRR

`investmentWeightedAverageIrrApprox` is an investment-weighted arithmetic mean of the individual
project IRRs. **IRRs are roots of NPV polynomials and are not additive**, so this is a presentational
headline rather than a true portfolio IRR. A true portfolio IRR requires summing the selected projects'
cash-flow streams period by period and solving NPV = 0 on the aggregate; the `PortfolioProject` type
stores only summary metrics and no cash-flow streams, so that is not derivable in the current data
model. The field name and the source comment both say so.

## Default Portfolio

| Project | Investment (AED) | NPV (AED) | IRR | PI | Mandatory |
| :--- | ---: | ---: | ---: | ---: | :---: |
| Automated Micro-Fulfilment Centre | 24,000,000 | 12,083,628 | 26.30% | 1.5035 | Yes |
| Store-Front POS & Payment Upgrade | 6,000,000 | 2,500,000 | 19.50% | 1.416 | No |
| Last-Mile Electric Van Fleet | 12,000,000 | 3,800,000 | 17.80% | 1.316 | No |
| Central ERP Cloud Migration | 15,000,000 | 1,200,000 | 13.20% | 1.080 | No |
| Dark Store Expansion — Abu Dhabi | 8,000,000 | −500,000 | 8.50% | 0.937 | No |

The Abu Dhabi dark store is excluded automatically at step 2 on its negative NPV.

## Tests

`tests/knapsack.test.ts` covers the DP solver and `tests/portfolio.test.ts` covers the optimiser end to
end.
