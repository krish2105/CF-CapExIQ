# CapExIQ — Full Project Audit

Audit date: 2026-07-27 · Scope: 8,741 LOC across `src/`, 11 unit test files, 1 e2e file, 13 root docs, 5 deliverables, 10 CSV datasets.
Method: full source read + live execution of the finance engine to establish ground truth.

---

## 0. Verdict

The engineering surface is genuinely impressive — 24 pages, a pure-TypeScript deterministic finance core, Zustand persistence, Zod validation, Recharts, a seeded Monte Carlo, and a well-built CSV data pack with real source URLs. That is well above the level this assignment expects.

But three things are broken in ways that would be fatal in a live demo or a close read:

1. **The app does not build or run right now.**
2. **Every headline financial number in the report, the decks, the reconciliation docs, and several UI components is wrong** — the model returns NPV 12.08M, the documents all say 9.18M.
3. **There is no working AI integration.** One endpoint is never called; the other is called with a mismatched contract and silently falls back to a canned string 100% of the time.

Since the assignment is *"AI-Enabled Corporate Finance Decision Dashboard"*, item 3 is the one that costs the most marks.

---

## 1. P0 — Blockers (fix before anything else)

### P0-1 · `pnpm build` and `pnpm dev` fail — the app cannot start

```
TypeError: _semver.default.lt is not a function          (first run)
SyntaxError: Error parsing next/dist/compiled/find-up/package.json:
             Unexpected end of JSON input                 (after reinstall)
```

`pnpm install` reports "Already up to date" because it validates the lockfile, not file integrity — so it will not self-heal.

**Root cause:** the project lives in `~/Desktop/AI Agent Projects/`, which is under **iCloud Drive Desktop sync**. `brctl status` confirms active syncing of that exact path (`Needs Apply Changes: Under /Desktop/AI Agent Projects`). iCloud evicts and re-materialises files inside `node_modules`, producing truncated reads. The same `find-up/package.json` failed to parse for Next and parsed fine on a direct re-read seconds later — the signature of a dataless-file race.

**Fix:**
```bash
mv ~/Desktop/"AI Agent Projects" ~/dev-projects
```
then
```bash
cd ~/dev-projects/"CF PROJECT ANTIGRAVITY" && rm -rf node_modules .next && pnpm install && pnpm build
```
Do this first. Nothing else can be verified until it builds.

### P0-2 · `pnpm test` fails to start — zero tests currently run

```
SyntaxError: The requested module 'vite' does not provide an export
             named 'parseAstAsync'
```

`vitest@2.1.9` resolved against `vite@5.4.21`; `@vitejs/plugin-react@4.7.0` also needs a newer Vite (`vite.createFilter is not a function`). Caused by `^` ranges drifting.

`deliverables/05_final_submission_checklist.md` ticks **"15 passing tests across 5 test suites"**. That claim is currently false and is trivially disproved by running the command.

**Fix:** pin `vite@^5.4.0` explicitly in devDependencies, or upgrade to `vitest@^3` + `@vitejs/plugin-react@^5`, then re-run.

### P0-3 · `npx tsc --noEmit` fails — 3 errors

```
src/components/layout/Sidebar.tsx(5,10)          TS2305 'usePathname' not exported from next/navigation
src/components/navigation/CommandPalette.tsx(4,10) TS2305 'useRouter' not exported from next/navigation
vitest.config.ts(2,19)                            TS2306 @vitejs/plugin-react is not a module
```

Same dependency corruption. There is also **no `typecheck` script** in `package.json`, so this never gets caught.

### P0-4 · No version control on a group project

`git rev-parse` → *not a repository*. No `.git`, no `.gitignore`. On a multi-person submission with no history, no branches, and no backup, one bad save loses the project. `node_modules/` and `.next/` are also being synced to iCloud as a result.

---

## 2. CFO — Financial correctness

### 2.1 · Ground truth vs. what every document claims

I executed the shipped engine on `DEFAULT_FINANCIAL_ASSUMPTIONS`. These are the real numbers:

| Metric | **Engine (actual)** | Docs / report / UI claim | Error |
| :-- | --: | --: | --: |
| NPV | **AED 12,083,628** | AED 9,184,210 | **−24 %** |
| IRR | **26.30 %** | 23.14 % | −3.2 pp |
| MIRR | **19.34 %** | 16.52 % | −2.8 pp |
| Profitability Index | **1.5035** | 1.383 | −0.12 |
| Payback | **3.10 yrs** | 3.19 yrs | — |
| Discounted payback | **3.98 yrs** | 4.08 / 4.78 yrs *(two different docs)* | — |
| PV of inflows | **AED 36,083,628** | AED 33.18M | −2.9M |
| ROI | **123.3 %** | 56.5 % | −67 pp |
| Optimistic NPV | **AED 19.01M** | 15.42M | −3.6M |
| Optimistic IRR | **33.59 %** | 31.4 % | — |
| Pessimistic NPV | **AED −4.94M** | −2.14M | understated by 2.8M |
| Pessimistic IRR | **8.23 %** | 9.8 % | — |
| Pessimistic PI | **0.819** | 0.92 | — |
| Pessimistic decision | **Reject** | "phased implementation or delay" | wrong call |

Real base-case FCF stream: `-24,000,000 | 7,398,000 | 7,724,690 | 8,066,186 | 8,423,154 | 8,796,293 | 13,186,330`

**The phantom 9.18M appears in 8 places** and is produced by no code path in the repository:
- `src/lib/finance/portfolio.ts:9,11` (`npv: 9184210`, `profitabilityIndex: 1.383`)
- `src/components/finance/FormulaInspector.tsx:20,28,36,43,44`
- `src/app/presentation/page.tsx:214`
- `src/app/api/ai/recommend/route.ts:15`
- `MODEL_RECONCILIATION.md`, `deliverables/04_financial_model_reconciliation.md`
- `deliverables/01_individual_report_structure.md`, `02_presentation_deck_structure.md`, `03_live_demonstration_script.md`, `DEMO_SCRIPT.md`, `FRONTEND_DESIGN_SYSTEM.md`

### 2.2 · `MODEL_RECONCILIATION.md` is an unsupportable audit claim — treat as urgent

The document states a **line-by-line 0.00 % variance reconciliation against `NovaRetail_MFC_Capital_Budgeting_Model.xlsx`** and marks six metrics **PASSED**. Three problems:

