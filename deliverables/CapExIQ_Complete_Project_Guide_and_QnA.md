# CapExIQ — Complete Project Guide & Executive Q&A Handbook

**Project title:** CapExIQ — AI-Enabled Capital-Budgeting Decision Dashboard for an Automated Micro-Fulfilment Centre
**Topic:** Topic 9 — AI Capital-Budgeting Dashboard (installing automation technology)
**Entity:** NovaRetail GCC (hypothetical UAE omnichannel retailer)
**Date:** August 2026

> **Figure control.** Every number in this handbook is a deterministic output of the finance engine, pinned by the golden-value regression suite `tests/golden.test.ts` and reconciled against `NovaRetail_MFC_Financial_Model_Base.csv`. If a figure here disagrees with the running application, the application is right and this document is stale. Any earlier version of this handbook — including any PDF stating an NPV of AED 4.68M, an IRR of 17.65% or working capital of AED 1.0M — is superseded in full.

---

## EXECUTIVE SUMMARY & PROJECT OVERVIEW

### 1. What is NovaRetail GCC?
NovaRetail GCC is a **hypothetical** omnichannel retailer operating hypermarkets, supermarkets and a fast-growing e-commerce platform across the United Arab Emirates. It is created for this assignment. It is not a real company, and no figure in this project should be presented as the financial statements of any real business.

### 2. The core problem
NovaRetail fulfils online orders by manual picking from store back-rooms. That model has two failures:
- **Cost.** Direct fulfilment costs **AED 14.50 per order**, and the cost scales linearly with volume.
- **Capacity and speed.** Manual picking cannot hold a 2-hour delivery promise, and picking capacity caps growth in exactly the urban Dubai postcodes where demand is expanding fastest.

### 3. The proposed capital investment
An **Automated Micro-Fulfilment Centre** in urban Dubai, using goods-to-person robotics, automated storage and retrieval, and warehouse control software. It cuts direct cost to **AED 4.20 per order** and lifts capacity to **8,000 orders per day**.

| Component | Amount (AED) |
| :--- | ---: |
| Automation equipment (robotics, ASRS, conveyors) | 18,000,000 |
| Installation and systems integration | 2,500,000 |
| Software and cybersecurity | 1,200,000 |
| Training and launch support | 300,000 |
| **Total capital expenditure** | **22,000,000** |
| Initial net working capital (recovered in full at Year 6) | 2,000,000 |
| **Total initial outlay at Time Zero** | **24,000,000** |

**Project life: 6 years. Salvage value at Year 6: AED 2,000,000. Depreciation: straight-line to salvage, (22.0M − 2.0M) ÷ 6 = AED 3,333,333 per year.**

---

## FINANCIAL EVALUATION & KEY METRICS (BASE CASE)

Discounted at NovaRetail's **11.50% WACC** over a **6-year** horizon.

| Metric | Result | Hurdle | Verdict |
| :--- | ---: | :--- | :--- |
| **Total initial outlay (FCF₀)** | **AED (24,000,000)** | — | 22.0M CapEx + 2.0M working capital |
| **Net present value** | **AED 12,083,628** | > 0 | **Creates value** |
| **Present value of inflows** | **AED 36,083,628** | — | Against 24.0M of outlay |
| **Internal rate of return** | **26.30%** | > 11.50% | **Clears by 14.80 points** |
| **Modified IRR** | **19.34%** | > 11.50% | **Clears on conservative reinvestment** |
| **Profitability index** | **1.5035x** | > 1.00x | **AED 1.50 of value per AED 1.00 committed** |
| **Return on investment** | **123.3%** | — | Undiscounted, over six years |
| **Payback period** | **3.10 years** | < 4.0 | Turns positive during Year 4 |
| **Discounted payback** | **3.98 years** | < 5.0 | Turns positive during Year 4 |
| **6-year cumulative cash flow** | **AED 29,594,653** | > 0 | Net undiscounted gain |

**Engine decision: APPROVE.**

### The six-year cash flow

