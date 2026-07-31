# CapExIQ — Capital Portfolio Optimization & Rationing Framework

## Overview
The **Capital Portfolio Optimizer** enables corporate capital rationing decisions by selecting the optimal combination of competing investment projects under capital budget constraints.

## Deterministic Optimization Algorithm
Projects are ranked by **Profitability Index (PI)**:
$$PI = \frac{\text{PV of Cash Inflows}}{\text{Initial Investment}}$$
Projects are allocated sequentially subject to:
1. **Mandatory Projects**: Allocated first.
2. **Discretionary Projects**: Selected in descending order of PI index until budget is exhausted.
3. **Negative NPV Projects**: Automatically excluded from selection.
