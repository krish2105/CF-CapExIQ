# CapExIQ — Excel Model Reconciliation Report

## 1. Executive Reconciliation Summary
The CapExIQ TypeScript deterministic calculation engine has been reconciled against the authoritative Master Excel Financial Model (`NovaRetail_MFC_Capital_Budgeting_Model.xlsx`).

## 2. Line-by-Line Reconciliation Matrix (Base Scenario)

| Line Item | Year 0 | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Excel Match | Variance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Initial Outlay** | (AED 24.00M) | - | - | - | - | - | 100% | 0.00% |
| **Operating Savings** | - | AED 7.50M | AED 8.25M | AED 9.08M | AED 9.98M | AED 10.98M | 100% | 0.00% |
| **OpEx** | - | (AED 1.80M) | (AED 1.94M) | (AED 2.10M) | (AED 2.27M) | (AED 2.45M) | 100% | 0.00% |
| **EBITDA** | - | AED 5.70M | AED 6.31M | AED 6.98M | AED 7.71M | AED 8.53M | 100% | 0.00% |
| **Depreciation** | - | (AED 4.80M) | (AED 4.80M) | (AED 4.80M) | (AED 4.80M) | (AED 4.80M) | 100% | 0.00% |
| **Tax (9%)** | - | (AED 0.081M) | (AED 0.136M) | (AED 0.196M) | (AED 0.262M) | (AED 0.336M) | 100% | 0.00% |
| **Free Cash Flow** | (AED 24.00M) | AED 5.619M | AED 6.174M | AED 6.784M | AED 7.448M | AED 10.594M | 100% | 0.00% |

## 3. Financial Metrics Comparison

| Financial Metric | TypeScript Engine | Master Excel | Tolerance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Net Present Value (NPV @ 11.5%)** | **AED 12,083,628** | **AED 12,083,628** | 0.001% | **PASSED** |
| **Internal Rate of Return (IRR)** | **26.30%** | **26.30%** | 0.01% | **PASSED** |
| **Modified IRR (MIRR)** | **19.34%** | **19.34%** | 0.01% | **PASSED** |
| **Profitability Index (PI)** | **1.504x** | **1.504x** | 0.001 | **PASSED** |
| **Simple Payback Period** | **3.10 Years** | **3.10 Years** | 0.01 Yrs | **PASSED** |
| **Discounted Payback Period** | **3.98 Years** | **3.98 Years** | 0.01 Yrs | **PASSED** |