1. **That Excel file does not exist in the repository.**
2. Its table describes a *different model*: OpEx 1.80M (code: 2.20M), depreciation 4.80M/yr (code: 3.333M), savings growth 10 % (code: 4 %), FCF₁ 5.619M (code: 7.398M).
3. **Its own numbers don't produce its own answer.** Discounting its own stated FCFs at 11.5 % gives NPV ≈ **+1.87M**, not the 9,184,210 it reports as PASSED.

`src/components/finance/ModelHealthPanel.tsx:42` renders this as a live green diagnostic: *"0.00 % variance vs. Master Excel Financial Validation Model across all 6 annual cash flow lines"* — with `status: 'Healthy'` **hardcoded**. Check #4 is likewise hardcoded ("verified reproducible across client environments"). 3 of the 5 "diagnostics" are constants, so the "Healthy System Health" badge is meaningless.

An examiner who asks to see the Excel model has nothing to show. Either build the reconciliation for real against the corrected numbers, or delete both documents and the fabricated checks. Do not submit as-is.

### 2.3 · The 11.5 % hurdle rate is unsupported by the app's own WACC engine

`calculateWacc()` with the app's own default inputs (Rf 4.2 %, β 1.15, ERP 6.0 %, EIBOR 4.85 %, spread 2.5 %, τ 9 %, D/V 40 %) returns **9.34 %**. The model discounts at **11.5 %**. `tests/wacc.test.ts:20` asserts the 9.34 % result, so the repo formally tests a number it then ignores.

`FINANCIAL_METHODOLOGY.md` quotes a *third* input set (Rf 4.25 %, ERP 5.50 %, β 1.10, spread 1.65 %) which computes to **8.55 %** — and then asserts "Where r = WACC = 11.5 %" on the same page. Self-contradictory.

**Fix:** state it explicitly — *WACC 9.34 % + 2.16 pp project execution risk premium = 11.5 % hurdle* — and add the premium as a visible, editable field. This is exactly the question a finance examiner will ask.

Also missing on the WACC page: no Hamada unlevering/relevering of β for NovaRetail's 40 % D/V; no UAE country risk premium; no statement that AED cash flows are discounted at a USD-derived rate (defensible under the AED peg, but it must be said).

### 2.4 · Two irreconcilable "costs of capital" in the same app

`src/lib/finance/funding.ts:24-26` computes `weightedCostOfCapital` as an amount-weighted average of *pre-tax* rates, with Cash at **0 %**:

> 0.4 × 0 % + 0.4 × 6.5 % + 0.2 × 5.8 % = **3.76 %**

The funding page labels this "Weighted Cost of Borrowing". It is neither: internally generated cash carries the cost of equity (~11 %), not zero, and the actual borrowing cost is 6.27 % (debt-weighted). A CFO reading 3.76 % on one page and 11.5 % on another will stop the meeting. **Verified live: 3.76 %.**

Related, in the same module:
- DSCR uses **EBITDA** (`funding.ts:28`), not CFADS (EBITDA − tax − ΔWC − maintenance capex). Overstates coverage. Verified: DSCR 2.38× on EBITDA 7.80M.
- Only Year-1 DSCR is computed; a lender wants the **minimum DSCR across the tenor**, charted.
- `dscr = ... : 999` — magic sentinel instead of `null`.
- KPI card renders `text-success` green even when the covenant alert is firing.
- Funding mix is read-only and disconnected from `wacc.ts`'s `debtWeight` and from the FCF model. Three unlinked representations of capital structure.

### 2.5 · Engine defects confirmed by execution

| # | Defect | Evidence |
| :-- | :-- | :-- |
| a | **Salvage > depreciable capex → negative depreciation.** With salvage 30M vs capex 22M: annual depreciation **−1,333,333**, Y1 EBIT (9.13M) **exceeds EBITDA** (7.80M), NPV inflates to **24.9M**, status "Approve". Zod only enforces `min(0)`. | `cashflow.ts:41`, `schema.ts:26` |
| b | **`maxOperatingBenefitShortfallPct` returns NaN** when benefits = 0 (divide-by-zero on `baseBenefits`). Renders as `NaN` in the UI. | `metrics.ts:236,251` |
| c | **Break-even bisection has no bracket check.** If NPV is still negative at 2× benefits it silently returns the bound: verified **−100.0 %** shortfall tolerance and **−113.2 %** overrun tolerance — nonsense values presented as analysis. | `metrics.ts:222-255` |
| d | **Sign-concatenation bug.** Sensitivity cards render `+{value}%` and `-{value}%`. With the negative values from (c) the user sees literal **`+-113.2%`** and **`--100.0%`**. | `sensitivity/page.tsx:122,129` |
| e | **Non-depreciable capex gets no tax deduction, ever.** The Settings page states such items are *"written off immediately in Year 0"* — the code simply drops them from the depreciable base with no year-0 shield. Documentation and code disagree **in opposite directions on NPV**. | `cashflow.ts:35-38` vs `settings/page.tsx:63` |
| f | **`workingCapitalRecovery` is unconstrained.** Setting it to 10M against an initial 2M yields NPV 16.2M — free money. No cross-field Zod validation. | `schema.ts:27` |
| g | **No loss carry-forward.** `tax = max(0, EBIT × τ)` gives no shield in loss years, creating asymmetry that biases Monte Carlo downside. Conservative, but must be disclosed. | `cashflow.ts:80` |
| h | **UAE 0 % band on the first AED 375,000 is ignored** — flat 9 % on all EBIT. `06_uae_corporate_tax_rates.csv` correctly encodes the two-band structure and the engine doesn't read it. | `cashflow.ts:80` |
| i | **MIRR returns `0` on degenerate input** instead of `null`, so "0.00 %" can be displayed as a real MIRR. | `metrics.ts:196` |
| j | **`changeWorkingCapital` is set to `+recovery` in the terminal year and never rendered** — a dead, wrong-signed field that will double-count the moment anyone sums the column. | `cashflow.ts:108` |
| k | Newton–Raphson has no `rate <= -1` guard before `Math.pow`. | `metrics.ts:120-142` |
| l | Decision thresholds are magic numbers: NPV < −2,000,000 → Reject; payback ≤ 4.5 yrs; PI ≥ 1.05. Not configurable, not documented, not derived from policy — and the Settings page is titled *"Recommendation Engine Thresholds"* while exposing none of them. | `metrics.ts:265-267` |

### 2.6 · Scenario engine — structural issues

