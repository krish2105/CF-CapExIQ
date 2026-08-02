# CapExIQ: Financial Model Reconciliation Guide

**Purpose:** Demonstrate that the deterministic TypeScript finance engine reproduces the published NovaRetail GCC capital-budgeting model exactly, line by line, against an independent control file and an automated regression suite.

**Control file:** `NovaRetail_MFC_Financial_Model_Base.csv` (repository root) — the full 6-year base-case schedule, one row per year, carrying operating savings, incremental margin, total benefits, additional OpEx, EBITDA, depreciation, EBIT, tax, NOPAT, operating cash flow, salvage, working-capital recovery, free cash flow, discount factor, present value and both cumulative columns.

**Automated guarantee:** `tests/golden.test.ts` — a golden-value regression suite that asserts the engine's exact outputs rather than loose inequalities. Every other unit test asserts ranges and would stay green while the model drifted; this suite fails the moment any published figure changes.

**Method.** The control file is the reference, not a spreadsheet: no Excel workbook exists in this repository and none is required. Reconciliation is performed at three levels — the Year-0 outlay, the Year-1 cash flow build, and the discounted summary metrics — and then verified across all six years. Discount factors are shown to four decimal places as they appear in the control file; present values are computed at full precision, so a factor multiplied by hand will differ in the last few dirhams.

---

## 1. Initial Outlay Reconciliation (Time Zero)

| Component | CSV Control Model (AED) | CapExIQ Engine (AED) | Variance |
| :--- | ---: | ---: | ---: |
| Automation Equipment | 18,000,000 | 18,000,000 | 0.00 |
| Installation & Integration | 2,500,000 | 2,500,000 | 0.00 |
| Software & Cybersecurity | 1,200,000 | 1,200,000 | 0.00 |
| Training & Launch | 300,000 | 300,000 | 0.00 |
| **Total Capital Expenditure** | **22,000,000** | **22,000,000** | **0.00** |
| Initial Net Working Capital | 2,000,000 | 2,000,000 | 0.00 |
| **Total Initial Outlay (FCF₀)** | **(24,000,000)** | **(24,000,000)** | **0.00** |

Working capital is an outflow at Year 0 and is recovered in full at Year 6; it is deliberately excluded from the depreciable base.

---

## 2. Year 1 Free Cash Flow Reconciliation

| Line Item | Formula / Logic | CSV Control Model (AED) | CapExIQ Engine (AED) | Variance |
| :--- | :--- | ---: | ---: | ---: |
| Operating Cost Savings | Year-1 base | 7,500,000.00 | 7,500,000.00 | 0.00 |
| Contribution Margin Uplift | Year-1 base | 2,500,000.00 | 2,500,000.00 | 0.00 |
| **Total Operating Benefits** | Savings + Margin | **10,000,000.00** | **10,000,000.00** | **0.00** |
| Additional OpEx | Year-1 base | (2,200,000.00) | (2,200,000.00) | 0.00 |
| **EBITDA** | Benefits − OpEx | **7,800,000.00** | **7,800,000.00** | **0.00** |
| Straight-Line Depreciation | (22.0M − 2.0M) ÷ 6 | (3,333,333.33) | (3,333,333.33) | 0.00 |
| **EBIT** | EBITDA − Depreciation | **4,466,666.67** | **4,466,666.67** | **0.00** |
| Corporate Tax | EBIT × 9% | (402,000.00) | (402,000.00) | 0.00 |
| **NOPAT** | EBIT − Tax | **4,064,666.67** | **4,064,666.67** | **0.00** |
| **Operating Cash Flow** | NOPAT + Depreciation | **7,398,000.00** | **7,398,000.00** | **0.00** |
| **Free Cash Flow (FCF₁)** | OCF (no capex, no ΔNWC) | **7,398,000.00** | **7,398,000.00** | **0.00** |

Depreciation is subtracted to establish taxable income and added back because it is non-cash — the depreciation tax shield is worth AED 300,000 per year at the 9% rate.

---

## 3. Discounted Metrics Summary Reconciliation

| Metric | Algorithm | CSV Control Model | CapExIQ Engine | Variance |
| :--- | :--- | ---: | ---: | ---: |
| **Net Present Value** | Σ FCFₜ ÷ (1 + 11.50%)ᵗ | AED 12,083,628 | AED 12,083,628 | 0.00 |
| **Present Value of Inflows** | Σ PV of Years 1–6 | AED 36,083,628 | AED 36,083,628 | 0.00 |
| **Internal Rate of Return** | Newton–Raphson, bisection fallback | 26.30% | 26.30% | 0.00 pp |
| **Modified IRR** | Finance and reinvestment rate 11.50% | 19.34% | 19.34% | 0.00 pp |
| **Profitability Index** | PV inflows ÷ 24,000,000 | 1.5035x | 1.5035x | 0.0000 |
| **Return on Investment** | (Σ FCF₁₋₆ − outlay) ÷ outlay | 123.3% | 123.3% | 0.0 pp |
| **Payback Period** | Undiscounted, fractional | 3.10 yrs | 3.10 yrs | 0.00 yrs |
| **Discounted Payback** | Discounted, fractional | 3.98 yrs | 3.98 yrs | 0.00 yrs |