| AED | Year 0 | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Free cash flow | (24,000,000) | 7,398,000 | 7,724,690 | 8,066,186 | 8,423,154 | 8,796,293 | 13,186,330 |
| Discount factor @ 11.50% | 1.0000 | 0.8969 | 0.8044 | 0.7214 | 0.6470 | 0.5803 | 0.5204 |
| Present value | (24,000,000) | 6,634,978 | 6,213,429 | 5,818,936 | 5,449,734 | 5,104,172 | 6,862,380 |

Year 6 includes AED 2.0M of salvage and AED 2.0M of recovered working capital.

### The operating assumptions behind those flows

| Driver | Year 1 | Growth |
| :--- | ---: | :--- |
| Operating cost savings | AED 7,500,000 | +4% per year |
| Incremental contribution margin | AED 2,500,000 | +5% per year |
| **Total operating benefits** | **AED 10,000,000** | — |
| Additional operating expenditure | AED 2,200,000 | +3% per year |
| UAE corporate tax | 9% on EBIT | — |

---

## MANAGEMENT DECISION ALTERNATIVES

The engine evaluates the full project and its three scenarios. The alternatives below are the management framing of that result; only Option 1 carries an engine-computed NPV, and the others are deliberately not given fabricated figures.

1. **Option 1 — Approve the full AED 24.0M (RECOMMENDED, with conditions).** NPV **AED 12.08M**, IRR **26.30%**. Captures the full cost-per-order reduction from AED 14.50 to AED 4.20 immediately. Highest exposure if benefits disappoint, which is what the approval conditions address.
2. **Option 2 — Approve with a Year-1 savings gate.** Release AED 14.0M now and the remaining AED 10.0M only once measured savings are audited. Retains almost all of the value while bounding the downside. This discipline is embedded in the recommendation as Condition 1.
3. **Option 3 — Delay twelve months** pending further vendor evidence. Defers the whole benefit stream by a year and cedes first-mover position in the fastest-growing postcodes.
4. **Option 4 — Reject and retain manual fulfilment.** No capital committed, no value created, and the cost base degrades as volume grows.

---

## SCENARIO & SENSITIVITY ANALYSIS

| | Optimistic | Base | Pessimistic |
| :--- | ---: | ---: | ---: |
| CapEx / benefits / OpEx | ×0.95 / ×1.10 / ×0.95 | ×1.00 | ×1.15 / ×0.75 / ×1.15 |
| Discount rate | 10.50% | 11.50% | 14.50% |
| **NPV** | **AED 19,013,977** | **AED 12,083,628** | **AED (4,940,625)** |
| **IRR** | **33.59%** | **26.30%** | **8.23%** |
| **Profitability index** | **1.830** | **1.504** | **0.819** |
| **Payback** | **2.63 years** | **3.10 years** | **5.06 years** |
| **Decision** | **Approve** | **Approve** | **REJECT** |

**Probability-weighted expected NPV (50% base / 25% optimistic / 25% pessimistic): AED 9,560,152.**

**Monte Carlo, 5,000 iterations on seed 12345:** mean NPV ≈ **AED 10.5M**; probability of a negative NPV ≈ **0.3%**.

### Tornado ranking — every driver flexed by an identical ±20%

Normalising the flex is what makes the ranking meaningful; if each driver moved by a different amount, the ordering would describe the ranges chosen rather than the model.

| Rank | Driver | NPV swing (AED) |
| ---: | :--- | ---: |
| 1 | **Total operating benefits** | **16,670,000** |
| 2 | Project life | 8,390,000 |
| 3 | Initial capital expenditure | 8,250,000 |
| 4 | WACC | 5,170,000 |
| 5 | Additional OpEx | 3,570,000 |
| 6 | Savings growth rate | 1,100,000 |
| 7 | Salvage value | 370,000 |

The top driver swings NPV by more than the project's entire base-case value.

### Break-even thresholds

- Operating benefits may fall **29.0%** below forecast before NPV reaches zero.
- Total outlay may rise **50.4%**, to a ceiling of **AED 36.08M**, before NPV reaches zero.
- NPV reaches zero at a discount rate of **26.30%** — which is the IRR, by definition.
- The present value of the Year-6 salvage is **8.61%** of NPV, so the case does not depend on the residual.