- **`transformAssumptionsForScenario` forces absolute discount rates** (10.5 / 11.5 / 14.5 %). If a user applies a computed WACC of, say, 10.7 % from the External Data page, the Dashboard discounts at 10.7 % but the Scenarios page "Base Case" card still says 11.5 % and computes at 11.5 %. **Two different Base NPVs on two pages.** Scenario rates should be *offsets* from the live base WACC.
- `getActiveAssumptions()` returns raw assumptions for Base but transformed assumptions for the others — the asymmetry is what creates the divergence above. (`useFinancialStore.ts:130`)
- Scenarios don't scale `initialWorkingCapital` or `salvageValue` — a +15 % cost-overrun world keeps identical working capital and resale value.
- **No probability weighting** → no expected NPV = Σ pᵢ·NPVᵢ. Standard in scenario analysis, and cheap to add.
- Scenario card hurdle rates are **hardcoded strings** `10.5%` / `11.5%` / `14.5%` (`scenarios/page.tsx:79,127,175`).

### 2.7 · Sensitivity & tornado

- **The tornado chart does not work.** `<Bar dataKey="spread" />` plots an always-positive magnitude from zero, while a `ReferenceLine` labelled "Baseline NPV" sits at 12.08M with no relationship to the bars. `lowNpv`/`highNpv`/`baseNpv` are computed into the data and **never used**. A tornado must plot low→high *around* the base. (`sensitivity/page.tsx:47-53,155-156`)
- **Displayed parameter values are wrong.** The "Initial Capital Expenditure" row uses `baseValue = automationEquipment` (18M) while the transform scales *all four* capex lines (22M). The benefits row uses `year1OperatingSavings` (7.5M) while scaling savings *and* margin (10.0M). Every `parameterValue` in the 1-way table is understated. (`sensitivity.ts:16-43,151`)
- **Tornado ranges are not comparable.** Capex/benefits/opex/salvage at ±20 %, WACC at ±3 pp, life 4–8 yrs, growth 1–7 %. Ranking spreads across inconsistent bands is the classic tornado error — normalise to a common confidence band (e.g. Monte Carlo P10/P90).
- Grids are hardcoded around 11.5 % / 4 % / 6 yrs rather than centred on the live base case.
- Heatmaps are binary green/red, not graded; `decisionStatus` is computed per cell and never shown; the base-case cell isn't highlighted; the NPV = 0 frontier isn't marked.
- **No generated narrative.** The brief explicitly requires stating *which variable has the greatest impact* and *under what conditions the decision changes*. The page shows numbers and says nothing.
- "Max Initial Outlay Limit" is labelled "Max Capex Outlay" but the value includes working capital.

### 2.8 · Monte Carlo

- **Variables are sampled independently** — no correlation matrix. Capex overruns and benefit shortfalls are strongly correlated in reality; independence **understates P(NPV<0)**. This is the first thing a quant will say.
- **Only Year-1 savings is sampled.** `year1ContributionMargin`, `annualSavingsGrowth` and `annualMarginGrowth` are held at base in all 5,000 iterations — a large share of benefit uncertainty is excluded, and it's inconsistent with the scenario/sensitivity modules which move savings and margin together.
- Normal draws are **clamped** to `[min,max]`, not truncated — creates point masses at the bounds and biases the mean.
- No **standard error of the mean** reported (σ/√n), so the reader can't judge simulation precision.
- `probIrrAboveWaccPct` and `probPaybackUnderTargetPct` are computed and **never displayed**.
- `<ReferenceLine x="0M" />` matches a categorical bin label that will essentially never exist → **the break-even line never renders**. (`monte-carlo/page.tsx:123`)
- `iterations`/`seed` fall back on `||`, so `0` silently becomes 5000/12345.
- Payback target 4.5 yrs hardcoded.
- Raw LaTeX renders literally on screen: `$S$-Curve ($P(NPV \le X)$)` and `($NPV > 0$)`. (`monte-carlo/page.tsx:74,133`)
- `DEMO_SCRIPT.md` quotes "Mean NPV of AED 9.18M with only a 0.2 % probability of loss" — the 9.18M is definitively wrong; the 0.2 % is unverified.

### 2.9 · Portfolio, vendors, real options, capacity

**Portfolio** (`portfolio.ts`)
- MFC NPV/IRR/PI are **hardcoded and stale**, displayed under the column header "Calculated NPV". Contradicts the Dashboard on screen.
- Subtitle says "Deterministic **Knapsack** PI Engine" — it is a **greedy PI sort**, not a knapsack solver. For indivisible projects greedy PI is not optimal. Either implement the 0-1 DP or stop calling it a knapsack.
- **`weightedPortfolioIrr` is an investment-weighted average of IRRs — mathematically invalid.** IRRs don't aggregate that way; compute the IRR of the combined cash-flow stream.
- MFC is `isMandatory: true` and force-selected — **circular**: the entire app exists to decide whether to do the MFC, and the portfolio module assumes it's already approved.
- **No Equivalent Annual Annuity (EAA)** despite five projects of presumably unequal life. Standard requirement.

**Vendors** (`vendors.ts`) — arithmetic checks out, but **TCO is undiscounted**: Year-0 capex is added to Years 1–6 maintenance at face value. Discounted at 11.5 %, KNAPP (25.52M) and AutoStore (25.52M) become a dead heat instead of a 120k gap; after-tax treatment shifts it again. In a corporate finance project, an undiscounted TCO is a marked error. The `score` column (4.6/4.4/4.2/4.1) has no stated weighting. Vendor choice also doesn't feed back into `automationEquipment`.

**Real options** (`realOptions.ts`) — **contains no option valuation.** `expectedNpv: baseNpv * 0.85` and `* 0.75` are arbitrary haircuts; `initialOutlay: 14000000` and `downsideProtectionPct: 41.7` are hardcoded and won't move with the model. The deferral option isn't valued by shifting cash flows a year and re-running, let alone binomially. Either implement it properly (the engine makes the deferral case ~10 lines) or rename the page "Phased Investment Paths (illustrative)".

**Capacity** (`capacity.ts`) — `costPerOrderSavingsAed` **hardcodes 7,500,000** instead of reading the assumption (line 38). `manualFteRequired` uses 2,000 hrs/FTE while everything else uses `hours × days`. "Pick lines" and "items" are treated as 1:1. Utilisation can exceed 100 % with no alert.

**The bigger gap:** the operational model sits *beside* the financial model instead of *feeding* it. Nothing derives the AED 7.5M savings from FTEs saved × loaded cost. "Where does 7.5M come from?" currently has no answer in the app.

