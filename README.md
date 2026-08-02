# CapExIQ — AI Capital-Budgeting Dashboard (Automated Micro-Fulfilment Centre)

![Next.js](https://img.shields.io/badge/Next.js_14.2-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest_2.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright_E2E-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3.4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)

**Assignment topic: Topic 9 — AI Capital-Budgeting Dashboard.**

---

## Executive Overview

CapExIQ is a capital-budgeting and investment decision-support application for corporate finance
users. It evaluates an **AED 24,000,000** total outlay (**AED 22.0M CapEx** + **AED 2.0M working
capital**) over a **6-year project life** for an Automated Micro-Fulfilment Centre (MFC) in Dubai,
UAE, operated by the hypothetical entity NovaRetail GCC.

The operational case is order-fulfilment automation: compressing urban e-commerce fulfilment lead
times, reducing direct pick cost per order, and adding contribution margin from incremental order
capacity. Operational throughput figures shown in `/capacity-model` are illustrative engineering
inputs, not audited operating data; the financial model runs off the assumptions register in
`ASSUMPTIONS.md`.

---

## Baseline Financial Results

All financial calculations are produced by a deterministic TypeScript engine in `src/lib/finance/`.
No LLM is involved in any financial computation. The figures below are pinned by
`tests/golden.test.ts`.

| Financial Metric | Base-Case Value | Benchmark | Reading |
| :--- | :---: | :---: | :--- |
| Total initial outlay (CF0) | **AED 24,000,000** | CapEx 22.0M + NWC 2.0M | Time zero |
| CapEx composition | **AED 22,000,000** | Equipment 18.0M · Installation 2.5M · Software 1.2M · Training 0.3M | — |
| Depreciation | **AED 3,333,333 / yr** | Straight line to salvage over 6 yrs | (22.0M − 2.0M) ÷ 6 |
| Working capital | **AED 2,000,000** | Flat, not a % of revenue | Fully recovered in Year 6 |
| Salvage value | **AED 2,000,000** | Year 6 resale | PV = 8.61% of NPV |
| Discount rate (WACC) | **11.50%** | Derived, see below | Hurdle rate |
| Net present value | **AED 12,083,628** | > 0 | Creates value |
| Internal rate of return | **26.30%** | > 11.50% | +14.80 pts over hurdle |
| Modified IRR | **19.34%** | > 11.50% | Reinvestment at WACC |
| Profitability index | **1.5035x** | > 1.00x | PV inflows AED 36,083,628 |
| Payback period | **3.10 years** | < 6 yrs | Undiscounted |
| Discounted payback | **3.98 years** | < 6 yrs | At 11.5% |
| Accounting ROI | **123.3%** | — | Over project life |
| Engine decision status | **`Approve`** | — | See recommendation below |

**Free cash flow stream (AED):**
`−24,000,000 · 7,398,000 · 7,724,690 · 8,066,186 · 8,423,154 · 8,796,293 · 13,186,330`

---

## Discount Rate: How 11.50% Is Derived

The hurdle rate is **derived, not assumed**. See `FINANCIAL_METHODOLOGY.md` for the full workings
and `/external-data` for the live calculator.

**Cost of equity (adjusted CAPM / build-up):**

```
4.20% risk-free
+ (1.15 beta x 6.00% mature-market ERP)   = 6.90%
+ 0.75% UAE country risk premium
+ 3.50% project execution premium
------------------------------------------------
= 15.35% cost of equity
```

**Cost of debt:**

```
3.79% 3-month EIBOR (live rate; the previously documented 4.85% was stale)
+ 2.50% credit spread
= 6.29% pre-tax  ->  6.29% x (1 - 9%) = 5.72% after tax
```

**WACC at a 60/40 equity–debt target structure:**

```
(0.60 x 15.35%) + (0.40 x 5.72%) = 9.21% + 2.29% = 11.50%
```

---

## Scenario Analysis

| Scenario | Weight | NPV (AED) | IRR | PI | Engine decision |
| :--- | :---: | ---: | ---: | ---: | :--- |
| Optimistic (capex −5%, benefits +10%, opex −5%, r = 10.5%) | 25% | 19,013,977 | 33.59% | 1.830 | Approve |
| **Base** (management baseline, r = 11.5%) | 50% | **12,083,628** | **26.30%** | **1.504** | **Approve** |
| Pessimistic (capex +15%, benefits −25%, opex +15%, r = 14.5%) | 25% | **−4,940,625** | 8.23% | 0.819 | **Reject** |

**Probability-weighted expected NPV (50/25/25): AED 9,560,152.**

## Sensitivity

Every driver is flexed by an identical ±20% so the swings are directly comparable.

| Rank | Driver | NPV swing (AED) |
| :---: | :--- | ---: |
| 1 | **Operating benefits (savings + contribution margin)** | **16.67M** |
| 2 | Project life | 8.39M |
| 3 | Initial capital expenditure | 8.25M |
| 4 | Discount rate (WACC) | 5.17M |
| 5 | Additional OpEx | 3.57M |
| 6 | Savings growth rate | 1.10M |
| 7 | Salvage value | 0.37M |

**Break-even points:** operating benefits can fall **29.0%** before NPV = 0; total outlay can rise
**50.4%** (to AED 36.08M) before NPV = 0; NPV = 0 at a discount rate of **26.30%** (which is the IRR).

---

## Recommendation

**Approve.**

The base case creates AED 12.08M of value, the IRR clears the 11.50% hurdle by 14.80 points, and the
probability-weighted expected NPV is positive at AED 9.56M. The engine returns a decision status of
`Approve` on the base case.

The material caveat is the downside: under the pessimistic scenario the project destroys value
(NPV −AED 4.94M, PI 0.819) and the engine returns `Reject`. Operating benefits are the single largest
driver of the outcome, and the benefit forecast has only a 29.0% cushion before the project breaks
even. Approval is therefore recommended subject to two conditions:

1. **Release capital against measured Year-1 savings** — stage the drawdown so that continued funding
   depends on the realised savings run-rate tracked in `/benefits-tracker`, not on the forecast.
2. **Require a vendor performance guarantee and buyback** — contractually protect the throughput
   assumption and the AED 2.0M residual value that underpins the terminal-year cash flow.

---

## Presentation Roles and Ownership

The board presentation (`CapExIQ_Executive_Board_Presentation.pptx`, 15 slides) is delivered by a
six-member committee rotation. The written report (Submission A) is an individual piece of work.

| Member | Role | Coverage |
| :---: | :--- | :--- |
| 1 | CFO and project lead | Executive summary, strategic rationale, financial recommendation, board decision, risk synthesis |
| 2 | FP&A director | Financial model, the **6-year** FCF schedule, CapEx breakdown, NPV, IRR, MIRR, payback |
| 3 | Treasury and risk director | WACC derivation, scenario stress tests, tornado sensitivity |
| 4 | Operations director | Fulfilment SLA compression, labour savings, robotics throughput |
| 5 | Strategy and governance director | Management options, real-options framework, deployment roadmap |
| 6 | Financial controller and benefits lead | Assumptions register, benefits realisation, decision-rights RACI |

Slide-by-slide timings are in `deliverables/02_presentation_deck_structure.md`.

---

## Investment Archetypes

CapExIQ is template-driven, not hard-wired to one project. Eight archetypes cover the full range
of capital decisions in the brief. An archetype config builds the annual benefit line; the audited
engine — unforked — evaluates it. Defaults are calibrated to plausible mid-market UAE/GCC figures.

| Archetype | Outlay | NPV | IRR | Verdict |
| :--- | ---: | ---: | ---: | :--- |
| Installing automation technology *(flagship)* | AED 24.0M | +12.08M | 26.3% | Approve |
| Expanding a production facility | AED 26.7M | +7.28M | 16.4% | Phased |
| Purchasing new machinery | AED 5.21M | +1.57M | 18.9% | Approve |
| Building an AI platform | AED 7.80M | (0.01M) | 16.0% | Delay |
| Opening a new branch | AED 6.80M | (0.10M) | 12.1% | Delay |
| Introducing a new product | AED 6.30M | (0.55M) | 10.4% | Delay |
| Launching an online service | AED 6.90M | (1.49M) | 14.0% | Reject |
| Entering a new market | AED 10.9M | (2.21M) | 10.7% | Reject |

Five of eight fail deliberately — a pack where every archetype is comfortably profitable would
demonstrate optimistic defaults rather than a working engine. The flagship case reproduces its
figures to the dirham after the refactor, proven by `tests/golden.test.ts` and `tests/archetypes.test.ts`.

Browse them at `/archetypes`.

## AI Capabilities

Ten server-side routes under `src/app/api/ai/`. Every one accepts an `archetype`, validates its body
with Zod, caps free text at 2,000 characters, bounds tokens and timeout, delimits user text against
prompt injection, and **returns 200 with a deterministic fallback when no API key is configured** —
so the app is fully demonstrable with no credentials, and the financial results are identical either way.

| Route | Purpose |
| :--- | :--- |
| `explain` | Natural-language Q&A over the live model |
| `recommend` | Structured board recommendation (schema-constrained JSON) |
| `threat-radar` | Risk axes ranked for the specific archetype, with mitigations |
| `board-debate` | CFO, COO, Risk Officer and a sceptical NED argue the case, then synthesis |
| `board-memo` | Full board memorandum draft in structured sections |
| `scenario-studio` | Proposes named scenarios beyond the standard three — assumptions only, never results |
| `esg-impact` | Green-financing commentary, or an explicit `notApplicable` flag where ESG is meaningless |
| `parse-quote` | Extracts structured capex lines from pasted vendor quotations, with confidence scoring |
| `live-macro` | Macro briefing over supplied data — asserts no live market access |
| `voice-intent` | Maps a spoken command to a typed app intent, or returns `unknown` |

No route computes a financial figure. Each receives pre-computed values and is instructed never to
recalculate. Exercise them at `/ai-studio`.

## Platform Modules

* **Executive dashboard (`/dashboard`)** — six KPI cards, annual and cumulative cash-flow charts,
  scenario comparison chart, rule-based risk alert panel, and an AI advisory recommendation panel.
* **Financial model (`/financial-model`)** — the full year-by-year FCF schedule with CSV export.
* **Scenarios (`/scenarios`)** — optimistic / base / pessimistic / custom, with the probability-weighted
  expected-NPV banner.
* **Sensitivity (`/sensitivity`)** — tornado chart plus 2-D heatmaps (WACC vs benefits, capex vs
  benefits) with the NPV = 0 break-even frontier.
* **Monte Carlo (`/monte-carlo`)** — 5,000-iteration seeded Mulberry32 simulation with histogram and
  cumulative S-curve.
* **AI assistant (`/ai-assistant`)** — six sample prompts and a deterministic fallback narrative when
  the advisory service is unavailable.
* **Portfolio optimiser (`/portfolio`)** — exact 0-1 dynamic-programming knapsack under capital
  rationing (see `CAPITAL_PORTFOLIO.md`).
* **Funding (`/funding`)** — debt/equity mix and CFADS-based debt service coverage ratio.
* **Real options (`/real-options`)**, **approvals (`/approvals`)**, **implementation plan**,
  **benefits tracker**, **assumptions register**, **printable board report**, **presentation mode**.

---

## Tech Stack

* **Framework:** Next.js 14.2.15 (App Router, React 18)
* **Language:** TypeScript, strict mode
* **Styling:** Tailwind CSS 3.4 plus a CSS-variable design system (`src/app/globals.css`)
* **State:** Zustand, persisted to localStorage
* **Charts:** Recharts; icons from Lucide
* **Testing:** Vitest 2.1 (unit) and Playwright (E2E)

---

## Quick Start

```bash
git clone https://github.com/krish2105/CF-CapExIQ.git
cd CF-CapExIQ
pnpm install
```

```bash
# development
pnpm dev

# production
pnpm build
pnpm start
```

Then open `http://localhost:3000`.

---

## Quality Gates

```bash
pnpm typecheck   # tsc --noEmit, TypeScript strict mode
pnpm lint        # next lint
pnpm test        # Vitest unit suites, including tests/golden.test.ts
pnpm build       # production compile
pnpm test:e2e    # Playwright smoke tests (see TESTING.md on server startup)
```

`tests/golden.test.ts` pins the exact published figures (NPV, IRR, MIRR, PI, payback, the full FCF
stream and the three scenario outcomes). If it fails, the engine has moved and every published
document must be re-checked — do not simply update the expected values.

Continuous integration runs on every push and pull request to `main` via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml): typecheck, lint, unit tests, production build.

