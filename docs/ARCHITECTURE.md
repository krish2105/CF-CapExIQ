# CapExIQ — Technical System Architecture

## Architecture Overview
CapExIQ is built on **Next.js 14 App Router** using React 18, TypeScript (Strict), Tailwind CSS, Zustand state management, and Recharts visualization.

```
src/
├── app/                      # Next.js App Router Page Routes (29 pages/APIs)
│   ├── approvals/            # Approval Workflow & Immutable Snapshot
│   ├── assumptions/          # Assumptions Register & Change History
│   ├── benefits-tracker/     # Benefits Realisation & PIR
│   ├── capacity-model/       # COO Throughput & Robotics Capacity
│   ├── csv-management/       # CSV Upload, Parse & Audit
│   ├── dashboard/            # Executive Financial Dashboard
│   ├── data-sources/         # Data Dictionary & Methodology
│   ├── electricity-estimator/# DEWA Commercial Tariff Estimator
│   ├── external-data/        # UAE Tax & WACC CAPM Debt Calculator
│   ├── financial-model/      # Year-by-Year Free Cash Flow Schedule
│   ├── funding/              # Debt/Equity Mix & DSCR Calculation
│   ├── implementation-plan/  # Timeline & Stage Gate Governance
│   ├── monte-carlo/          # 5,000-Iteration Mulberry32 Seeded Simulation
│   ├── operational-analytics/# Operational Delivery Benchmarks
│   ├── portfolio/            # Capital Portfolio Optimizer (Knapsack PI)
│   ├── presentation/         # Distraction-Free Boardroom Presentation
│   ├── printable-report/     # Executive Board Memorandum & PDF Export
│   ├── real-options/         # Phased Staging & Decision Trees
│   ├── scenarios/            # Base / Optimistic / Pessimistic Engine
│   ├── sensitivity/          # 2D Heatmap & Tornado Sensitivity
│   ├── settings/             # Model Thresholds & Settings
│   ├── strategic-scorecard/  # 10-Dimension Strategic Radar
│   └── vendor-analysis/      # Supplier TCO & Lifecycle Matrix
├── components/               # UI & Governance Components
├── lib/
│   ├── data/                 # Integrated CSV Data Loaders
│   ├── finance/              # 100% Deterministic Financial Calculation Engines
│   ├── store/                # Zustand LocalStorage Persisted State
│   └── types/                # TypeScript Domain Types
```