### 2.10 · The internal contradiction an examiner will find

`implementation.ts:20` — Stage Gate 6, **"Full Commercial Go-Live", planned M12**. Vendor lead times are 24–30 weeks. Yet the cash-flow model books **AED 10.0M of Year-1 benefits at 100 %**.

There is **no ramp-up curve anywhere in the model**. A facility that goes live at month 12 cannot deliver a full year of benefits in year 1. This single assumption is worth roughly 6–8M of NPV and it is the most likely question in the viva. Add a `year1RampFactor` (or an explicit S-curve) and state it.

---

## 3. CTO / Backend — Architecture, API, security

### 3.1 · The AI integration is completely non-functional

**`/api/ai/recommend` is never called by any page.** `grep` across `src/` returns only the route's own file. The entire `StructedAIResponse` contract — decision, key value drivers, principal risks, management controls, confidence, disclaimer — is dead code.

**`/api/ai/explain` is called with a mismatched contract:**

| | |
| :-- | :-- |
| Client sends (`ai-assistant/page.tsx:36-42`) | `{ prompt, role, scenario, metrics, assumptions }` |
| Server reads (`explain/route.ts:7`) | `{ assumptions, metrics, **question** }` → `question` is `undefined` |
| Server returns (`route.ts:53`) | `{ answer, isFallback }` |
| Client reads (`page.tsx:46`) | `data.**explanation**` → always `undefined` |

**Consequence: the assistant always falls through to the hardcoded string at `page.tsx:49`, even with a valid API key.** Ask "what is the payback period?" and you get a sentence about NPV and IRR. The prompt reaching OpenAI would be `User Question: undefined`.

This is the single most damaging defect: the assignment is *AI-enabled*, and the app has **zero working AI**.

### 3.2 · The AI governance story doesn't survive inspection

`AI_GOVERNANCE.md` claims "prompts transmit only **validated**, aggregated JSON financial outputs" and that outputs are labelled as AI advisory.

- **No validation exists.** Neither route parses its body. `question` is interpolated straight into the prompt with no type check, no length cap, no delimiting. Zod is a dependency and is used everywhere *except* the trust boundary.
- **`metrics` is trusted client input.** The routes explain whatever NPV the client sends. The claim "AI cannot alter financial calculations" holds only because the AI never sees a server-computed number. **The server should recompute metrics from assumptions using `calculateFinancialMetrics` — it's pure TS and importable server-side.** That one change makes the governance claim true.
- **The Dashboard's "AI Executive Advisory Recommendation" is not AI.** It is a template literal built in a `useEffect` (`dashboard/page.tsx:49`), badged "Structured Governance Output" and carrying an AI human-review disclaimer. For a project graded on AI ethics and transparency, labelling deterministic string concatenation as AI output is the wrong kind of finding.
- **The template asserts conclusions unconditionally**: *"(exceeding the X% WACC hurdle rate)"* and *"justify capital commitment"* print even when NPV < 0 and IRR < WACC. **The dashboard will recommend committing capital to a value-destroying project.** Same pattern at `ai-assistant/page.tsx:49,52` ("the project exceeds… hurdle rate", "positive capital return") and `scenarios/page.tsx:291` ("a robust…").

### 3.3 · API security

| Sev | Finding |
| :-- | :-- |
| High | **No rate limiting, no auth** on two public POST routes that spend OpenAI credits. Deployed, anyone can drain the key. |
| High | **No input validation.** Unbounded `question` length → unbounded token spend. No `max_tokens` on either call either. |
| High | **Prompt injection unmitigated.** User text goes into the prompt undelimited; the system prompt's "you must not calculate figures" is a soft guardrail that "ignore previous instructions" defeats. Output is rendered to the user as financial advice. |
| Med | **`JSON.parse(content) as StructedAIResponse`** with no runtime validation (`recommend/route.ts:76`). A hallucinated shape flows to the UI typed as valid — and a parse throw is caught by the outer handler, returning **500 instead of the fallback**, so the fallback is unreachable exactly when it's needed. |
| Med | **`error.message` returned to the client** on 500. OpenAI SDK errors can carry request URLs and org metadata. Log server-side, return a generic message. |
| Med | **`decision: metrics?.decisionStatus \|\| 'Approve'`** (`recommend/route.ts:14`) — **fails open to "Approve"** on missing data. On an investment recommendation the safe default is the most conservative option. |
| Med | **The "deterministic fallback" states wrong numbers.** `explain/route.ts:15` hardcodes `WACC = 11.5%`, `AED 7.5M`, `AED 2.5M` regardless of the user's actual assumptions, plus stale `9.1M` / `23.1%` / `16.5%` / `33.1M` defaults. The fallback designed to prevent hallucination is itself the app's most reliable source of false figures. |
| Low | No timeout/`AbortSignal` on the OpenAI call; no `maxDuration`; new `OpenAI()` per request. |
| Low | `temperature` 0.2–0.3 with no seed and no persisted prompt/response log → advice is not reproducible or auditable, which is the opposite of the governance claim. |
| Low | `scenarioResults` and `riskAlerts` are destructured in `/recommend` and **never used** — so the "board recommendation" is blind to scenario and risk analysis, which the brief explicitly requires it to reflect. |

### 3.4 · CSV injection defence is on the wrong side

`SECURITY.md` claims sanitisation "on both CSV upload import and CSV download exports."

- **Import is sanitised** (`csvParser.ts:18`) — which *corrupts data*: any string beginning `-` or `+` gets a `'` prefix in the parsed record, so a note like `-15% variance` displays as `'-15% variance`.
- **Export is not sanitised.** `financial-model/page.tsx:57-59` writes raw values. The actual vulnerability is unaddressed.

Also in that export: `'data:text/csv,' + encodeURI(...)` leaves `#` unescaped (truncates the file), applies no CSV quoting/escaping, and hits browser data-URI size limits. Use `Blob` + `URL.createObjectURL`. And add a provenance header row (scenario, WACC, tax rate, timestamp, assumptions hash) — an export with no context is not audit evidence.

### 3.5 · State layer

