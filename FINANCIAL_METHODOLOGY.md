# CapExIQ — Corporate Finance Methodology

Every formula below is implemented in `src/lib/finance/` and pinned by `tests/golden.test.ts`.

## 1. Operating Benefits

The model has **two** benefit streams, not one. Omitting the contribution margin understates Year-1
benefits by AED 2.5M, which is 25% of the total.

$$\text{Savings}_t = 7{,}500{,}000 \times (1 + 4.0\%)^{t-1}$$
$$\text{Contribution Margin}_t = 2{,}500{,}000 \times (1 + 5.0\%)^{t-1}$$
$$\textbf{Operating Benefits}_t = \text{Savings}_t + \text{Contribution Margin}_t$$
$$\text{OpEx}_t = 2{,}200{,}000 \times (1 + 3.0\%)^{t-1}$$

Year 1: 7,500,000 + 2,500,000 = **AED 10,000,000** of benefits against AED 2,200,000 of OpEx.

## 2. Free Cash Flow

$$\text{EBITDA}_t = \text{Operating Benefits}_t - \text{OpEx}_t$$
$$\text{Depreciation} = \frac{\text{Depreciable CapEx} - \text{Salvage}}{\text{Project Life}} = \frac{22{,}000{,}000 - 2{,}000{,}000}{6} = 3{,}333{,}333$$
$$\text{EBIT}_t = \text{EBITDA}_t - \text{Depreciation}$$
$$\text{Tax}_t = \max\left(0,\ \text{EBIT}_t \times \tau\right), \quad \tau = 9.0\%$$
$$\text{NOPAT}_t = \text{EBIT}_t - \text{Tax}_t$$
$$\text{OCF}_t = \text{NOPAT}_t + \text{Depreciation} \ \left(\equiv \text{EBITDA}_t - \text{Tax}_t\right)$$
$$\textbf{FCF}_t = \text{OCF}_t + \text{Salvage}_t + \Delta\text{NWC Recovery}_t$$
$$\textbf{FCF}_0 = -\left(\text{CapEx} + \text{Initial NWC}\right) = -\left(22{,}000{,}000 + 2{,}000{,}000\right) = -24{,}000{,}000$$

Salvage and the working-capital recovery (AED 2,000,000 each) appear only in the terminal year.
Depreciation is straight line **to salvage**, not to zero, so the depreciable base is AED 20,000,000.

**Resulting stream (AED):**

| Year | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| FCF | −24,000,000 | 7,398,000 | 7,724,690 | 8,066,186 | 8,423,154 | 8,796,293 | 13,186,330 |

## 3. Net Present Value

$$\text{NPV} = \sum_{t=0}^{n} \frac{\text{FCF}_t}{(1 + r)^t}, \qquad r = \text{WACC} = 11.50\%$$

PV of inflows = **AED 36,083,628**. NPV = 36,083,628 − 24,000,000 = **AED 12,083,628**.

## 4. IRR, MIRR, PI, Payback and ROI

- **IRR** solves $\text{NPV}(r) = 0$ by Newton–Raphson with a bisection fallback: **26.30%**.
- **MIRR**:
  $$\text{MIRR} = \left(\frac{\text{Terminal value of positive FCFs compounded at the reinvestment rate}}{\left|\text{PV of negative flows at the finance rate}\right|}\right)^{1/n} - 1 = 19.34\%$$
  Both the finance and reinvestment rates are set to the scenario discount rate (11.50% in the base
  case), which is why MIRR sits below IRR: it removes the IRR's implicit assumption that interim cash
  flows are reinvested at 26.30%.
- **Profitability index**: $\text{PI} = \dfrac{\text{PV of inflows}}{\text{Initial outlay}} = \dfrac{36{,}083{,}628}{24{,}000{,}000} = \mathbf{1.5035}$
- **Payback period** (undiscounted, linear interpolation within the recovery year): **3.10 years**.
- **Discounted payback** (same interpolation on discounted flows): **3.98 years**.
- **Accounting ROI**: $\dfrac{\sum_{t=1}^{6}\text{FCF}_t - \text{Outlay}}{\text{Outlay}} = \dfrac{53{,}594{,}653 - 24{,}000{,}000}{24{,}000{,}000} = \mathbf{123.3\%}$

