# CapExIQ — Model Assumptions Register

Every figure below is the value actually used by the deterministic engine
(`src/lib/data/defaultAssumptions.ts`) and is pinned by `tests/golden.test.ts`. The in-app register at
`/assumptions` renders the same data.

## Data Classification Key

The assignment brief requires each input to be classified. Five classes are used:

| Class | Meaning |
| :--- | :--- |
| **Historical** | Observed past data from a real record |
| **Current external** | A real, currently published external figure (tariff, tax rate, market rate) |
| **Forecast** | A forward-looking projection produced by management |
| **User-entered** | An assumption typed into the app / set as a policy input; editable in the UI |
| **AI-generated** | Produced by a language model |

**No financial input in this model is AI-generated.** AI is used only to explain and narrate
outputs that the deterministic engine has already computed.

## Core Financial Assumptions

| # | Parameter | Base Value | Unit | Category | Data Classification | Source | Owner |
| :---: | :--- | ---: | :--- | :--- | :--- | :--- | :--- |
| 1 | Automation equipment | 18,000,000 | AED | CapEx | User-entered | Academic project estimate (illustrative, not a vendor quotation) | CTO |
| 2 | Installation and systems integration | 2,500,000 | AED | CapEx | User-entered | Academic project estimate | CTO |
| 3 | Software and cybersecurity | 1,200,000 | AED | CapEx | User-entered | Academic project estimate | CTO |
| 4 | Training and launch | 300,000 | AED | CapEx | User-entered | Academic project estimate | COO |
| 5 | **Total capital expenditure** | **22,000,000** | AED | CapEx | Derived from rows 1–4 | — | CFO |
| 6 | Initial working capital | 2,000,000 | AED | Working capital | Forecast | Management assumption — flat amount, **not** a percentage of revenue | CFO |
| 7 | **Total initial outlay (CF0)** | **24,000,000** | AED | Outlay | Derived from rows 5–6 | — | CFO |
| 8 | Project life | 6 | years | Project | User-entered | Management policy; economic life of the robotics asset class | CFO |
| 9 | Year-1 operating cost savings | 7,500,000 | AED/yr | Operating benefit | Forecast | Management estimate: direct labour reduction, pick-error elimination, space consolidation. Corroborated bottom-up at ~AED 7.49M by `/capacity-model` | COO |
| 10 | Annual savings growth | 4.0% | % p.a. | Operating benefit | Forecast | Management estimate: wage inflation plus progressive efficiency gains | COO |
| 11 | **Year-1 incremental contribution margin** | **2,500,000** | AED/yr | Operating benefit | Forecast | Management estimate: additional order capacity and faster-SLA market capture. **25% of Year-1 total benefits** | Head of Strategy |
| 12 | Annual contribution margin growth | 5.0% | % p.a. | Operating benefit | Forecast | Management estimate: omnichannel volume expansion | Head of Strategy |
| 13 | Year-1 additional operating cost | 2,200,000 | AED/yr | OpEx | Forecast | Management estimate: robotics maintenance contract, cloud WCS fees, DEWA power | COO |
| 14 | Annual operating cost growth | 3.0% | % p.a. | OpEx | Forecast | Management estimate: SLA and utility tariff escalation | CFO |
| 15 | Discount rate / hurdle rate (WACC) | 11.50% | % | Finance | Current external (derived) | Built up from the live 4.20% risk-free rate, 1.15 beta, 6.00% ERP, 0.75% UAE CRP, 3.50% execution premium, 3.79% 3-month EIBOR and a 2.50% credit spread at 60/40 equity–debt. See `FINANCIAL_METHODOLOGY.md` | CFO |
| 16 | UAE corporate tax rate | 9.0% | % | Tax | Current external | Federal Decree-Law No. 47 of 2022; applied as a flat marginal rate (see `MODEL_LIMITATIONS.md`) | CFO |
| 17 | Salvage value in final year | 2,000,000 | AED | Terminal value | Forecast | Management estimate of Year-6 secondary-market recovery. PV is 8.61% of NPV | COO |
| 18 | Working-capital recovery in final year | 2,000,000 | AED | Working capital | Forecast | Full recovery of row 6 in Year 6 | CFO |
| 19 | **Annual depreciation** | **3,333,333** | AED/yr | Tax / depreciation | Derived | Straight line **to salvage**: (22,000,000 − 2,000,000) ÷ 6 | CFO |

## Scenario Multipliers

Applied by `src/lib/finance/scenarios.ts` to the assumptions above.

| Scenario | Investment | Operating benefits | Operating costs | Discount rate |
| :--- | :---: | :---: | :---: | :---: |
| Optimistic | ×0.95 | ×1.10 | ×0.95 | 10.5% |
| Base | ×1.00 | ×1.00 | ×1.00 | 11.5% |
| Pessimistic | ×1.15 | ×0.75 | ×1.15 | 14.5% |

Benefit multipliers apply to **both** the operating savings and the contribution margin.

## Notes on Provenance

- The four CapEx lines are **illustrative academic estimates**. They are not sourced vendor
  quotations. `public/data/09_data_source_register.csv` records the instruction to replace them with
  supplier quotations before any real-world use.
- The 9% tax rate and the DEWA tariff schedule are genuine current external figures.
- The DataCo operational dataset is real external data but is US-market operational data used as an
  operational benchmark only. It does **not** feed any figure in this register.