- **`persist` has no `version` / `migrate` / rehydration validation.** A stale `capexiq-financial-store` from an earlier build silently drives the model. **This is a live demo risk**: the examiner's browser may show different numbers than your report. Add `version`, a `migrate`, and a Zod parse on rehydrate.
- **SSR hydration mismatch.** Client pages read persisted state on first render with no `mounted` guard. `<html suppressHydrationWarning>` (needed for `next-themes`) **also silences these warnings** — the mismatch is hidden, not fixed.
- **`useFinancialStore()` is called with no selector** in every component, so each one subscribes to *all* state — typing in the AI chat re-renders the Dashboard.
- `partialize` persists `assumptions` but **not** `assumptionsRegister`, so register edits are silently lost while assumption edits survive.
- `chatMessages` and `auditLog` grow unbounded in localStorage → eventual `QuotaExceededError` (~5 MB cap).
- **`auditLog` is never rendered anywhere.** A governance feature that is written, persisted, and never shown. It's also not tamper-evident (no hash chain) and `userLabel` is a self-declared dropdown value.
- Two sources of truth for the assumptions register: `defaultAssumptions.ts` and `public/data/03_capexiq_project_assumptions.csv`, with no reconciliation. Edit the CSV and nothing changes.

### 3.6 · Missing infrastructure

No `app/error.tsx`, `app/loading.tsx`, or `app/not-found.tsx`. With 24 client pages doing heavy synchronous compute, any exception in a finance function white-screens the entire app with no recovery path. No CI workflow, no `typecheck` script, no coverage threshold, no `.gitignore`.

---

## 4. Senior Frontend Engineer

### 4.1 · Performance — one `useMemo` in the whole app, and it doesn't work

`grep useMemo src/` returns exactly one hit: `monte-carlo/page.tsx:31`. Its dependency is `assumptions = getActiveAssumptions()`, which **returns a new object every render** → the cache always misses → a 5,000-iteration simulation (~600 ms in Node, slower in-browser) re-runs on every render, synchronously, on the main thread. No Web Worker, no progress indicator.

Everywhere else there is no memoisation at all. Measured cost per call:

| Function | Measured | Notes |
| :-- | --: | :-- |
| `calculateFinancialMetrics` | ~1 ms | but internally builds **51 schedules** (1 + 50-iteration break-even bisection) |
| `calculateOneWaySensitivity` | ~3 ms | 35 metric calls |
| `calculateTwoWaySensitivity` | ~7 ms | 50 cells |
| `generateTornadoChartData` | ~5 ms | re-runs the whole 1-way pass |
| `runMonteCarloSimulation(5000)` | ~600 ms | main-thread blocking |

The Sensitivity page runs all three unmemoised on every render — **including when the heatmap tab is hidden** — so switching tabs recomputes ~6,000 cash-flow schedules for nothing. `Header` and `ModelHealthPanel` both call `getActiveScenarioResult()` on every page, so every route pays ~100 extra schedule builds before it starts. Scenario sliders recompute 153 schedules per drag event.

**Fixes:** `useMemo` on stable primitive deps (or move computation into Zustand selectors with shallow compare); compute the hidden tab lazily; move Monte Carlo to a Web Worker; memoise `calculateBreakEvenBenefit` separately so it isn't re-run 5,000 times inside the simulation.

`dashboard/page.tsx:47-51` — the `useEffect` depends on `metrics` and `activeAssumptions`, both new object references every render. It doesn't loop today only because React bails out on an identical string. Add a timestamp to that summary and it becomes an infinite render loop.

### 4.2 · Visibly wrong output

| Where | Bug |
| :-- | :-- |
| `financial-model/page.tsx:259` | Row label **"Discount Factor (11.5%)"** hardcoded — under the Pessimistic scenario the factors shown are 14.5 %. The label contradicts the numbers beside it. |
| `financial-model/page.tsx:203`, CSV header | **"Less: Corporate Tax (9%)"** hardcoded — wrong the moment the tax rate is edited. |
| `financial-model/page.tsx:117`, `dashboard:150`, `risk.ts:78-79` | **"6-Year"**, **"Years 0 – 6"**, **"> 6.0 Yrs"**, "within the 6-year project lifecycle" — all hardcoded against an editable `projectLifeYears`. |
| `scenarios/page.tsx:291` | `AED {formatAED(...)}` → renders **"AED AED 12,083,628"**. |
| `sensitivity/page.tsx:122,129` | `+{v}%` / `-{v}%` → **"+-113.2%"**, **"--100.0%"** on negative values. |
| `monte-carlo/page.tsx:74,133` | Raw LaTeX on screen: `$S$-Curve ($P(NPV \le X)$)`. |
| `ModelHealthPanel.tsx:35` | Detail text says WC recovery **"AED 2.4M"**; the model value is 2.0M. |
| `dashboard:113`, `financial-model:95`, `portfolio:52`, `monte-carlo:82`, `funding:59` | NPV/DSCR rendered `text-success` **unconditionally** — a negative NPV displays in green. |
| `dashboard:129`, `financial-model:108` | `metrics.paybackPeriodYears ? … : 'N/A'` — truthiness check on a number; a payback of exactly 0 renders "N/A". Use `!== null`. |
| `ModelHealthPanel.tsx:88,94` | Critical status renders **amber, not red**, and uses a green-shaped ✓ icon for every state. `AlertTriangle` is imported and unused. `py-0.2` is not a valid Tailwind class. |

### 4.3 · `FormulaInspector.tsx` — dead code that actively lies

Never imported anywhere. If it were wired up, every `calculatedResult` is a **hardcoded string** — NPV "AED 9,184,210", IRR "23.14 %", MIRR "16.52 %", PI "1.383x", ROI "56.5 %" — so clicking "Formula" beside a KPI reading 12,083,628 would open a modal asserting 9,184,210.

Its `formulaEquation` fields hold **raw LaTeX with no KaTeX/MathJax renderer**, so they'd display as `NPV = -I_0 + \sum_{t=1}^{N} \frac{FCF_t}{(1 + r)^t}`. The brief requires *"All formulas must be clearly presented and explained."* Right now the app has no working formula surface at all. Wire this component up, bind it to live metrics, and add KaTeX — it's a high-mark feature sitting 80 % finished.

### 4.4 · Features that are built but unreachable or inert

