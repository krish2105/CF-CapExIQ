# CapExIQ — Corporate Finance Mathematical Methodology

## 1. Free Cash Flow (FCF) Formula
$$\text{FCF}_t = \text{Operating Savings}_t - \text{OpEx}_t - \text{Depreciation}_t - \text{Tax}_t + \text{Depreciation}_t - \Delta\text{NWC}_t - \text{Capex}_t + \text{Terminal Value}_t$$

Where:
- $\text{EBITDA}_t = \text{Operating Savings}_t - \text{OpEx}_t$
- $\text{Tax}_t = \max(0, (\text{EBITDA}_t - \text{Depreciation}_t) \times \tau)$ (UAE Corporate Tax rate $\tau = 9.0\%$)
- Depreciation is non-cash and added back to EBITDA after tax shields.

## 2. Net Present Value (NPV) Formula
$$\text{NPV} = \sum_{t=0}^{n} \frac{\text{FCF}_t}{(1 + r)^t}$$
Where $r = \text{WACC} = 11.5\%$.

## 3. Internal Rate of Return (IRR) & MIRR
- **IRR**: Solves $\text{NPV}(r) = 0$ using iterative Newton-Raphson method with bisection fallback.
- **Modified IRR (MIRR)**:
$$\text{MIRR} = \left( \frac{\text{Terminal Value of Positive FCFs @ WACC}}{\text{PV of Negative Outlays @ Financing Rate}} \right)^{1/n} - 1$$

## 4. Weighted Average Cost of Capital (WACC) & CAPM
$$r_e = R_f + \beta \cdot \text{ERP}$$
$$r_d = (\text{EIBOR 3M} + \text{Credit Spread}) \cdot (1 - \tau)$$
$$\text{WACC} = \left(\frac{E}{V} \cdot r_e\right) + \left(\frac{D}{V} \cdot r_d\right)$$
Where $R_f = 4.25\%$, $\text{ERP} = 5.50\%$, $\beta = 1.10$, $\text{EIBOR} = 4.85\%$, $\text{Spread} = 1.65\%$.