---

## Deliverables

Course submissions live in [`submissions/`](submissions/):

| Deliverable | File | Status |
| :--- | :--- | :--- |
| **A** Individual report | `submissions/CapExIQ_Individual_Report.docx` | 1,445 words · 10 sections · all 5 main questions |
| **B** Dashboard / app | this repository | 26 page routes · 10 AI routes · 8 archetypes |
| **C** Presentation | `submissions/CapExIQ_Executive_Presentation.pptx` | 14 slides · ~9.5 min · speaker notes throughout |

See [`submissions/README.md`](submissions/README.md) for the requirement-by-requirement mapping.

## Documentation Index

| Document | Contents |
| :--- | :--- |
| `ASSUMPTIONS.md` | Assumptions register with data classification |
| `FINANCIAL_METHODOLOGY.md` | Formulas and the WACC derivation |
| `MODEL_RECONCILIATION.md` | Engine vs `NovaRetail_MFC_Financial_Model_Base.csv` |
| `MODEL_LIMITATIONS.md` | What the model does not do |
| `DATA_SOURCES.md` | The ten CSV datasets and their provenance |
| `RUBRIC_MAPPING.md` | Assignment brief coverage |
| `ARCHITECTURE.md` · `TESTING.md` · `SECURITY.md` · `DEPLOYMENT.md` | Engineering |
| `AI_GOVERNANCE.md` · `ACCESSIBILITY.md` | Governance and accessibility |
| `USER_GUIDE.md` · `DEMO_SCRIPT.md` · `CAPITAL_PORTFOLIO.md` | Usage |
| `AUDIT_FINDINGS.md` | Internal audit of the repository |

---

## Licence and Attribution

Built for an academic corporate finance assignment. **NovaRetail GCC is a hypothetical entity** and
the project assumptions are academic estimates, not company data. See `LICENSE`.

**Repository:** [https://github.com/krish2105/CF-CapExIQ](https://github.com/krish2105/CF-CapExIQ)