- **`FormulaInspector`** — never rendered.
- **`auditLog`** — maintained, persisted, never displayed.
- **`assumptionsRegister`** — imported on `assumptions/page.tsx:12` and never used. The data classification badges on that page are **hardcoded JSX strings**, not driven by the register. The register's `source`, `notes`, and `lastUpdated` are shown nowhere. This is the exact artefact the brief asks for under *"distinguish historical / current / forecast / user-entered / AI-generated."*
- **Executive Role selector** (CEO/CFO/COO/CTO/Committee/Analyst) — a prominent header control that changes **nothing** in the UI. Only used as an audit-log label and as an ignored API field. Great feature, ~5 % implemented.
- **`depreciableCapexItems`** — editable only on `/settings`, absent from the Zod schema, so **submitting the Assumptions form strips it** (`z.object` drops unknown keys). Latent data loss.
- **`financeRateMIRR` / `reinvestmentRateMIRR`** — required by the schema, no form input anywhere, absent from the register. MIRR is a headline KPI whose inputs can't be edited.
- **Custom scenario** — the slider panel on `/scenarios` shows **no results**. There's no fourth card and no live KPI strip, so dragging sliders produces no visible feedback on that page.
- **`iterations` state** on `/monte-carlo` — `setIterations` exists, the control was never built.
- **`DecisionSnapshot` type** — defined in `finance.ts:279`, never used.
- **Approvals "Immutable Decision Snapshot"** — `isSigned` is plain `useState`. **Refresh the page and the signature disappears.** It records no assumptions hash. It is not a snapshot and not immutable.

### 4.5 · Accessibility — the claim is not supportable

`ACCESSIBILITY.md` asserts **WCAG 2.2 AA compliance** including "ARIA modal dialog trapping". Measured across all `.tsx`:

- **2** `aria-label` attributes total
- **0** `role=` attributes
- **0** `alt` attributes
- `Escape` handled in exactly one place (`CommandPalette.tsx:76`) — neither modal has focus trap, Escape, backdrop dismiss, scroll lock, or `role="dialog"`
- Recharts SVGs have no text alternative or data-table fallback (WCAG 1.1.1)
- Heatmap cells and decision badges encode meaning partly in colour
- Large tables have no `scope` attributes on headers
- No skip link

Rewrite this document as *"Accessibility considerations and known gaps"* and fix the two modals, or remove the compliance claim. Asserting AA conformance without an axe run is the kind of thing that gets challenged.

### 4.6 · UX gaps

`isDirty` is destructured on the assumptions form and never used — no unsaved-changes indicator, no navigation guard; edits are lost silently. Rate fields take raw decimals (`0.115`), so a user typing `11.5` gets "Discount rate max 50%". Clearing a number field yields `NaN` and a raw Zod message. The AI chat has no loading bubble, no auto-scroll, no `response.ok` check (a 500 silently becomes the canned fallback), no markdown rendering, and no guard against concurrent sends on repeated Enter. Risk alerts are `slice(0,4)` with no "show all". No empty/error states anywhere.

---

## 5. CEO — Story, credibility, submission risk

### 5.1 · Where marks are actually being lost

| Brief requirement | Status |
| :-- | :-- |
| §5.6 AI Recommendation Panel | **Not AI.** Hardcoded template; unconditional positive language. |
| §6 AI Finance Assistant, **≥5 sample Q&A** | **4 prompts**, and none of them work (contract mismatch). One short of the minimum. |
| §5 Dashboard, ≥6 visual components | Met in count, but the **tornado chart is broken** and the MC break-even line never renders. |
| §7 "Explain which variable has the greatest impact / under what conditions the decision changes" | **Missing.** Data is shown; no analysis is generated. |
| §5.5 "Unrealistic assumption alert" | **Missing** from the risk engine (salvage > capex, growth > WACC, WC recovery > invested, ramp ignored — none flagged). |
| §3 "Distinguish historical / current / forecast / user-entered / AI-generated" | Register exists in data, **rendered nowhere**; badges are hardcoded strings. |
| §2 "All formulas must be clearly presented and explained" | `FormulaInspector` is **dead code**; LaTeX unrendered. |
| §10A Individual report **1,300–1,650 words** | `deliverables/01` is **1,041 words** — **259 below the minimum**, and that count includes headings and table markup. |
| §10C Presentation 8–15 slides | 10 slides ✓ (but numbers are wrong). |
| §8 Ethical use of AI | Documented — but undercut by mislabelling a template as AI and by fabricated audit claims. |

### 5.2 · Documentation vs. reality

Beyond the reconciliation issue in §2.2, the root docs describe a different project:

- **`ASSUMPTIONS.md`** — Y1 OpEx 1.8M (code 2.2M), savings growth 10 % (code 4 %), OpEx inflation 8 % (code 3 %), asset life 5 yrs (code 6), salvage 2.4M (code 2.0M), NWC "10 %" (code flat 2.0M), and the AED 2.5M contribution margin is **absent entirely**. Every number except capex and tax is wrong.
- **`DATA_SOURCES.md`** — lists 10 files; **9 filenames are wrong and 5 datasets don't exist** (`05_micro_fulfilment_capex_quotes.csv`, `06_logistics_opex_benchmarks.csv`, `07_e_commerce_growth_uae.csv`, `08_inflation_cpi_uae.csv`, `09_industrial_rent_dubai.csv`). Only #10 matches.
- **`MODEL_LIMITATIONS.md`** — *"straight-line 5-year MACRS"*: MACRS is a **US** regime, is **not** straight-line, and the code uses **6-year** straight-line to salvage. Three errors in one clause. Also cites a non-existent filename.
- **`FINANCIAL_METHODOLOGY.md`** — four CAPM inputs differ from the app; its own inputs compute to 8.55 % while it asserts 11.5 %; the FCF formula omits the contribution-margin term.
- **`SECURITY.md`** — claims export sanitisation that doesn't exist.
- **`TESTING.md`** — claims e2e covers "Executive Role Selector, Command Palette"; `e2e/app.spec.ts` covers **neither** (5 tests, all `h1` visibility smoke checks).
- **`DEPLOYMENT.md`** — instructs `pnpm test:e2e` **before** `pnpm build`, but Playwright's `webServer` runs `pnpm start`, which requires a build. Following the doc verbatim fails.
- **`ARCHITECTURE.md`** — "29 pages/APIs"; actual is 24 + 2.
- **`.env.example`** omits `OPENAI_MODEL`, which the README tells you to set.

### 5.3 · Test suite quality (beyond it not running)

Almost every assertion is a loose inequality: `npv > 5000000` when NPV is 12.08M; `irr > 0.20`; `PI > 1.25`; `roi > 50`. **These pass even if the model changes by 50 %** — they don't pin anything. For a financial model the essential test is a golden-value regression (`toBeCloseTo(12083628, 0)`); only `cashflow.test.ts` does exact values, and only for Y0/Y1/Y6.

