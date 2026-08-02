# CapExIQ — Technical System Architecture

## Overview

Next.js 14.2.15 (App Router) with React 18, TypeScript in strict mode, Tailwind CSS 3.4 over a
CSS-variable design system, Zustand for persisted state, and Recharts for visualisation.

## Route Inventory

Verified against `src/app/` and `.next/app-path-routes-manifest.json`.

**24 feature page routes plus the `/` overview page (25 page entries in total), and 2 API route
handlers.** Next.js also emits a framework `/_not-found` route.

### Page routes

| Route | Purpose |
| :--- | :--- |
| `/` | Project overview and entry point |
| `/dashboard` | Executive dashboard: six KPI cards, cash-flow charts, scenario comparison, risk alert panel, AI advisory panel |
| `/financial-model` | Year-by-year free cash flow schedule with CSV export |
| `/scenarios` | Base / optimistic / pessimistic / custom engine and the expected-NPV banner |
| `/sensitivity` | Tornado chart and 2-D NPV heatmaps with the break-even frontier |
| `/monte-carlo` | 5,000-iteration seeded Mulberry32 simulation |
| `/real-options` | Phased staging and decision trees |
| `/portfolio` | Capital portfolio optimiser (0-1 dynamic-programming knapsack) |
| `/funding` | Debt/equity mix and DSCR covenant analysis |
| `/assumptions` | Assumptions register and change history |
| `/benefits-tracker` | Benefits realisation and post-implementation review |
| `/approvals` | Approval workflow and immutable signed snapshot |
| `/implementation-plan` | Timeline and stage-gate governance |
| `/capacity-model` | Throughput, robotics capacity and the bottom-up labour-savings bridge |
| `/operational-analytics` | DataCo operational delivery benchmarks |
| `/vendor-analysis` | Supplier total-cost-of-ownership matrix |
| `/strategic-scorecard` | Multi-dimension strategic radar |
| `/electricity-estimator` | DEWA slab-tariff power cost estimator |
| `/external-data` | UAE tax reference and the WACC / CAPM build-up calculator |
| `/data-sources` | Data dictionary and methodology |
| `/csv-management` | CSV upload, parsing, sanitisation and audit |
| `/ai-assistant` | AI finance assistant with six sample prompts |
| `/printable-report` | Board memorandum, print-optimised |
| `/presentation` | Distraction-free boardroom presentation mode |
| `/settings` | Model thresholds and application settings |

### API routes

| Route | Purpose |
| :--- | :--- |
| `/api/ai/explain` | Server-side LLM metric explainer |
| `/api/ai/recommend` | Server-side LLM board recommendation, Zod-validated, with a deterministic fallback |

## Source Tree

```
src/
├── app/                      # 25 page routes + 2 API route handlers (listed above)
│   ├── api/ai/explain/       # Route handler - OPENAI_API_KEY stays server-side
│   ├── api/ai/recommend/     # Route handler - Zod-validated structured output
│   ├── globals.css           # CSS-variable design system (see FRONTEND_DESIGN_SYSTEM.md)
│   ├── layout.tsx            # Root layout, theme provider, command palette mount
│   └── <feature>/page.tsx    # One directory per feature route
├── components/
│   ├── finance/              # FormulaInspector, ModelHealthPanel
│   ├── layout/               # Header, Sidebar
│   ├── navigation/           # CommandPalette (Cmd/Ctrl + K)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── csv/                  # csvParser, sanitizer, schemas, dataQuality
│   ├── data/                 # datasetLoaders, defaultAssumptions
│   ├── finance/              # Deterministic engine: benefits, capacity, cashflow, funding,
│   │                         # implementation, metrics, monteCarlo, portfolio, realOptions,
│   │                         # risk, scenarios, sensitivity, strategicScorecard, vendors, wacc
│   ├── store/                # Zustand store, persisted to localStorage
│   ├── types/                # TypeScript domain types
│   └── utils/                # Formatting and chart colour helpers
```

## Design Principles

- **Deterministic core.** Every financial figure comes from `src/lib/finance/`. No LLM touches a
  number. See `AI_GOVERNANCE.md`.
- **Server-only secrets.** API credentials exist only inside route handlers. See `SECURITY.md`.
- **Golden-value pinning.** `tests/golden.test.ts` fixes the published outputs so engine drift breaks
  the build rather than silently invalidating the documentation.
