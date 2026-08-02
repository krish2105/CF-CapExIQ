# CapExIQ: Live Application Demonstration Script

**Audience:** Examiner and Capital Expenditure Committee
**Total demo time:** 5 minutes (8 steps, each timed below)
**Setup before you start:** `pnpm dev` already running on `http://localhost:3000`, browser at 100% zoom, `/dashboard` pre-warmed in a second tab so the first render is not part of the demo, and the assumptions register at its default values (`Reset to Defaults` on `/assumptions` if in doubt).

Every figure spoken in this demo is a deterministic engine output pinned by `tests/golden.test.ts`. If a number on screen disagrees with this script, the model has drifted and the demo should stop.

| Step | Screen | Runs | Cumulative |
| :-- | :--- | ---: | ---: |
| 1 | Landing page | 0:30 | 0:30 |
| 2 | `/dashboard` | 0:50 | 1:20 |
| 3 | `/assumptions` | 0:45 | 2:05 |
| 4 | `/capacity-model` | 0:45 | 2:50 |
| 5 | `/scenarios` | 0:35 | 3:25 |
| 6 | `/sensitivity` | 0:40 | 4:05 |
| 7 | `/ai-assistant` | 0:35 | 4:40 |
| 8 | `/printable-report` and `/financial-model` | 0:20 | 5:00 |

---

## Step 1: Landing Page & Project Context *(0:00 – 0:30)*
- Open `http://localhost:3000/`.
- Point to the **NovaRetail GCC** branding and the notice stating that the entity is **hypothetical**; the operational dataset behind it is real, the company is not.
- State the decision in one sentence: **AED 24.0M** total outlay — AED 22.0M of capital expenditure plus AED 2.0M of working capital — for an automated micro-fulfilment centre over a **6-year** life, against an **11.50%** WACC.
- Name the four options on the table: approve, approve with a Year-1 savings gate, delay twelve months, reject.

## Step 2: Executive Dashboard *(0:30 – 1:20)*
- Navigate to `/dashboard`.
- Read the KPI row: **Initial Outlay AED 24.0M** • **Baseline NPV AED 12,083,628** • **IRR 26.30% / MIRR 19.34%** • **Profitability Index 1.5035** • **Payback 3.1 years** • **Discounted Payback 4.0 years** (3.98 exactly).
- Say why MIRR sits below IRR before anyone asks: MIRR reinvests interim cash at the 11.50% WACC rather than at the project's own 26.30% return, so it is the more conservative of the two.
- Show the annual free-cash-flow bar chart with the cumulative line **crossing zero during Year 4** — that crossing is the 3.10-year payback.
- Scroll to the **risk alert panel**. On the base case the engine raises the **pessimistic-downside** alert (NPV −AED 4.94M under combined stress). Say plainly that the benefit-shortfall and salvage-dependence rules do **not** fire here — tolerance is 29.0% against a 15% trigger, and salvage is 8.61% of NPV against a 15% trigger.
- Point at the **AI Executive Advisory panel**, served by `/api/ai/recommend`, and read the disclaimer aloud: the text is advisory, the numbers beside it are not AI-generated.

## Step 3: Assumptions Register & Real-Time Recalculation *(1:20 – 2:05)*
- Navigate to `/assumptions`.
- Explain the provenance scheme: every badge is driven from the register's **`dataClassification`** field rather than hard-coded in the page, so a badge cannot disagree with the register it describes. The legend carries **five classes — Historical, Current External, Forecast, User-entered, AI-generated** — with a live count against each.
- Hover one badge to show the tooltip definition, and point out that each field also shows its **source, last-updated date and notes** underneath.
- Read the live counts honestly: the register currently populates **Forecast (9)**, **User-entered (6)** and **Current External (1)**, while **Historical** and **AI-generated** stand at zero. The AI-generated count staying at zero is the control point — the AI layer writes narrative, never model inputs.
- Change **Automation Equipment** from `18,000,000` to `20,000,000`, click **Save Updated Assumptions & Recalculate**, and show NPV falling immediately across the application because every page reads one engine.
- Click **Reset to Defaults** to restore the baseline before moving on.