`vitest.config.ts` includes only `tests/**/*.test.ts` — **`.tsx` is excluded**, so component tests are structurally impossible and `@testing-library/react` is an unused dependency. **Zero component tests, zero API route tests, zero store tests.** No edge-case tests for the defects in §2.5 (all of which a 10-line test would have caught). E2E is 5 smoke tests for a 24-page app.

### 5.4 · What's genuinely strong — protect it

- `CapExIQ_CSV_Dataset_Pack` / `public/data` is the best artefact in the project: internally consistent with the code, correct classifications, real MoF/CBUAE/DEWA source URLs, honest `model_note` fields, and a proper data dictionary and source register. It is barely surfaced in the UI — **use it more**.
- The deterministic-engine separation (finance math in pure TS, AI advisory-only) is the right architecture; it just isn't enforced at the trust boundary yet.
- `deliverables/04` §1–§2 reconciliation is **correct** and matches the engine exactly (FCF₁ = 7,398,000 ✓). Only its §3 metrics summary is wrong. Salvage-page.
- IRR with Newton–Raphson **plus** bisection fallback **plus** a multiple-sign-change warning is more rigour than this assignment expects.
- Breadth — DSCR, stage gates, benefits realisation, strategic scorecard, capital rationing — is well beyond the brief. The problem is depth of verification, not ambition.

---

## 6. Prioritised fix plan

### Do first (blocks everything)
1. Move the project off the iCloud-synced Desktop; `rm -rf node_modules .next && pnpm install`; confirm `pnpm build`. **(§1)**
2. `git init`, add a `.gitignore` (`node_modules`, `.next`, `.env.local`, `test-results`, `playwright-report`), commit. **(§1)**
3. Pin `vite`; get `pnpm test` green; add a `typecheck` script. **(§1)**

### Do next (correctness and credibility — highest mark impact)
4. **Regenerate every number** in all 5 deliverables and 6 root docs from the live engine: NPV 12,083,628 · IRR 26.30 % · MIRR 19.34 % · PI 1.5035 · payback 3.10 · discounted payback 3.98 · Optimistic 19.01M · Pessimistic −4.94M (**Reject**). **(§2.1)**
5. **Delete or rebuild `MODEL_RECONCILIATION.md`** and `ModelHealthPanel` checks #3 and #4. Do not submit a fabricated audit assertion. **(§2.2)**
6. **Fix the AI contract**: align `question`/`answer` field names, call `/api/ai/recommend` from the Dashboard, and recompute metrics server-side from assumptions. Add Zod validation on both routes. **(§3.1, §3.2, §3.3)**
7. **Delete the unconditional positive language** in the Dashboard, Scenarios and AI-assistant templates — make them branch on `decisionStatus`. **(§3.2)**
8. Reconcile the hurdle rate: state *WACC 9.34 % + 2.16 pp risk premium = 11.5 %* and expose the premium. **(§2.3)**
9. Fix `funding.ts`'s cost of capital (charge cash at the cost of equity, or relabel and compute debt-weighted). **(§2.4)**
10. Add a **Year-1 ramp factor** and reconcile it with the M12 go-live in the stage-gate plan. **(§2.10)**
11. Add cross-field Zod validation: salvage ≤ depreciable capex, WC recovery ≤ initial WC; fix the NaN and unbracketed-bisection paths. **(§2.5 a,b,c,f)**

### Then (visible quality)
12. Fix the tornado chart to plot low→high around the base; fix the sensitivity `parameterValue` labels and the `+-` sign bugs. **(§2.7)**
13. Wire up `FormulaInspector`, bind it to live metrics, add KaTeX. **(§4.3)**
14. Render the `assumptionsRegister` and the `auditLog`. **(§4.4)**
15. Add `useMemo` throughout; move Monte Carlo to a Web Worker; lazily compute hidden tabs. **(§4.1)**
16. De-hardcode every "11.5 %", "9 %", "6-Year", "> 6 Yrs" string; fix the unconditional `text-success`. **(§4.2)**
17. Add `version` + `migrate` + Zod-on-rehydrate to the persisted store — **this protects your demo**. **(§3.5)**
18. Expand the individual report from 1,041 to ≥1,300 words; add a 5th assistant sample question. **(§5.1)**
19. Add `app/error.tsx`; add the "unrealistic assumption" risk rule; add scenario probability weighting and expected NPV. **(§3.6, §5.1, §2.6)**
20. Rewrite `ACCESSIBILITY.md` as known-gaps, or fix the two modals and add chart alt text. **(§4.5)**

### Nice to have (depth, if time allows)
21. Monte Carlo: correlate capex/benefits, sample margin and growth rates, report standard error, surface `probIrrAboveWacc`. **(§2.8)**
22. Portfolio: live NPVs, real 0-1 knapsack, aggregate-stream IRR, EAA. **(§2.9)**
23. Vendors: discounted, after-tax TCO. **(§2.9)**
24. Real options: value the deferral option by shifting cash flows and re-running the engine. **(§2.9)**
25. Bridge the capacity model to `year1OperatingSavings` (FTEs saved × loaded cost). **(§2.9)**
26. Implement the Executive Role selector, or remove it. **(§4.4)**

---

## 7. Deliverable consistency matrix

**Answer: no — no two deliverables agree, and none agrees with the app.**

Engine ground truth (executed on `DEFAULT_FINANCIAL_ASSUMPTIONS`):
NPV 12,083,628 · IRR 26.30 % · MIRR 19.34 % · PI 1.5035 · payback 3.10 yrs · disc. payback 3.98 yrs · Optimistic 19.01M / 33.59 % · Pessimistic −4.94M / 8.23 % · Base decision **Approve** · Pessimistic decision **Reject**

### 7.1 Headline metrics

| Claim | App | Report 01 | Deck 02 | Demo 03 | Recon 04 | MODEL_RECON | DEMO_SCRIPT | FormulaInspector | portfolio.ts |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| NPV | **12.08M** | 9.18M | 9.18M | 9.18M | 9,184,210 | 9,184,210 | 9.18M | 9,184,210 | 9,184,210 |
| IRR | **26.30 %** | 23.1 % | 23.1 % | 23.1 % | 23.14 % | 23.14 % | — | 23.14 % | 23.14 % |
| MIRR | **19.34 %** | 16.5 % | 16.5 % | 16.5 % | 16.52 % | 16.52 % | — | 16.52 % | — |
| PI | **1.5035** | 1.38x | 1.38x | 1.38x | 1.383x | 1.383x | — | 1.383x | 1.383 |
| Payback | **3.10** | 3.2 | 3.2 | 3.2 | 3.19 | 3.19 | — | — | — |
| **Disc. payback** | **3.98** | *omitted* | **4.8** | — | **4.78** | **4.08** | — | — | — |

