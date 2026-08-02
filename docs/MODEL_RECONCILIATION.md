# CapExIQ — Model Reconciliation Report

## 1. Scope and Honest Framing

This report reconciles the deterministic TypeScript calculation engine (`src/lib/finance/`) against
the committed base-case cash-flow schedule
[`NovaRetail_MFC_Financial_Model_Base.csv`](NovaRetail_MFC_Financial_Model_Base.csv) in the
repository root.

**What this is:** a line-by-line check that the published cash-flow schedule, the figures quoted
throughout the documentation, and the numbers the running application produces are the same numbers.

**What this is not:** an independent third-party audit or a reconciliation against an external Excel
workbook. There is no Excel model in this repository. Earlier versions of this document claimed a
0.00% reconciliation against a file named `NovaRetail_MFC_Capital_Budgeting_Model.xlsx`; **that file
does not exist and never did**, and the cash-flow rows quoted alongside that claim described a
different model altogether (AED 1.80M OpEx, AED 4.80M annual depreciation, 10% savings growth, a
5-year life). Every one of those figures was wrong. This document has been rebuilt from the engine
output and the committed CSV.

The reconciliation is enforced automatically by `tests/golden.test.ts`, which pins the exact values
below and fails the build if the engine drifts.

## 2. Base-Case Assumptions Under Reconciliation

| Input | Value |
| :--- | ---: |
| CapEx (equipment / installation / software / training) | 18.0M / 2.5M / 1.2M / 0.3M = **AED 22,000,000** |
| Initial working capital | **AED 2,000,000** |
| Total initial outlay | **AED 24,000,000** |
| Project life | **6 years** |
| Year-1 operating savings / growth | **AED 7,500,000** / **4.0% p.a.** |
| Year-1 contribution margin / growth | **AED 2,500,000** / **5.0% p.a.** |
| Year-1 additional OpEx / growth | **AED 2,200,000** / **3.0% p.a.** |
| Depreciation (straight line to salvage) | **AED 3,333,333 / yr** |
| Corporate tax rate | **9.0%** |
| Salvage / working-capital recovery (Year 6) | **AED 2,000,000** / **AED 2,000,000** |
| Discount rate (WACC) | **11.50%** |

## 3. Line-by-Line Reconciliation Matrix (Base Scenario, AED)

Engine output compared with the corresponding row of `NovaRetail_MFC_Financial_Model_Base.csv`.

| Line Item | Year 0 | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Variance |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |
| Operating savings | — | 7,500,000 | 7,800,000 | 8,112,000 | 8,436,480 | 8,773,939 | 9,124,897 | 0.00% |
| Incremental contribution margin | — | 2,500,000 | 2,625,000 | 2,756,250 | 2,894,063 | 3,038,766 | 3,190,704 | 0.00% |
| **Total operating benefits** | — | **10,000,000** | **10,425,000** | **10,868,250** | **11,330,543** | **11,812,705** | **12,315,601** | 0.00% |
| Additional OpEx | — | (2,200,000) | (2,266,000) | (2,333,980) | (2,403,999) | (2,476,119) | (2,550,403) | 0.00% |
| **EBITDA** | — | **7,800,000** | **8,159,000** | **8,534,270** | **8,926,543** | **9,336,585** | **9,765,198** | 0.00% |
| Depreciation | — | (3,333,333) | (3,333,333) | (3,333,333) | (3,333,333) | (3,333,333) | (3,333,333) | 0.00% |
| EBIT | — | 4,466,667 | 4,825,667 | 5,200,937 | 5,593,210 | 6,003,252 | 6,431,864 | 0.00% |
| Tax at 9% | — | (402,000) | (434,310) | (468,084) | (503,389) | (540,293) | (578,868) | 0.00% |
| NOPAT | — | 4,064,667 | 4,391,357 | 4,732,852 | 5,089,821 | 5,462,959 | 5,852,997 | 0.00% |
| Operating cash flow (NOPAT + dep.) | — | 7,398,000 | 7,724,690 | 8,066,186 | 8,423,154 | 8,796,293 | 9,186,330 | 0.00% |
| Salvage value | — | — | — | — | — | — | 2,000,000 | 0.00% |
| Working-capital recovery | (2,000,000) | — | — | — | — | — | 2,000,000 | 0.00% |
| Initial CapEx | (22,000,000) | — | — | — | — | — | — | 0.00% |
| **Free cash flow** | **(24,000,000)** | **7,398,000** | **7,724,690** | **8,066,186** | **8,423,154** | **8,796,293** | **13,186,330** | 0.00% |
| Discount factor @ 11.5% | 1.0000 | 0.8969 | 0.8044 | 0.7214 | 0.6470 | 0.5803 | 0.5204 | 0.00% |
| Present value | (24,000,000) | 6,634,978 | 6,213,429 | 5,818,936 | 5,449,734 | 5,104,172 | 6,862,380 | 0.00% |
| Cumulative FCF | (24,000,000) | (16,602,000) | (8,877,310) | (811,124) | 7,612,030 | 16,408,323 | 29,594,653 | 0.00% |
| Cumulative discounted FCF | (24,000,000) | (17,365,022) | (11,151,594) | (5,332,657) | 117,077 | 5,221,249 | **12,083,628** | 0.00% |

The cumulative discounted FCF in Year 6 closes at **AED 12,083,628**, which *is* the reported NPV.
This is the arithmetic tie-out that the previous version of this document failed: its published FCF
row discounted to roughly +AED 1.87M while it reported an NPV of AED 12.08M and marked the line
"PASSED".

## 4. Headline Metrics

| Metric | TypeScript engine | `NovaRetail_MFC_Financial_Model_Base.csv` | Derivation | Status |
| :--- | ---: | ---: | :--- | :---: |
| Net present value @ 11.5% | **12,083,628** | **12,083,628** | Year-6 cumulative discounted FCF | Reconciled |
| Internal rate of return | **26.30%** | **26.30%** | Root of NPV(r) = 0 on the FCF row | Reconciled |
| Modified IRR | **19.34%** | **19.34%** | Finance and reinvestment rates both 11.5% | Reconciled |
| Profitability index | **1.5035x** | **1.5035x** | 36,083,628 ÷ 24,000,000 | Reconciled |
| PV of inflows | **36,083,628** | **36,083,628** | Sum of Years 1–6 present values | Reconciled |
| Payback period | **3.10 yrs** | **3.10 yrs** | 3 + 811,124 ÷ 8,423,154 | Reconciled |
| Discounted payback | **3.98 yrs** | **3.98 yrs** | 3 + 5,332,657 ÷ 5,449,734 | Reconciled |
| Accounting ROI | **123.3%** | **123.3%** | 29,594,653 ÷ 24,000,000 | Reconciled |

## 5. Scenario Reconciliation

| Scenario | NPV (AED) | IRR | PI | Decision |
| :--- | ---: | ---: | ---: | :--- |
| Optimistic | 19,013,977 | 33.59% | 1.830 | Approve |
| Base | 12,083,628 | 26.30% | 1.504 | Approve |
| Pessimistic | (4,940,625) | 8.23% | 0.819 | **Reject** |
| **Expected NPV (50 / 25 / 25)** | **9,560,152** | — | — | — |

## 6. Rounding Convention

The CSV carries two decimal places; this document rounds to the nearest AED for readability.
Depreciation is AED 3,333,333.33 per year exactly in both. All differences are presentational rounding
only; the engine and the CSV are generated from the same assumption set and agree to the cent.