---

## DATA SOURCES & PROVENANCE

The dataset pack in `public/data/` is documented in full in `DATA_SOURCES.md`. The honest position:

- **DataCo Smart Supply Chain** (Mendeley `8gx2fvg2k6`, CC BY 4.0) is genuine external operational data, used as a delivery and late-shipment benchmark in `/operational-analytics`. It is **US-market data in USD** and it **does not feed** the NPV, IRR, MIRR, PI or payback calculations.
- **DEWA tariffs** (effective July 2026): slabs of **23 / 28 / 32 / 38 fils per kWh**, a **6 fils per kWh fuel surcharge** and **5% VAT**. Real and current.
- **UAE corporate tax:** Federal Decree-Law No. 47 of 2022 — 0% up to AED 375,000 of taxable income and **9%** above it. The model applies a flat 9% marginal rate and does not model the zero-rate band.
- **Cost of debt:** the live **3-month EIBOR of 3.79%** plus a 2.50% credit spread. The CBUAE file in the pack is a catalogue of download locations and contains no rate observations.
- **Capital expenditure lines** are **illustrative academic estimates**. No vendor quotations exist in this repository and none are cited.

---

## AI GOVERNANCE & ETHICS

- **Zero AI arithmetic.** Every metric is computed in deterministic TypeScript. The AI layer receives computed values as context and is instructed never to produce a number.
- **Server-side only.** `/api/ai/explain` and `/api/ai/recommend` are Next.js Route Handlers; the API key never reaches the browser. Request payloads are validated with Zod and question length is capped.
- **Labelled fallback.** If the service is unavailable, both routes return a clearly marked deterministic advisory built from the engine's own output, with wording conditional on the actual numbers, so a negative NPV can never read as an endorsement.
- **Provenance is visible.** `/assumptions` drives every badge from the register's `dataClassification` field across five classes — Historical, Current External, Forecast, User-entered, AI-generated — and shows each field's source, last-updated date and notes.
- **Human authority.** Every AI output is advisory and requires sign-off. **Final responsibility rests with the CFO and the Capital Expenditure Committee, not with the AI system.**

---

## COMPREHENSIVE EXECUTIVE Q&A HANDBOOK
*(20 board and examiner questions, answered in plain English)*

### Q1: Why is NovaRetail GCC considering an automated micro-fulfilment centre?
**Answer:** Online order volume in urban Dubai is growing faster than manual picking can serve it. Picking from store back-rooms costs **AED 14.50 per order** and cannot hold a 2-hour delivery promise. The automated centre cuts the direct cost to **AED 4.20 per order**, lifts capacity to **8,000 orders per day** and takes picking accuracy from roughly 96.6% to **99.8%**. The investment is as much about removing a capacity ceiling as it is about cost.

### Q2: How much money is required up front?
**Answer:** **AED 24.0 million** at Time Zero. That is **AED 22.0M of capital expenditure** — AED 18.0M robotics and ASRS, AED 2.5M installation and integration, AED 1.2M software and cybersecurity, AED 0.3M training and launch — plus **AED 2.0M of net working capital** for spare parts and ramp-up, which is **recovered in full at the end of Year 6**. Working capital is an investment, not a cost, which is why it comes back.

### Q3: What is Net Present Value, and why is AED 12.08M a good result?
**Answer:** NPV converts every future cash flow into today's money at the company's cost of capital and subtracts what the project costs. The project's inflows are worth **AED 36,083,628** today against an outlay of **AED 24,000,000**, so the NPV is **AED 12,083,628**. That is wealth created *after* paying debt and equity holders their required 11.50% return. NPV is the primary decision rule because it measures value in currency rather than in ratios.

### Q4: What is the IRR, and how does it compare with the hurdle rate?
**Answer:** IRR is the discount rate at which NPV would be exactly zero — the project's own annual return. It is **26.30%**, against a WACC hurdle of **11.50%**, a margin of **14.80 percentage points**. The engine solves for it with Newton–Raphson and falls back to bisection, and it warns if the cash flows change sign more than once, which would make IRR ambiguous. They do not here.