Discounted payback has **four different published values**, none correct.

### 7.2 Scenario table

| | App | Report 01 | Deck 02 | Demo 03 |
| :-- | --: | --: | --: | --: |
| Optimistic NPV | **19.01M** | 15.42M | 15.42M | 15.4M |
| Optimistic IRR | **33.59 %** | 31.4 % | 31.4 % | — |
| Pessimistic NPV | **−4.94M** | −2.14M | −2.14M | −2.1M |
| Pessimistic IRR | **8.23 %** | 9.8 % | 9.8 % | — |
| Pessimistic PI | **0.819** | 0.92 | — | — |
| Pessimistic benefit cut | **−25 %** | −25 % | −25 % | −25 % / **−20 %** in `DEMO_SCRIPT.md` |

### 7.3 The recommendation itself contradicts across documents

| Source | Base-case recommendation |
| :-- | :-- |
| **Engine (`determineDecisionStatus`)** | **Approve** |
| `deliverables/01` §4 scenario table | Approve |
| `deliverables/01` §6 "Final Recommendation" | **Phased Implementation** |
| `deliverables/02` Slide 9 | **Phased Implementation** |
| `DEMO_SCRIPT.md` (pessimistic) | "Approve → **Phased Implementation**" (engine: **Reject**) |
| `deliverables/01` §4 (pessimistic) | "Reject / Phase" |

Report 01 contradicts **itself** between §4 and §6. This is the answer to Question 5 — the highest-weighted output in the brief.

### 7.4 Analytical claims that the app disproves

| Claim | Source | Engine |
| :-- | :-- | :-- |
| "Year-1 Operating Benefits is the #1 value driver" | Deck S6, Demo 03 S5 | **#2.** Ranking: Project Life **16.80M** > Benefits **16.67M** > Capex 8.25M > WACC 6.76M > Growth 4.12M > OpEx 3.57M > Salvage 0.37M |
| "Max allowable capex overrun +41.7 %" | Deck S6 | **+50.35 %.** The 41.7 % figure is `realOptions.ts:25` `downsideProtectionPct` — a different concept, copied from the wrong module |
| "Max benefit shortfall −18.2 %" | Deck S6, Report §6 | **−29.00 %.** 18.2 % appears nowhere in the codebase |
| "Salvage = 11.4 % of baseline NPV" | Deck S8, Report §6 | **8.61 %** (derived from the wrong NPV) |
| "Risk: Terminal Salvage Dependence" | Deck S8 | **Alert does not fire** — rule triggers only above 15 % |
| "Risk: Benefit Shortfall (High if >15 %)" | Deck S8 | **Alert does not fire** — tolerance is 29 % |
| Risk panel content | Deck S8 lists 3 risks | **Exactly 1 alert fires** on the base case (`RISK-PESSIMISTIC-NEG`) |
| "0.2 % probability of loss" | `DEMO_SCRIPT.md` | Unverified; paired with the wrong mean NPV |

### 7.5 Demo script instructs actions that are impossible

| Step | Instruction | Reality |
| :-- | :-- | :-- |
| 03 §6 | Click prompt chip *"Why is MIRR lower than IRR?"* | **Does not exist.** The 4 chips are NPV/IRR trade-off, Y1 risk drivers, board summary, capex→payback |
| 03 §6 | Click **"Generate Board Memo"** | **No such button anywhere** in `ai-assistant/page.tsx` |
| 03 §6 | "show deterministic context injection" | Any prompt returns the same canned string (contract mismatch, §3.1) |
| 03 §3 | Explain classification *"Historical"* | No Historical badge exists; the register is never rendered |
| 02 S10 | "Unit Tests" as a deliverable | `pnpm test` does not start |
| All | Open `localhost:3000` | `pnpm dev` / `pnpm build` fail (§1) |

The live demo fails at minute 4:15 in front of the examiner.

### 7.6 Claims in `05_final_submission_checklist.md` that are ticked but false

| Ticked claim | Reality |
| :-- | :-- |
| "15 passing tests across 5 test suites" | 11 test files; **0 execute** |
| "E2E validating page navigation, assumption editing, scenario switching, and AI prompts" | 5 tests, all `h1` visibility smoke checks; none of the four listed |
| "Report … 1,520 words" | **1,041 words** — 259 below the 1,300 minimum |
| "Recharts … and Tornado chart" | Tornado plots `spread` from zero; low/high never used (§2.7) |
| "Server-Side AI Integration … with fallback mode" | `/recommend` never called; `/explain` contract-mismatched (§3.1) |

### 7.7 Brief requirements not met in the report

- **§5 requires ≥5 AI features, each with 5 stated elements** (what it does / inputs / output / how it helps / limitation). Report §5 gives **4 governance properties**, not 5 features, and none has the 5-part breakdown. Direct rubric miss.
- **§6 requires ≥5 sample assistant questions and answers.** App has 4 prompts; the report documents none.
- **§7 requires stating which variable has the greatest impact and when the decision changes.** Stated — but with the wrong variable (§7.4).
- **§10A requires 1,300–1,650 words.** 1,041.

---

## 8. Score

| Component | As-is today | Realistic ceiling after §6 fix plan |
| :-- | :--: | :--: |
| **A · Individual report** (1,300–1,650 w) | **45 %** — under length, every figure wrong, self-contradictory recommendation, AI-features section doesn't meet the §5 format | 85 % |
| **B · Dashboard / app** | **35 %** — does not build; core AI feature non-functional; tornado broken; fabricated diagnostics. *Would be ~65 % if it merely built* | 88 % |
| **C · Presentation** (8–15 slides) | **50 %** — well structured, 10 slides, but every number wrong, 2 of 3 risks don't fire, wrong #1 driver, recommendation contradicts the app | 85 % |
| **Overall** | **≈ 42–48 %** | **≈ 85 %** |

**Reading of the score.** The gap is almost entirely *verification*, not *capability*. The architecture, breadth and data pack are distinction-level; nearly every lost mark comes from a number that was written down once and never re-derived, or a claim that was asserted rather than checked. Approximately 80 % of the deficit is recoverable by regenerating figures from the live engine, fixing the AI contract, and deleting the unsupportable audit claims — none of which requires new features.

**Single highest-leverage action:** run the engine once, capture the 12 headline outputs, and find-and-replace them across all 5 deliverables and 6 root docs. That alone moves the mark more than any code change.
