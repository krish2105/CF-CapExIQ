# CapExIQ: Final Submission Audit Checklist

**Project:** CapExIQ — AI-Enabled Capital-Budgeting Decision Dashboard
**Topic:** Topic 9 — AI Capital-Budgeting Dashboard (installing automation technology)
**Entity:** NovaRetail GCC (hypothetical UAE omnichannel retailer)
**Assessment:** Postgraduate Corporate Finance group project

This checklist maps to the assignment brief, section by section. **Only items verified against the repository are ticked.** Items that are not yet done, or that are weaker than they look, are left unticked and explained.

---

## 1. Individual Report — Required Sections

- [x] **Section 1 — The financial problem.** `deliverables/01_individual_report_structure.md` §2: manual store-back-room picking at AED 14.50 per order, four decision options, and why the choice is material.
- [x] **Section 2 — Corporate finance concepts and formulas.** §3: FCF, NPV, IRR, MIRR, PI, payback and discounted payback, WACC — each with its formula and its decision rule.
- [x] **Section 3 — Data and assumptions with sources.** §4: a five-class provenance table (Historical, Current External, Forecast, User-entered, AI-generated) with the DataCo dataset, Federal Decree-Law 47/2022, DEWA tariffs and 3-month EIBOR cited.
- [x] **Section 4 — Calculations and results.** §5: the full six-year schedule, discount factors, present values, NPV AED 12,083,628, IRR 26.30%, MIRR 19.34%, PI 1.5035, payback 3.10 / 3.98 years.
- [x] **Section 5 — AI limitations and ethical risks.** §9: accuracy, incorrect data, hallucination, confidentiality, bias, and human review with responsibility placed on the CFO and Capital Expenditure Committee.
- [x] **Word count within limit:** 1,436 words excluding tables and headings.
- [x] **Hypothetical entity disclosed** in the report, in the application and in the board memorandum.

## 2. Dashboard — Six Required Components

All six are present on `/dashboard` and all recalculate from a single engine, so no two screens can disagree.

- [x] **1. KPI cards** — NPV, IRR, MIRR, profitability index, payback and discounted payback, against the 11.50% hurdle.
- [x] **2. Cash-flow visualisation** — annual free-cash-flow bar chart with a cumulative line crossing zero during Year 4.
- [x] **3. Scenario comparison** — Optimistic / Base / Pessimistic side by side, plus a user-driven Custom scenario.
- [x] **4. Sensitivity module** — `/sensitivity` carries a real diverging tornado chart (low and high bars either side of a zero reference line, sorted by swing) and two-dimensional NPV heatmaps. Every driver is flexed by an identical ±20%, so the ranking reflects the model rather than the ranges chosen.
- [x] **5. Risk alert panel** — ten severity-ranked deterministic rules. On the base case only the pessimistic-downside alert fires; the benefit-shortfall and salvage-dependence rules do not trigger (29.0% tolerance against a 15% trigger; salvage 8.61% of NPV against a 15% trigger).
- [x] **6. AI recommendation panel** — the dashboard now calls `/api/ai/recommend` and renders the structured decision, summary, drivers, risks and controls, labelled advisory.

## 3. AI Assistant — At Least Five Q&A

- [x] **Six suggested prompts implemented** on `/ai-assistant`, matching the brief's requirement of at least five: *"Why is the MIRR lower than the IRR?"*, *"What happens if the discount rate rises to 14.5%?"*, *"Which assumption has the greatest effect on the result?"*, *"Should management accept or reject this project?"*, *"Why would the NPV decrease under the pessimistic scenario?"*, *"Explain this result to a non-financial manager."*
- [x] **Worked sample answers documented** for all six in `deliverables/CapExIQ_Complete_Project_Guide_and_QnA.md`, so the requirement is evidenced in writing as well as in the running app.
- [x] **Context injection** — the current assumptions and computed metrics are passed into the prompt; the model is instructed to explain them and never to compute.
- [x] **Deterministic fallback** — if no API key is configured or the service fails, the page returns a clearly labelled advisory fallback built from the same engine output, with wording conditional on the actual numbers, so a negative NPV never reads as an endorsement.

## 4. Scenario and Sensitivity Requirements