The control file prints the cash-flow vector, the discount factors, the present values and both cumulative columns. NPV and the present value of inflows are read directly from its final row; IRR, MIRR, PI, ROI and the two payback measures are derived from that same cash-flow vector by independent calculation and then compared with the engine.

---

## 4. Full Six-Year Schedule Reconciliation

Both columns are taken from the same control file and the same engine run; the free cash flow line is the vector pinned in `tests/golden.test.ts`.

| Year | Total Benefits (AED) | OpEx (AED) | EBIT (AED) | Tax 9% (AED) | Free Cash Flow (AED) | Discount Factor | Present Value (AED) | Variance |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | — | — | — | — | (24,000,000) | 1.0000 | (24,000,000) | 0.00 |
| 1 | 10,000,000 | 2,200,000 | 4,466,667 | 402,000 | 7,398,000 | 0.8969 | 6,634,978 | 0.00 |
| 2 | 10,425,000 | 2,266,000 | 4,825,667 | 434,310 | 7,724,690 | 0.8044 | 6,213,429 | 0.00 |
| 3 | 10,868,250 | 2,333,980 | 5,200,937 | 468,084 | 8,066,186 | 0.7214 | 5,818,936 | 0.00 |
| 4 | 11,330,543 | 2,403,999 | 5,593,210 | 503,389 | 8,423,154 | 0.6470 | 5,449,734 | 0.00 |
| 5 | 11,812,705 | 2,476,119 | 6,003,252 | 540,293 | 8,796,293 | 0.5803 | 5,104,172 | 0.00 |
| 6 | 12,315,601 | 2,550,403 | 6,431,864 | 578,868 | 13,186,330 | 0.5204 | 6,862,380 | 0.00 |
| | | | | | **Cumulative discounted** | | **12,083,628** | **0.00** |

Year 6 free cash flow of AED 13,186,330 is the operating cash flow of AED 9,186,330 plus AED 2,000,000 of salvage and AED 2,000,000 of recovered working capital. Cumulative undiscounted cash flow turns positive during Year 4 (payback 3.10 years); cumulative discounted cash flow turns positive during Year 4 as well, at 3.98 years.

---

## 5. Scenario and Risk Reconciliation

| Output | Control Basis | CapExIQ Engine | Variance |
| :--- | :--- | ---: | ---: |
| Optimistic NPV / IRR / PI | CapEx ×0.95, benefits ×1.10, OpEx ×0.95, WACC 10.5% | 19,013,977 / 33.59% / 1.830 | 0.00 |
| Base NPV / IRR / PI | Control file as issued | 12,083,628 / 26.30% / 1.504 | 0.00 |
| Pessimistic NPV / IRR / PI | CapEx ×1.15, benefits ×0.75, OpEx ×1.15, WACC 14.5% | (4,940,625) / 8.23% / 0.819 | 0.00 |
| Expected NPV | 50 / 25 / 25 weighting | 9,560,152 | 0.00 |
| Top sensitivity driver | All drivers flexed ±20% | Operating benefits, swing 16.67M | — |
| Break-even benefit shortfall | NPV = 0 | 29.0% | — |
| Break-even outlay ceiling | NPV = 0 | 50.4% rise, to AED 36.08M | — |
| Break-even discount rate | NPV = 0 | 26.30% (equals IRR) | — |
| Monte Carlo, 5,000 runs, seed 12345 | Deterministic seed | Mean NPV ≈ AED 10.5M; P(NPV < 0) ≈ 0.3% | — |

---

## 6. WACC Reconciliation

| Component | Input | Result |
| :--- | :--- | ---: |
| Risk-free rate | UAE sovereign benchmark | 4.20% |
| Equity risk premium × beta | 6.00% × 1.15 | 6.90% |
| Country risk premium | UAE | 0.75% |
| Project execution premium | Automation delivery risk | 3.50% |
| **Cost of equity** | Sum of the above | **15.35%** |
| Cost of debt, pre-tax | 3-month EIBOR 3.79% + 2.50% spread | 6.29% |
| **Cost of debt, after tax** | 6.29% × (1 − 9%) | **5.72%** |
| **WACC** | (0.60 × 15.35%) + (0.40 × 5.72%) | **11.50%** |

The 11.50% hurdle rate is derived, not assumed, and is asserted independently in `tests/wacc.test.ts`.

---

## 7. How to Reproduce This Reconciliation

1. `pnpm test` — runs the Vitest suites. `tests/golden.test.ts` asserts the exact free-cash-flow vector, NPV, IRR, MIRR, PI, both payback measures and the three scenario results shown above.
2. Open `/financial-model` in the running application and click **Export Schedule to CSV**.
3. Compare the export with `NovaRetail_MFC_Financial_Model_Base.csv`. The two files agree to the dirham.

**If the golden suite fails, do not edit the expected values to make it pass.** A failure means the engine has moved and every published figure — this document, the report, the deck and the board PDF — is now wrong. Either revert the engine change, or accept it deliberately and regenerate all downstream documents so they agree with the engine again.
