# CapExIQ: Financial Model Reconciliation Guide

**Purpose:** Verify deterministic TypeScript calculation outputs against Excel corporate finance baselines.

---

## 1. Initial Outlay Reconciliation (Time Zero)

| Component | Excel Baseline (AED) | CapExIQ Engine (AED) | Variance |
| :--- | :---: | :---: | :---: |
| Automation Equipment | 18,000,000 | 18,000,000 | 0.00 |
| Installation & Integration | 2,500,000 | 2,500,000 | 0.00 |
| Software & Cybersecurity | 1,200,000 | 1,200,000 | 0.00 |
| Training & Launch | 300,000 | 300,000 | 0.00 |
| **Total Capex Outlay** | **22,000,000** | **22,000,000** | **0.00** |
| Initial Working Capital | 2,000,000 | 2,000,000 | 0.00 |
| **Total Initial Outlay ($FCF_0$)** | **-24,000,000** | **-24,000,000** | **0.00** |

---

## 2. Year 1 Free Cash Flow Reconciliation

| Line Item | Formula / Logic | Excel Baseline (AED) | CapExIQ Engine (AED) |
| :--- | :--- | :---: | :---: |
| Operating Cost Savings | Base Y1 | 7,500,000.00 | 7,500,000.00 |
| Contribution Margin Uplift | Base Y1 | 2,500,000.00 | 2,500,000.00 |
| **Total Operating Benefits** | Savings + Margin | **10,000,000.00** | **10,000,000.00** |
| Additional OpEx | Base Y1 | (2,200,000.00) | (2,200,000.00) |
| **EBITDA** | Benefits - OpEx | **7,800,000.00** | **7,800,000.00** |
| Straight-Line Depreciation | $(22M - 2M) / 6$ | (3,333,333.33) | (3,333,333.33) |
| **EBIT** | EBITDA - Depr | **4,466,666.67** | **4,466,666.67** |
| Corporate Tax (9%) | $EBIT \times 9\%$ | (402,000.00) | (402,000.00) |
| **NOPAT** | EBIT - Tax | **4,064,666.67** | **4,064,666.67** |
| **Operating Cash Flow (OCF)** | NOPAT + Depr | **7,398,000.00** | **7,398,000.00** |
| **Free Cash Flow ($FCF_1$)** | OCF | **7,398,000.00** | **7,398,000.00** |

---

## 3. Discounted Metrics Summary Reconciliation

| Metric | Formula / Algorithm | Excel Standard | CapExIQ Engine | Variance |
| :--- | :--- | :---: | :---: | :---: |
| **Net Present Value (NPV)** | `XNPV / NPV` @ 11.5% | AED 12,083,628 | AED 12,083,628 | 0.00 |
| **Internal Rate of Return (IRR)** | `IRR` root search | 26.30% | 26.30% | 0.00% |
| **Modified IRR (MIRR)** | `MIRR(11.5%, 11.5%)` | 19.34% | 19.34% | 0.00% |
| **Profitability Index (PI)** | $PV(Inflows) / I_0$ | 1.504x | 1.504x | 0.000 |
| **Payback Period** | Undiscounted fractional | 3.10 Yrs | 3.10 Yrs | 0.00 Yrs |
| **Discounted Payback** | Discounted fractional | 3.98 Yrs | 3.98 Yrs | 0.00 Yrs |