- [x] **Three scenarios modelled** — Optimistic NPV AED 19,013,977 / IRR 33.59% / PI 1.830 / payback 2.63 yrs; Base AED 12,083,628 / 26.30% / 1.504 / 3.10 yrs; Pessimistic (AED 4,940,625) / 8.23% / 0.819 / 5.06 yrs → Reject.
- [x] **Probability-weighted expected NPV** — AED 9,560,152 on a 50/25/25 weighting.
- [x] **Tornado ranking** — operating benefits first at AED 16.67M of swing, then project life 8.39M, CapEx 8.25M, WACC 5.17M, OpEx 3.57M, savings growth 1.10M, salvage 0.37M.
- [x] **Break-even thresholds** — benefits may fall 29.0%; total outlay may rise 50.4% to AED 36.08M; NPV reaches zero at a 26.30% discount rate.
- [x] **Monte Carlo simulation** — 5,000 runs on seed 12345: mean NPV ≈ AED 10.5M, probability of a negative NPV ≈ 0.3%.

## 5. Financial Controls & Governance

- [x] **Year-0 cash flow strictly negative** — AED (24,000,000), being AED 22.0M CapEx plus AED 2.0M working capital.
- [x] **Tax treatment** — 9% UAE corporate tax applied to EBIT.
- [x] **Depreciation tax shield** — straight-line (22.0M − 2.0M) ÷ 6 = AED 3,333,333 per year, deducted for tax and added back as non-cash.
- [x] **Working capital** — AED 2.0M invested at Year 0, recovered in full at Year 6, excluded from the depreciable base.
- [x] **Salvage** — AED 2.0M in the Year-6 terminal cash flow.
- [x] **IRR robustness** — Newton–Raphson with bisection fallback and a sign-change warning for non-conventional cash flows.
- [x] **WACC derived, not assumed** — cost of equity 15.35% (4.20% risk-free + 1.15 × 6.00% ERP + 0.75% country + 3.50% execution); after-tax cost of debt 5.72% (3.79% EIBOR + 2.50% spread, taxed); 60/40 weighting → 11.50%.

## 6. Ethics, AI Governance & Data Handling

- [x] **AI performs zero arithmetic** — every metric is computed in deterministic TypeScript; the AI layer receives computed values as context.
- [x] **Server-side AI integration** — `/api/ai/explain` and `/api/ai/recommend` are Route Handlers holding `OPENAI_API_KEY` server-side, with Zod validation on the request payload and a question-length cap. The `/explain` request contract was broken and has been repaired; `/recommend` existed but was called by no page and is now wired into the dashboard. Both degrade to a labelled deterministic fallback rather than failing silently.
- [x] **Provenance visible in the product** — `/assumptions` drives every badge from the register's `dataClassification` field with a five-class legend and live counts, and surfaces each field's source, last-updated date and notes.
- [x] **Advisory labelling and human sign-off** — every AI output carries a disclaimer; final responsibility is assigned to the CFO and the Capital Expenditure Committee.
- [x] **Confidentiality** — only aggregated financial outputs leave the server; no personal or customer data is transmitted; credentials never reach the client.
- [x] **Hypothetical-entity disclaimer** — NovaRetail GCC is labelled hypothetical across the application, the report and the board memorandum; the DataCo dataset is genuine external operational data and is never presented as NovaRetail's accounts.

## 7. Final Recommendation

- [x] **Recommendation stated and justified: APPROVE.** NPV AED 12.08M, IRR 26.30% against an 11.50% hurdle, PI 1.50, payback inside four years, expected NPV AED 9.56M.
- [x] **Condition 1** — release capital against measured Year-1 savings rather than against the calendar, because benefit realisation dominates every other driver.
- [x] **Condition 2** — require a vendor performance guarantee and a secondary-market buyback, because the pessimistic case destroys AED 4.94M.
- [x] **Consistent across every deliverable** — report §10, deck slides 13–15, board memorandum on `/printable-report`, and the executive Q&A handbook all state the same recommendation and the same two conditions.

## 8. Technical Implementation

