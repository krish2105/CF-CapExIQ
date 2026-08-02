# CapExIQ — Assignment Brief Coverage Map

**Topic 9 — AI Capital-Budgeting Dashboard.**

This document maps each requirement of the assignment brief to the application route or document that
satisfies it, with the evidence file. Where a requirement is only partially satisfied, it says so.

Legend: **Met** · **Partially met** (gap stated).

---

## A. Report Sections

| # | Brief requirement | Where it is satisfied | Evidence | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Introduction | `deliverables/01_individual_report_structure.md` §1–2; app landing page `/` | `deliverables/01_individual_report_structure.md` | Met |
| 2 | Corporate finance concepts, all formulas presented | `FINANCIAL_METHODOLOGY.md` (FCF, NPV, IRR, MIRR, PI, payback, discounted payback, ROI, CAPM/WACC build-up); in-app `FormulaInspector` component; `/data-sources` | `FINANCIAL_METHODOLOGY.md`, `src/components/finance/FormulaInspector.tsx`, `public/data/10_finance_formula_catalog.csv` | Met |
| 3 | Data and assumptions, distinguishing historical / current / forecast / user-entered / AI-generated | `ASSUMPTIONS.md` (explicit data-classification column and class key); `/assumptions` register; `DATA_SOURCES.md` | `ASSUMPTIONS.md`, `src/lib/data/defaultAssumptions.ts` (`dataClassification` field), `public/data/03_capexiq_project_assumptions.csv` | Met — note that **no** input is AI-generated, which is stated explicitly rather than left implied |
| 4 | Financial calculations, minimum three major | Eight are computed: NPV, IRR, MIRR, PI, payback, discounted payback, ROI, WACC. `/financial-model`, `/dashboard` | `src/lib/finance/metrics.ts`, `tests/golden.test.ts`, `MODEL_RECONCILIATION.md` | Met |
| 5 | AI features — at least five, each stating what it does, what information it uses, what result it produces, how it helps the decision-maker, and its limitation or risk | Section D below | `AI_GOVERNANCE.md`, `src/app/api/ai/explain/route.ts`, `src/app/api/ai/recommend/route.ts`, `src/app/ai-assistant/page.tsx` | **Partially met** — five decision-support features are documented, but only **three** of them call a language model; the other two are deterministic analytics presented as intelligent assistance. This distinction is stated openly rather than blurred |

---

## B. Dashboard — Minimum Six Visual Components

| # | Required component | Route | Implementation | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | KPI cards, at least four indicators | `/dashboard` | **Six** cards: initial outlay, baseline NPV, IRR/MIRR, profitability index, payback, discounted payback | Met |
| 2 | Financial trend / cash-flow chart | `/dashboard`, `/financial-model` | Annual FCF bar chart **and** cumulative + discounted cumulative line chart (Recharts) | Met |
| 3 | Scenario comparison (optimistic / base / pessimistic) | `/dashboard`, `/scenarios` | Scenario comparison bar chart plus a full comparison table and the probability-weighted expected-NPV banner | Met |
| 4 | Sensitivity analysis, at least two variables | `/sensitivity` | **Seven** one-way drivers on a tornado chart plus two 2-D heatmaps (WACC × benefits, CapEx × benefits) with the NPV = 0 frontier | Met |
| 5 | Risk and alert panel | `/dashboard` | Rule-based alert engine with eleven alert rules graded Critical / High / Medium / Low | Met |
| 6 | AI recommendation panel | `/dashboard` | Structured AI advisory panel (recommendation, rationale, principal risks) with a human-approval disclaimer and a deterministic fallback narrative when the service is unavailable | Met |

Supporting routes beyond the six required: `/monte-carlo`, `/portfolio`, `/funding`, `/real-options`,
`/capacity-model`, `/strategic-scorecard`, `/vendor-analysis`, `/benefits-tracker`, `/approvals`,
`/implementation-plan`, `/electricity-estimator`, `/external-data`, `/operational-analytics`,
`/csv-management`, `/printable-report`, `/presentation`, `/settings`, `/data-sources`.

---

## C. AI Finance Assistant — At Least Five Sample Q&A

| Requirement | Where | Status |
| :--- | :--- | :---: |
| ≥ 5 sample questions with answers | `/ai-assistant` ships **six** one-click sample prompts | Met |

The six prompts are: *Why is the MIRR lower than the IRR?* · *What happens if the discount rate rises
to 14.5%?* · *Which assumption has the greatest effect on the result?* · *Should management accept or
reject this project?* · *Why would the NPV decrease under the pessimistic scenario?* · *Explain this
result to a non-financial manager.*

Worked answers are also written out in `deliverables/CapExIQ_Complete_Project_Guide_and_QnA.md`.

---

## D. The Five AI / Decision-Support Features