### Q5: Why is MIRR lower than IRR, and why report both?
**Answer:** IRR quietly assumes every interim cash inflow is reinvested at the project's own 26.30% return, which no treasury can actually achieve. **MIRR** reinvests those flows at the realistic 11.50% cost of capital instead, which is why it is lower at **19.34%**. Reporting both is honest: IRR shows the project's raw return, MIRR shows what shareholders realistically capture. Both clear the hurdle comfortably.

### Q6: What is the Profitability Index, and what does 1.5035x mean?
**Answer:** PI is the present value of inflows divided by the initial outlay: 36,083,628 ÷ 24,000,000 = **1.5035**. Every AED 1.00 committed returns AED 1.50 of present value. Anything above 1.00 creates value. PI matters most under capital rationing, where the question is not "is this good?" but "is this the best use of a limited budget?"

### Q7: How long until the investment pays back?
**Answer:** **3.10 years** undiscounted — cumulative cash flow turns positive during Year 4. On a discounted basis, which accounts for the time value of money, payback is **3.98 years**, still inside Year 4. Both sit comfortably within the six-year life. Payback is reported as a liquidity screen, not as a value measure; it ignores everything that happens after the break-even point.

### Q8: What happens under the pessimistic stress test?
**Answer:** The pessimistic case combines a **25% benefit shortfall**, a **15% cost overrun** and a discount rate rise to **14.50%**, all at once. NPV falls to **AED (4,940,625)**, IRR to **8.23%**, PI to **0.819**, and payback stretches to **5.06 years**. The engine returns **REJECT** for that case, and it is the only base-case risk alert that fires. This is the honest downside, and it is why approval carries conditions rather than being unconditional.

### Q9: How is UAE corporate tax handled?
**Answer:** Under Federal Decree-Law No. 47 of 2022, taxable income up to AED 375,000 is taxed at 0% and income above it at **9%**. The model applies a flat 9% marginal rate to EBIT and does not model the zero-rate band — a deliberate, disclosed simplification that is slightly conservative. Depreciation of **AED 3,333,333 per year** is deducted before tax, producing a tax shield worth **AED 300,000 annually**, and is then added back because it is not a cash outflow.

### Q10: How are electricity costs treated?
**Answer:** The `/electricity-estimator` route computes robotics power cost from the real **DEWA July 2026 slab tariffs** — 23, 28, 32 and 38 fils per kWh, plus a **6 fils per kWh fuel surcharge** and **5% VAT**. Power is one component of the **AED 2.2M annual incremental OpEx** assumption, alongside maintenance, software licences and facility running costs. The estimator is a supporting calculator that informs that assumption; it does not separately override the model.

### Q11: What does the Monte Carlo simulation add?
**Answer:** Scenario analysis tests three futures; Monte Carlo tests thousands. The engine runs **5,000 iterations on a fixed seed (12345)**, so results are reproducible, varying the uncertain drivers simultaneously. The mean NPV is approximately **AED 10.5M** and the probability of a negative NPV is approximately **0.3%**. That is a statement about the assumed input distributions, not a guarantee about the world — if the distributions are optimistic, so is the 0.3%.

### Q12: What happens to the equipment and working capital at the end of Year 6?
**Answer:** The **AED 2.0M** of working capital is recovered in cash, and the equipment is assumed to realise a conservative **AED 2.0M salvage value**. Together they give a **AED 4.0M terminal inflow** inside the Year-6 free cash flow of AED 13,186,330. The salvage assumption is deliberately modest: its present value is only **8.61% of NPV**, so the case does not depend on the residual value.

### Q13: Which single factor matters most?
**Answer:** **Total operating benefits.** Flexing every driver by an identical ±20%, benefits swing NPV by **AED 16.67M** — more than the entire base-case NPV. Project life follows at AED 8.39M, capital expenditure at AED 8.25M, WACC at AED 5.17M, OpEx at AED 3.57M, and salvage is nearly irrelevant at AED 0.37M. The practical conclusion is that management should spend its attention on realising the savings, not on negotiating the equipment price.

