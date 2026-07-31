# CapExIQ — AI Governance & Ethical Framework

## 1. Zero Key Exposure & Server Boundary
- All OpenAI API calls are routed strictly through Next.js Route Handlers (`/api/ai/explain` and `/api/ai/recommend`).
- No client-side `NEXT_PUBLIC_OPENAI_API_KEY` is ever exposed.

## 2. Privacy & PII Defense
- Zero personal customer data (PII) is transmitted to external AI endpoints.
- Prompts transmit only validated, aggregated JSON financial outputs (e.g. NPV, IRR, scenario type).

## 3. Advisory Isolation
- AI outputs are clearly labelled as **"AI Advisory Explanation — Human Approval Required"**.
- Financial calculations are 100% deterministic and cannot be overridden by AI outputs.
