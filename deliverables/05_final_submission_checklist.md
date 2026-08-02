# CapExIQ: Final Submission Audit Checklist

**Project:** CapExIQ — AI-Enabled Capital-Budgeting Decision Dashboard  
**Company:** NovaRetail GCC (Hypothetical UAE Omnichannel Retailer)  
**Assessment Target:** Postgraduate Corporate Finance Group Project  

---

## 1. Technical & Architectural Requirements

- [x] **Next.js App Router Structure:** Clean App Router setup with `/`, `/dashboard`, `/assumptions`, `/financial-model`, `/scenarios`, `/sensitivity`, `/ai-assistant`.
- [x] **Strict TypeScript:** 100% strict type safety with interfaces in `src/lib/types/finance.ts`.
- [x] **Deterministic Finance Calculations:** All NPV, IRR, MIRR, PI, Payback, and Sensitivity calculations performed in pure TypeScript; zero AI math.
- [x] **Zustand State Store:** Local-storage persistent store (`capexiq-financial-store`) for live assumption editing and custom scenario tuning.
- [x] **Zod Form Validation:** React Hook Form + Zod schema validation with bounds and error feedback.
- [x] **Recharts Visualizations:** Annual FCF bar chart, cumulative line chart, scenario comparison bar chart, and Tornado chart.
- [x] **Server-Side AI Integration:** OpenAI Route Handlers (`/api/ai/explain` and `/api/ai/recommend`) using `OPENAI_API_KEY` and `OPENAI_MODEL` with fallback mode.
- [x] **CSV Data Export:** Functional browser export of 6-year cash flow table.

---

## 2. Financial Controls & Governance Audit

- [x] **Initial Cash Flow Negative:** Time Zero outflow ($FCF_0$) is strictly negative (-24.0M AED).
- [x] **Tax Treatment:** 9% headline UAE corporate tax applied on positive EBIT.
- [x] **Depreciation Tax Shield:** Straight-line depreciation shielding tax without treating depreciation as a cash outflow.
- [x] **Working Capital Recovery:** Initial NWC invested at Year 0 and recovered in full at Year 6.
- [x] **Salvage Value:** Year 6 terminal salvage value of AED 2.0M included in terminal cash flow.
- [x] **Multiple IRR Protection:** Newton-Raphson with bisection fallback and sign-change warning.
- [x] **Hypothetical Disclaimer:** NovaRetail GCC clearly labeled as a hypothetical entity across all views and reports.

---

## 3. Testing & Verification

- [x] **Vitest Unit Tests:** 15 passing tests across 5 test suites (`cashflow`, `metrics`, `scenarios`, `sensitivity`, `risk`).
- [x] **Playwright E2E Tests:** Complete end-to-end test suite (`e2e/app.spec.ts`) validating page navigation, assumption editing, scenario switching, and AI prompts.

---

## 4. Deliverables Package

- [x] **Deliverable 1:** Individual Report Structure (`deliverables/01_individual_report_structure.md`) answering all 5 core questions in 1,520 words.
- [x] **Deliverable 2:** 10-Slide CFO Presentation Deck (`deliverables/02_presentation_deck_structure.md`).
- [x] **Deliverable 3:** 5-Minute Live Demonstration Script (`deliverables/03_live_demonstration_script.md`).
- [x] **Deliverable 4:** Financial Model Reconciliation Guide (`deliverables/04_financial_model_reconciliation.md`).
- [x] **Deliverable 5:** Final Submission Audit Checklist (`deliverables/05_final_submission_checklist.md`).
- [x] **Documentation:** `README.md` and `.env.example`.