## 5. Weighted Average Cost of Capital — Derived, Not Assumed

The 11.50% hurdle rate is **built up from its components** and lands exactly on 11.50%.
Implementation: `src/lib/finance/wacc.ts`; live calculator: `/external-data`.

### 5.1 Cost of Equity (adjusted CAPM / build-up)

$$r_e = R_f + \beta \cdot \text{ERP} + \text{CRP} + \text{Execution Premium}$$

| Component | Value | Note |
| :--- | ---: | :--- |
| Risk-free rate $R_f$ | 4.20% | Long-dated sovereign yield proxy |
| Beta $\beta$ | 1.15 | Levered equity beta, GCC omnichannel retail |
| Equity risk premium (ERP) | 6.00% | Mature-market ERP |
| $\beta \times \text{ERP}$ | **6.90%** | 1.15 × 6.00% |
| UAE country risk premium (CRP) | 0.75% | Damodaran-style additive CRP |
| Project execution premium | 3.50% | Greenfield, first-of-a-kind robotics build: integration, ramp-up and obsolescence risk that a listed-equity beta cannot capture |
| **Cost of equity** | **15.35%** | 4.20 + 6.90 + 0.75 + 3.50 |

Plain CAPM alone ($4.20\% + 1.15 \times 6.00\% = 9.33\%$) is a diversified listed-equity cost of
capital and understates the risk of a single greenfield capital project. The two additive premiums are
what reconcile the build-up to the 11.50% hurdle rate.

### 5.2 Cost of Debt

$$r_d^{\text{pre-tax}} = \text{EIBOR 3M} + \text{Credit Spread} = 3.79\% + 2.50\% = 6.29\%$$
$$r_d^{\text{after-tax}} = 6.29\% \times (1 - 9\%) = \mathbf{5.72\%}$$

The **3.79%** 3-month EIBOR is the live rate. The 4.85% figure carried in earlier versions of this
document was stale and has been replaced.

### 5.3 WACC

$$\text{WACC} = \frac{E}{V} r_e + \frac{D}{V} r_d^{\text{after-tax}}$$
$$= (0.60 \times 15.35\%) + (0.40 \times 5.72\%) = 9.21\% + 2.29\% = \mathbf{11.50\%}$$

Target capital structure: **60% equity / 40% debt**.

## 6. Scenario Construction

`src/lib/finance/scenarios.ts` applies multipliers to the base assumptions. The benefit multiplier is
applied to **both** operating savings and contribution margin.

| Scenario | Investment | Benefits | Costs | Discount rate | NPV (AED) | IRR | PI | Decision |
| :--- | :---: | :---: | :---: | :---: | ---: | ---: | ---: | :--- |
| Optimistic | ×0.95 | ×1.10 | ×0.95 | 10.5% | 19,013,977 | 33.59% | 1.830 | Approve |
| Base | ×1.00 | ×1.00 | ×1.00 | 11.5% | 12,083,628 | 26.30% | 1.504 | Approve |
| Pessimistic | ×1.15 | ×0.75 | ×1.15 | 14.5% | −4,940,625 | 8.23% | 0.819 | **Reject** |

$$\mathbb{E}[\text{NPV}] = 0.50(12{,}083{,}628) + 0.25(19{,}013{,}977) + 0.25(-4{,}940{,}625) = \mathbf{9{,}560{,}152}$$

## 7. Sensitivity

`calculateOneWaySensitivity` flexes each driver by an identical **±20%** so the resulting NPV swings
are directly comparable on the tornado chart.

| Rank | Driver | NPV swing (AED) |
| :---: | :--- | ---: |
| 1 | Operating benefits (savings + contribution margin) | **16.67M** |
| 2 | Project life | 8.39M |
| 3 | Initial capital expenditure | 8.25M |
| 4 | Discount rate (WACC) | 5.17M |
| 5 | Additional OpEx | 3.57M |
| 6 | Savings growth rate | 1.10M |
| 7 | Salvage value | 0.37M |

**Break-even:** operating benefits may fall **29.0%**; total outlay may rise **50.4%** (to AED
36.08M); NPV reaches zero at a **26.30%** discount rate. The PV of the salvage value is **8.61%** of
NPV, so the result is not dependent on the residual-value assumption.
