# CapExIQ — Assessment Rubric Mapping Matrix

| Rubric Assessment Requirement | Application Feature / Location | Documentation & Evidence |
| :--- | :--- | :--- |
| **1. Capital Budgeting Decision Framework** | `/dashboard`, `/financial-model`, `/portfolio` | `FINANCIAL_METHODOLOGY.md`, `MODEL_RECONCILIATION.md` |
| **2. Scenario & Risk Analysis** | `/scenarios`, `/sensitivity`, `/monte-carlo` | `tests/monteCarlo.test.ts`, `tests/sensitivity.test.ts` |
| **3. Strategic Alignment & Scorecard** | `/strategic-scorecard` (10-Dimension Radar) | `src/lib/finance/strategicScorecard.ts` |
| **4. Operational Throughput Modelling** | `/capacity-model`, `/operational-analytics` | `src/lib/finance/capacity.ts` |
| **5. Vendor TCO & Procurement Matrix** | `/vendor-analysis` | `src/lib/finance/vendors.ts` |
| **6. Capital Funding & Covenant Analysis** | `/funding` (DSCR Calculation) | `src/lib/finance/funding.ts`, `tests/funding.test.ts` |
| **7. Approval Workflow & Stage Gates** | `/approvals`, `/implementation-plan` | `src/lib/finance/implementation.ts` |
| **8. Benefits Realisation & Audit Trail** | `/benefits-tracker`, `/assumptions` | `ASSUMPTIONS.md`, `SECURITY.md` |
| **9. AI Governance & Data Ethics** | `/ai-assistant`, `/api/ai/explain` | `AI_GOVERNANCE.md`, `SECURITY.md` |
| **10. Executive Presentation & Board Pack** | `/presentation`, `/printable-report` | `DEMO_SCRIPT.md`, `FRONTEND_DESIGN_SYSTEM.md` |