## Step 4: Labour-Savings Bridge — Where the AED 7.5M Comes From *(2:05 – 2:50)*
- Navigate to `/capacity-model`. This is the answer to the hardest question an examiner asks: *why should we believe the AED 7.5M?*
- Walk the eight-step **Labour Savings Bridge** table: 1.2M orders × 3.5 items = **4.2M pick lines**; 1,800 paid hours × 75% utilisation = **1,350 effective picking hours per FTE**; manual picking at 60 lines/hour needs ~51.9 direct pickers, ~75.2 FTE including 45% indirect support; automated picking at 450 lines/hour needs ~6.9 direct, ~8.3 FTE including 20% indirect; **~66.9 FTEs displaced × AED 112,000 fully loaded cost = ~AED 7.49M** of annual saving.
- Deliver the point: the forecast of **AED 7.5M** is corroborated bottom-up to within roughly 0.1%, from headcount and loaded cost rather than from a percentage assumption.
- Say the caveat printed on the page: **the bridge corroborates the forecast, it does not replace it** — the saving is only realised if the displaced roles are actually redeployed or removed.
- Move the orders or robot-count input one notch to show the bridge and the variance against forecast recomputing live.

## Step 5: Scenario Engine & Downside Stress Test *(2:50 – 3:25)*
- Navigate to `/scenarios`.
- Compare the three cases side by side: **Optimistic NPV AED 19.01M / IRR 33.59% / PI 1.830 — Approve**; **Base NPV AED 12.08M / IRR 26.30% / PI 1.504 — Approve**; **Pessimistic NPV (AED 4.94M) / IRR 8.23% / PI 0.819 — Reject**.
- State the probability-weighted result: 50/25/25 gives an **expected NPV of AED 9,560,152**.
- Make the pessimistic case honest: it is not a single bad year, it is a 25% benefit shortfall, a 15% cost overrun and a 300-basis-point rate rise occurring together.
- Drag the **Custom** scenario benefit multiplier slider to show the committee testing its own assumption in real time.

## Step 6: Sensitivity, Tornado Ranking & Break-Evens *(3:25 – 4:05)*
- Navigate to `/sensitivity`.
- Show the **Tornado chart**. Flag the methodology first: **every driver is flexed by an identical ±20%**, so bar lengths are directly comparable and the ranking is a statement about the model rather than about the ranges chosen.
- On that basis **Year-1 total operating benefits ranks #1, swinging NPV by AED 16.67M** — more than the project's entire base-case value. Project life follows at AED 8.39M, CapEx AED 8.25M, WACC AED 5.17M, OpEx AED 3.57M, and salvage is almost irrelevant at AED 0.37M.
- Read the break-even panel: benefits may fall **29.0%**, total outlay may rise **50.4%** (a ceiling of AED 36.08M), and NPV reaches zero at a **26.30%** discount rate — which is the IRR by construction.
- Switch to the **2-way heatmap** tab to show NPV across the WACC × benefits grid, and land the management conclusion: the exposure is benefit realisation, not capital price.

## Step 7: AI Assistant *(4:05 – 4:40)*
- Navigate to `/ai-assistant`.
- Click the suggested prompt chip **"Why is the MIRR lower than the IRR?"** — read the exact chip text so the click matches what the examiner sees. The other five chips are *"What happens if the discount rate rises to 14.5%?"*, *"Which assumption has the greatest effect on the result?"*, *"Should management accept or reject this project?"*, *"Why would the NPV decrease under the pessimistic scenario?"* and *"Explain this result to a non-financial manager."*
- While it responds, explain the contract: the current assumptions and the computed metrics are injected into the prompt as context; the model explains those numbers and is instructed never to compute one.
- If no API key is configured the page returns the labelled **deterministic advisory fallback**, which is built from the same engine output — say so rather than hiding it, because it demonstrates that the demo cannot fabricate a figure.
- Point at the human-review disclaimer: every AI output is advisory and requires CFO sign-off.

## Step 8: Board Memorandum & Data Export *(4:40 – 5:00)*
- Navigate to `/printable-report` — this is the print-ready **board memorandum**, carrying the full assumption set, cash flow schedule and recommendation in one document for the committee pack.
- Navigate to `/financial-model` and click **Export Schedule to CSV** to hand the examiner the 6-year cash-flow schedule as a file.
- Close on the recommendation: **approve**, conditional on releasing capital against measured Year-1 savings and on a vendor performance guarantee with a secondary-market buyback.

---

**Two things this demo deliberately does not do:** there is no "Generate Board Memo" button — the memorandum is the `/printable-report` route — and no figure shown on screen is produced by the AI layer. If either claim is challenged, open `tests/golden.test.ts`, which pins the published numbers against the engine.