### Q14: How does the AI assistant actually help?
**Answer:** Five AI features are implemented: a natural-language finance assistant, automated result explanation, scenario commentary, rule-based risk alerting and a structured board recommendation. All of them consume validated engine output and produce prose. A non-financial director can ask "why did NPV fall?" and get an answer in seconds without reading a spreadsheet. The limitation is equally real: fluent prose lends false confidence to weak assumptions, so every output is labelled advisory.

### Q15: Why approve the full investment rather than delay or reject?
**Answer:** Delay defers the whole benefit stream by a year and cedes position in the fastest-growing postcodes; rejection creates no value and leaves a cost base that worsens with volume. Full approval creates **AED 12.08M** of value on the base case and **AED 9.56M** on a probability-weighted basis. The genuine risk — benefit realisation — is better managed by gating the *release* of capital against measured savings than by refusing the investment altogether.

### Q16: What does the project change operationally?
**Answer:** Fulfilment SLA from **24 hours to under 2 hours**; direct picking cost from **AED 14.50 to AED 4.20 per order**; picking accuracy from about **96.6% to 99.8%**; and capacity to **8,000 orders per day** with high-density automated storage. Robotics uptime is targeted at 99.5% and throughput at 1,800 picks per hour, both of which are audited at the Month-6 gate.

### Q17: How was the 11.50% WACC derived?
**Answer:** It is derived, not assumed. **Cost of equity = 4.20% risk-free + (1.15 beta × 6.00% equity risk premium) + 0.75% UAE country risk premium + 3.50% project execution premium = 15.35%.** **Cost of debt = 3.79% live 3-month EIBOR + 2.50% spread = 6.29% pre-tax, 5.72% after the 9% tax shield.** At a 60/40 equity–debt structure: (0.60 × 15.35%) + (0.40 × 5.72%) = **11.50%**. The build-up is asserted independently in `tests/wacc.test.ts`.

### Q18: What are the main implementation risks?
**Answer:** Three dominate. First, **WCS and ERP integration delay**, managed by vendor milestone SLA payment gates. Second, **demand shortfall** against the volume assumption, mitigated by keeping the facility able to serve multi-tenant fulfilment. Third, **robotics delivery and commissioning lead times**, controlled through a fixed-price turnkey contract with an overrun penalty cap. All three are governed by the five-stage gate framework rather than by a single approval event.

### Q19: How does CapExIQ protect data quality?
**Answer:** CSV imports are parsed and validated against Zod schemas, with a data-quality report tracking valid and invalid rows, and leading `=`, `+`, `-`, `@`, tab and carriage-return characters are escaped on import to defend against spreadsheet formula injection. `SECURITY.md` records the precise scope of that defence, including that it does not currently extend to the export path. The assumptions register carries a classification, a source, a last-updated date and notes for every field.

### Q20: What is the final recommendation to the Board?
**Answer:** **APPROVE the investment.** It returns **AED 12.08M** of net present value, an IRR of **26.30%** against an 11.50% hurdle, a profitability index of **1.50**, and payback inside four years. All five decision rules agree, and expected value across weighted scenarios is **AED 9.56M**. Approval carries **two conditions drawn directly from the sensitivity analysis**:
1. **Release capital against measured Year-1 savings rather than against the calendar** — because benefit realisation swings NPV by more than every other driver combined with the project's whole base-case value.
2. **Require a vendor performance guarantee and a secondary-market buyback before commitment** — because the pessimistic case is genuinely value-destroying at AED (4.94M).

Neither condition changes the recommendation. Both protect it.

---

## AI ASSISTANT — SAMPLE QUESTIONS AND ANSWERS

The assignment brief requires at least five worked question-and-answer examples from the AI assistant. These are the six suggested prompts shipped on `/ai-assistant`, with the answer the assistant produces from injected engine context. **The assistant explains numbers; it never calculates them.**

