# CapExIQ: CFO & Capital Expenditure Committee Presentation Deck

**Project:** NovaRetail GCC — Automated Micro-Fulfilment Centre Evaluation  
**Presentation Duration:** 7–10 Minutes (10 Slides)  

---

## Slide 1: Title & Strategic Context
- **Title:** CapExIQ — AI-Enabled Capital Budgeting Decision Dashboard
- **Subtitle:** Evaluation of Automated Micro-Fulfilment Centre (MFC) for NovaRetail GCC
- **Presenter:** Corporate Finance Project Group
- **Context Notice:** NovaRetail GCC is a hypothetical UAE omnichannel retailer model.

## Slide 2: Strategic Investment Problem
- UAE e-commerce boom & demand for 30-minute delivery SLAs.
- Current manual store picking model is inefficient, costly, and error-prone.
- Proposed Solution: AED 24.0M Automated MFC (Robotics ASRS + WCS Integration).
- Strategic Options: Approve Full, Phased Implementation, Delay, or Reject.

## Slide 3: Capital Outlay & Operational Assumptions
- **Capex Breakdown:** Equipment (18M), Installation (2.5M), Software (1.2M), Training (0.3M) = AED 22.0M.
- **Working Capital:** AED 2.0M initial outlay (recovered in Year 6).
- **Year 1 Benefits:** AED 7.5M labor savings (4% growth) + AED 2.5M margin uplift (5% growth).
- **OpEx & Tax:** AED 2.2M OpEx (3% growth); 9% UAE Corporate Tax rate; 11.5% WACC hurdle rate.

## Slide 4: Baseline Financial Results
- **Net Present Value (NPV):** AED 12.08 Million (Positive value creation).
- **Internal Rate of Return (IRR):** 26.3% (Exceeds 11.5% WACC hurdle rate).
- **Modified IRR (MIRR):** 19.3% (Realistic WACC reinvestment rate).
- **Profitability Index (PI):** 1.38x (AED 1.38 value per AED 1.00 capital).
- **Payback Period:** 3.2 Years (Discounted payback: 4.8 Years).

## Slide 5: Scenario & Stress-Test Comparisons
- **Optimistic Scenario:** NPV = AED 19.01M | IRR = 33.6% (Capex -5%, Benefits +10%, WACC 10.5%).
- **Base Case:** NPV = AED 12.08M | IRR = 26.3% (Management baseline).
- **Stress-Test Pessimistic:** NPV = -AED 4.94M | IRR = 8.2% (Capex +15%, Benefits -25%, WACC 14.5%).
- **Takeaway:** Downside exposure under extreme stress requires risk mitigation controls.

## Slide 6: Sensitivity Analysis & Value Drivers
- **Tornado Ranking:** Year 1 Operating Benefits has the single largest impact on project NPV.
- **Break-Even Tolerances:** Max allowable capex overrun is +41.7%; max allowable benefit shortfall is -18.2%.
- **2-Way Matrix Highlight:** Project remains NPV-positive up to WACC of 14.5% if benefits meet target.

## Slide 7: AI Integration & Financial Governance
- **Deterministic Math Engine:** Pure TypeScript calculates all NPV/IRR values; AI does zero math.
- **Server Route Handlers:** OpenAI API routes (`/api/ai/explain`, `/api/ai/recommend`) hide API keys.
- **Structured Governance Outputs:** AI generates structured board advisories with explicit disclaimers.

## Slide 8: Rule-Based Risk Alerts
- **Risk 1:** Benefit Shortfall Sensitivity (High severity if benefits drop > 15%).
- **Risk 2:** Terminal Salvage Dependence (Year 6 salvage value represents 11.4% of baseline NPV).
- **Risk 3:** Multiple IRRs warning handled deterministically via Newton-Raphson & Bisection math.

## Slide 9: Final Executive Recommendation
- **Recommended Option:** **Phased Implementation**.
- **Phase 1 (Time Zero):** Commit AED 14.0M for core robotics hardware and software integration.
- **Phase 2 Gate (Year 1 End):** Release remaining AED 10.0M upon validating AED 7.5M labor savings.

## Slide 10: Q&A & Demonstration Transition
- Summary of key deliverables (Live App, Financial Engine, Unit Tests, CSV Export).
- Inviting questions from the Investment Committee.
