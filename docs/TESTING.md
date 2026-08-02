# CapExIQ — Test Strategy and Execution

## Quality Gates

| Command | Purpose |
| :--- | :--- |
| `pnpm typecheck` | `tsc --noEmit` under TypeScript strict mode |
| `pnpm lint` | `next lint` |
| `pnpm test` | Vitest unit suites |
| `pnpm build` | Production compile |
| `pnpm test:e2e` | Playwright browser tests — see "How the E2E server is started" below |

## Continuous Integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request to `main`:
checkout → pnpm 9 → Node 20 → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` →
`pnpm test` → `pnpm build`. The E2E suite is not currently part of CI.

## Unit Tests (Vitest)

Thirteen suite files under `tests/`. Counts are `it()` cases at the time of writing.

| File | Cases | What it covers |
| :--- | :---: | :--- |
| `golden.test.ts` | 14 | **Golden-value regression** — see below |
| `wacc.test.ts` | 6 | CAPM build-up, country and execution premiums, after-tax cost of debt, WACC weighting |
| `metrics.test.ts` | 5 | NPV, IRR, MIRR, PI, payback and discounted payback |
| `cashflow.test.ts` | 3 | Year-by-year schedule, depreciation to salvage, terminal-year flows |
| `csv.test.ts` | 3 | CSV parsing and the formula-injection sanitizer |
| `sensitivity.test.ts` | 3 | One-way driver sensitivity and the two-way matrices |
| `monteCarlo.test.ts` | 2 | Mulberry32 PRNG reproducibility under a fixed seed, summary statistics |
| `risk.test.ts` | 2 | Rule-based risk alert firing and severity ordering |
| `scenarios.test.ts` | 2 | Scenario multipliers and probability-weighted expected NPV |
| `strategicScorecard.test.ts` | 2 | Strategic scoring dimensions |
| `funding.test.ts` | 1 | Debt service coverage ratio |
| `knapsack.test.ts` | 1 | 0-1 dynamic-programming knapsack |
| `portfolio.test.ts` | 1 | Portfolio optimiser end to end |

### `tests/golden.test.ts` — Golden-Value Regression Suite

This suite exists because every other unit test asserts loose inequalities (for example
`expect(npv).toBeGreaterThan(5e6)` when the true NPV is 12.08M), which stays green while the model
drifts by half. `golden.test.ts` pins the **exact** published figures:

- initial investment structure (CapEx 22,000,000 · NWC 2,000,000 · outlay 24,000,000);
- the full free-cash-flow stream
  `−24,000,000 · 7,398,000 · 7,724,690 · 8,066,186 · 8,423,154 · 8,796,293 · 13,186,330`;
- NPV 12,083,628 · IRR 26.30% · MIRR 19.34% · PI 1.5035 · payback 3.10 yrs · discounted payback
  3.98 yrs;
- the three scenario outcomes and the expected NPV of 9,560,152.

These are the same numbers reproduced in the written report, the board PDF, the presentation deck and
every markdown document in the repository root.

**If this suite fails, do not update the expected values to make it pass.** A failure means the engine
has moved and every published figure is now wrong. Either revert the engine change, or — if the change
is deliberate and correct — update the golden values *and* regenerate every downstream document.

## End-to-End Tests (Playwright)

`e2e/app.spec.ts` contains **five** tests. They are **smoke tests**, not functional tests: four of the
five assert only that the page's first `<h1>` becomes visible, with two additional text assertions on
the landing page and the dashboard, and one assertion that the theme-toggle button renders.

| # | Test | What it actually asserts |
| :---: | :--- | :--- |
| 1 | Application overview page | `/` renders an `<h1>`; the text "NovaRetail GCC" is visible |
| 2 | Executive dashboard | `/dashboard` renders an `<h1>`; the labels "Baseline NPV" and "Initial Outlay" are visible |
| 3 | Theme toggle | `button[aria-label="Select color theme"]` is visible on `/` |
| 4 | Monte Carlo page | `/monte-carlo` renders an `<h1>` |
| 5 | WACC / CAPM calculator | `/external-data` renders an `<h1>` |

**Known gaps, stated plainly.** The E2E suite does **not** exercise the command palette, any executive
role selector, scenario switching, the Monte Carlo simulation run itself, the WACC calculator inputs,
CSV upload or export, the AI advisory panel, or print/PDF output. Earlier versions of this document
claimed coverage of an "Executive Role Selector" and a "Command Palette"; neither is tested. Nineteen
of the twenty-five page routes have no E2E coverage at all. Functional correctness of the finance
engine is covered by the unit suites, not by these browser tests.

### How the E2E server is started

`playwright.config.ts` sets `webServer.command: 'pnpm dev'` with `reuseExistingServer: true` and
`baseURL: http://localhost:3000`. Two consequences worth knowing:

- By default the suite runs against a **development** server, so it does not validate the production
  bundle. To test what will actually ship, run `pnpm build` and `pnpm start` first; Playwright will
  reuse the server already listening on port 3000.
- Because `reuseExistingServer` is `true`, the suite silently tests whatever is already on port 3000.
  Confirm what is running before trusting a green result.