### AI-Q1: "Why is the MIRR lower than the IRR?"
**Assistant:** The IRR of 26.30% assumes every interim cash inflow is reinvested at 26.30% until the project ends. That is rarely achievable. The MIRR of 19.34% reinvests those same flows at NovaRetail's 11.50% cost of capital, which is the realistic assumption, and finances the outflow at the same rate. The gap of 6.96 percentage points is therefore not a weakness in the project — it is the cost of a more conservative and more defensible reinvestment assumption. Both measures clear the 11.50% hurdle.

### AI-Q2: "What happens if the discount rate rises to 14.5%?"
**Assistant:** Raising the discount rate alone reduces NPV because later cash flows are worth less today, but it does not by itself reverse the decision: NPV only reaches zero at a discount rate of 26.30%, which is the IRR. In the pessimistic scenario the 14.5% rate is applied *together with* a 25% benefit shortfall and a 15% cost overrun, and that combination is what turns NPV negative at AED (4,940,625). Rate risk matters here mainly because it tends to arrive alongside demand weakness, not on its own.

### AI-Q3: "Which assumption has the greatest effect on the result?"
**Assistant:** Total operating benefits — the Year-1 saving of AED 7.5M plus the AED 2.5M margin uplift. Flexing every driver by the same ±20%, benefits move NPV by AED 16.67M, against AED 8.39M for project life, AED 8.25M for capital expenditure, AED 5.17M for the WACC and AED 0.37M for salvage. Benefits can fall 29.0% before NPV reaches zero. Management attention and contractual protection should be concentrated on realising the savings, because no other variable comes close.

### AI-Q4: "Should management accept or reject this project?"
**Assistant:** On the current assumptions, accept. NPV is positive at AED 12,083,628, IRR of 26.30% clears the 11.50% hurdle by 14.80 points, the profitability index is 1.5035, and payback is 3.10 years undiscounted and 3.98 discounted. All five decision rules agree and the engine's decision status is Approve. The qualification is that the pessimistic scenario is genuinely negative, so acceptance should be conditioned on gating capital release against measured savings and on contractual downside protection. This is advisory and requires CFO sign-off.

### AI-Q5: "Why would the NPV decrease under the pessimistic scenario?"
**Assistant:** Three adverse changes are applied at once. Operating benefits are cut to 75% of forecast, which removes the largest component of every year's cash inflow. Capital expenditure rises 15%, increasing the Year-0 outflow. And the discount rate rises from 11.50% to 14.50%, reducing the present value of everything that remains. Individually none of these would be fatal — benefits alone could fall 29.0% and outlay alone could rise 50.4%. Together they take NPV to AED (4,940,625) and IRR to 8.23%, below the hurdle.

### AI-Q6: "Explain this result to a non-financial manager."
**Assistant:** The company would spend AED 24 million now — AED 22 million on the robotic warehouse and AED 2 million of working capital that comes back at the end. Over six years the centre is expected to save and earn enough to return that AED 24 million and roughly AED 12 million more, measured in today's money after paying for the funding. The money spent is recovered in a little over three years. The main thing that could go wrong is the savings not materialising, so the recommendation is to release the second half of the money only after the first year's savings have actually been measured.

---

## CONCLUSION FOR THE BOARD MEMORANDUM

The CapExIQ evaluation finds NovaRetail GCC's proposed automated micro-fulfilment centre financially sound and strategically necessary. It generates a net present value of **AED 12,083,628** at an 11.50% cost of capital, an internal rate of return of **26.30%**, a modified IRR of **19.34%**, a profitability index of **1.5035** and payback in **3.10 years**. Weighted across scenarios the expected value remains **AED 9,560,152**, and across 5,000 Monte Carlo iterations the probability of value destruction is approximately **0.3%**.

The case is not risk-free. Under a simultaneous 25% benefit shortfall, 15% cost overrun and 300-basis-point rate rise, the project destroys **AED 4.94M** of value. That single downside defines the two approval conditions: **release capital against measured Year-1 savings rather than against the calendar, and require a vendor performance guarantee with a secondary-market buyback.**

**Recommendation: APPROVE, subject to those two conditions.** Final responsibility for the decision rests with the Chief Financial Officer and the Capital Expenditure Committee.