| # | Feature | What it does | Information it uses | Result it produces | How it helps the decision-maker | Limitation / risk | Uses an LLM? |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | **AI finance assistant** (`/ai-assistant`) | Answers free-text and preset questions about the appraisal | The computed metrics, active scenario and assumptions, passed as validated JSON | A natural-language explanation | Makes the numbers interpretable for non-financial stakeholders | Can hallucinate or over-state confidence; answers are advisory only and are never fed back into the model | **Yes** |
| 2 | **AI metric explainer** (`/api/ai/explain`) | Explains an individual metric in context | The single metric plus surrounding assumptions | A short contextual narrative | Reduces the finance-literacy barrier at the point of use | Same hallucination risk; explanation quality depends on the prompt | **Yes** |
| 3 | **AI recommendation panel** (`/api/ai/recommend`, shown on `/dashboard`) | Produces a structured board recommendation | Base metrics and all three scenario outcomes | Zod-validated JSON: recommendation, rationale, principal risks | Gives a first-draft board narrative that a human then owns | The model may reason from correct numbers to a poor conclusion; output is schema-validated but not fact-checked; a deterministic fallback is used if the service fails | **Yes** |
| 4 | **Monte Carlo risk engine** (`/monte-carlo`) | Runs 5,000 seeded iterations over distributions for CapEx, savings, OpEx and WACC | The assumption set plus distribution parameters | Mean/median NPV, P10/P50/P90, probability of a negative NPV, histogram and S-curve | Converts a single-point NPV into a probability statement | **Not an LLM** — it is deterministic simulation. Output is only as good as the assumed distributions | No |
| 5 | **Rule-based risk alert engine** (`/dashboard`) | Evaluates eleven governance rules against the live model | Metrics, assumptions and the pessimistic scenario | Severity-ranked alerts with recommended responses | Surfaces threshold breaches automatically instead of relying on the reader to spot them | **Not an LLM** — it is a deterministic rule set and cannot detect a risk no rule anticipates | No |

**Honest statement of the gap:** the brief asks for five AI features. Three of the five above use a
language model. Features 4 and 5 are deterministic quantitative and rule-based intelligence. This is a
deliberate design choice — no financial number in this application is produced by a language model —
but it should not be presented as five LLM features.

---

## E. Scenario and Sensitivity Requirements

| Brief question | Answer produced by the app | Where | Status |
| :--- | :--- | :--- | :---: |
| Which variable has the greatest impact? | **Operating benefits** (savings + contribution margin): an NPV swing of **AED 16.67M** at ±20%, roughly double the next driver (project life, 8.39M) | `/sensitivity` tornado chart | Met |
| Under what conditions does the decision change? | NPV reaches zero if operating benefits fall **29.0%**, if total outlay rises **50.4%** (to AED 36.08M), or at a discount rate of **26.30%**. The decision flips to **Reject** under the pessimistic scenario (NPV −AED 4,940,625, PI 0.819) | `/sensitivity` heatmaps, `/scenarios` | Met |
| What is the main financial risk? | Benefit realisation. The base case has only a 29.0% cushion on the benefit forecast, and the benefit stream is the dominant driver | `/dashboard` risk panel (`RISK-BENEFIT-SENS`, `RISK-PESSIMISTIC-NEG`) | Met |
| What is the best management response? | Stage the capital release against measured Year-1 savings, and require a vendor performance guarantee and buyback of the residual value | `README.md` recommendation, `/approvals`, `/benefits-tracker`, `/real-options` | Met |

---

## F. Ethical Use of AI

| Brief topic | Where addressed | Status |
| :--- | :--- | :---: |
| Accuracy | `AI_GOVERNANCE.md` §4 — all financial figures are deterministic; the LLM never computes | Met |
| Incorrect data | `AI_GOVERNANCE.md` §5; `MODEL_LIMITATIONS.md`; `ModelHealthPanel` component | Met |
| Hallucinations | `AI_GOVERNANCE.md` §6 — deterministic fallback narrative, schema validation, explicit warning | Met |
| Confidentiality | `AI_GOVERNANCE.md` §2–3; `SECURITY.md` — API key server-side only, no PII in prompts | Met |
| Bias | `AI_GOVERNANCE.md` §7 — model, prompt and assumption-anchoring bias | Met |
| Human review | `AI_GOVERNANCE.md` §8 — "AI advisory — human approval required" label on every AI output; `/approvals` sign-off | Met |
| Responsibility | `AI_GOVERNANCE.md` §9 — named accountability, AI is never the decision-maker of record | Met |

---

## G. Submissions

| Item | Brief requirement | Deliverable | Status |
| :--- | :--- | :--- | :---: |
| A | Individual report, 1,300–1,650 words | `deliverables/01_individual_report_structure.md` — 1,436 words excluding tables and headings; board PDF at `CapExIQ_Board_Investment_Report.pdf` | Met |
| B | Dashboard / application | This Next.js application: 24 feature page routes plus the `/` overview, and 2 API routes | Met |
| C | Presentation, 7–10 minutes, 8–15 slides | `CapExIQ_Executive_Board_Presentation.pptx` — 15 slides, 9 min 10 s of scripted speaking time; structure in `deliverables/02_presentation_deck_structure.md`, walkthrough in `DEMO_SCRIPT.md` | Met — 15 slides is at the upper bound of the permitted range |

---

## H. The Five Main Questions

| Q | Question | Answer location |
| :---: | :--- | :--- |
| Q1 | What decision is being made and why does it matter? | `README.md` Executive Overview; report §1–2; `/` and `/dashboard` |
| Q2 | Which concepts, formulas, data and assumptions are used? | `FINANCIAL_METHODOLOGY.md`, `ASSUMPTIONS.md`, `DATA_SOURCES.md`; `/assumptions`, `/data-sources` |
| Q3 | What do the calculations show across the three scenarios? | `/scenarios`, `/dashboard`; `MODEL_RECONCILIATION.md` §5 — Approve / Approve / **Reject**, expected NPV AED 9,560,152 |
| Q4 | How does AI improve the analysis? | Section D above; `AI_GOVERNANCE.md`; `/ai-assistant`, `/dashboard` AI panel |
| Q5 | What is the final recommendation, and what financial and AI risks attach to it? | `README.md` Recommendation (Approve, subject to two conditions); `MODEL_LIMITATIONS.md`; `AI_GOVERNANCE.md`; `/printable-report` |