- [x] **Next.js App Router** — 24 page routes plus 2 API route handlers.
- [x] **Strict TypeScript** — shared domain interfaces in `src/lib/types/finance.ts`.
- [x] **Deterministic finance engine** — `src/lib/finance/` (cashflow, metrics, scenarios, sensitivity, risk, WACC, Monte Carlo, capacity, portfolio, funding, strategic scorecard).
- [x] **Zustand store** — persisted to local storage for live assumption editing and custom scenario tuning.
- [x] **React Hook Form + Zod** — bounded validation with inline error feedback on the assumptions register.
- [x] **Recharts visualisations** — FCF bar chart, cumulative line, scenario comparison, diverging tornado, heatmaps, Monte Carlo distribution.
- [x] **CSV export** — `/financial-model` exports the six-year schedule; the export agrees to the dirham with `NovaRetail_MFC_Financial_Model_Base.csv`.
- [x] **Labour-savings bridge** — `/capacity-model` derives ~AED 7.49M of annual saving from FTEs displaced × loaded cost, corroborating the AED 7.5M forecast bottom-up.

## 9. Testing & Verification

- [x] **Vitest unit suites — 12 files:** `cashflow`, `csv`, `funding`, `knapsack`, `metrics`, `monteCarlo`, `portfolio`, `risk`, `scenarios`, `sensitivity`, `strategicScorecard`, `wacc`.
- [x] **Golden-value regression suite** — `tests/golden.test.ts`, 14 cases pinning the exact free-cash-flow vector, NPV, IRR, MIRR, PI, both payback measures and the three scenario results. The other suites assert loose inequalities and would stay green while the model drifted; this file closes that gap.
- [ ] **Test count stated in the submission pack** — run `pnpm test` and record the passing count before submitting. Do not restate a remembered figure; the suite has changed.
- [x] **Playwright E2E — 5 tests** in `e2e/app.spec.ts`. These are **route smoke checks**: each loads a page (`/`, `/dashboard`, `/monte-carlo`, `/external-data`) and asserts the `h1` renders, with a small number of text-presence assertions and a theme-toggle visibility check. **They do not exercise assumption editing, scenario switching or AI prompts** — do not claim they do.
- [ ] **E2E coverage of interactive flows** — not implemented. If an examiner asks about end-to-end coverage, state the limitation and point to the golden suite as the real regression guarantee.

## 10. Submission Package

- [x] **Submission A — Individual report:** `deliverables/01_individual_report_structure.md` (1,436 words, five required sections).
- [x] **Submission B — Presentation:** `CapExIQ_Executive_Board_Presentation.pptx`, 15 slides, timed at 9 minutes 10 seconds against a 7–10 minute brief; structure and speaker notes in `deliverables/02_presentation_deck_structure.md`.
- [ ] **Submission B — deck figure sweep:** the `.pptx` still carries legacy values (5-year horizon, AED 4.4M depreciation, 32.5% benefit break-even, 50.3% capex overrun). The full correction list is in `deliverables/02_presentation_deck_structure.md` under "Deck Build Notes"; apply it before submitting.
- [x] **Submission C — Live demonstration:** `deliverables/03_live_demonstration_script.md`, 5 minutes across 8 timed steps, every step verified against the running application.
- [x] **Model reconciliation:** `deliverables/04_financial_model_reconciliation.md`, reconciling the engine against `NovaRetail_MFC_Financial_Model_Base.csv` and the golden suite.
- [x] **Executive Q&A handbook:** `deliverables/CapExIQ_Complete_Project_Guide_and_QnA.md`, 20 board questions plus six AI-assistant sample exchanges.
- [ ] **Regenerate `CapExIQ_Complete_Project_Guide_and_QnA.pdf`** — the existing PDF was generated from a superseded model (NPV AED 4.68M, IRR 17.65%, working capital AED 1.0M) and every figure in it is wrong. Re-export it from the corrected markdown before submitting.
- [x] **Documentation:** `README.md`, `.env.example`, `ARCHITECTURE.md`, `FINANCIAL_METHODOLOGY.md`, `AI_GOVERNANCE.md`, `MODEL_LIMITATIONS.md`, `DATA_SOURCES.md`.

---

**Outstanding before submission:** record the verified test count, apply the deck figure sweep, and regenerate the Q&A PDF. Everything else on this list has been checked against the repository.
