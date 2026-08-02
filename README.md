# CapExIQ

**An AI-Enabled Capital-Budgeting and Investment Decision Platform**

Postgraduate Corporate Finance · **Topic 9 — AI Capital-Budgeting Dashboard**

> Flagship case: **NovaRetail GCC** — an Automated Micro-Fulfilment Centre in Dubai.
> AED 24.0M outlay over a six-year horizon at an 11.50% WACC.
> Engine verdict: **Approve**, conditional on measured Year-1 savings.

---

## Group

| Member |
|---|
| Krishna Mathur |
| Neel Kapadia |
| Yash Petkar |
| Atharva Soundankar |
| Tanishk Verma |
| Nihal Pusthe |
| Karan Baid |

---

## What this is

A decision-support platform for evaluating capital investments. It is built on one
principle: **the arithmetic is deterministic and the AI never touches it.**

Every financial figure is produced by a strictly-typed TypeScript engine covering NPV,
IRR (Newton–Raphson with bisection fallback), MIRR, profitability index, and simple and
discounted payback. Artificial intelligence explains, challenges, retrieves and drafts —
it is architecturally prevented from computing a number that reaches a decision. Remove
the API key entirely and the financial results are byte-identical.

## Baseline result

| Metric | Result | Benchmark | Verdict |
|---|---:|---:|---|
| Net present value @ 11.50% | AED 12,083,628 | > 0 | Creates value |
| Internal rate of return | 26.30% | 11.50% | Pass (+14.80 pp) |
| Modified IRR | 19.34% | 11.50% | Pass (+7.84 pp) |
| Profitability index | 1.5035x | 1.00x | Pass |
| Payback | 3.10 years | 4.00 years | Pass |
| Discounted payback | 3.98 years | 4.50 years | Pass |

These figures are pinned by `tests/golden.test.ts`. If that suite fails, the model has
drifted and every published document is stale — treat it as a build break, not a warning.

**The hurdle rate is derived, not assumed.** Cost of equity = 4.20% risk-free +
(1.15 × 6.00% ERP) + 0.75% UAE country risk + 3.50% project execution = 15.35%. Cost of
debt = 3.79% EIBOR + 2.50% spread = 6.29% pre-tax, 5.72% after tax. At 60/40 equity–debt:
(0.60 × 15.35%) + (0.40 × 5.72%) = **11.50%**.

---

## Capabilities

### Eight investment archetypes

The brief names eight kinds of capital decision. CapExIQ evaluates all of them on one
audited engine — an archetype config produces an annual benefit profile, and the same
tested mathematics evaluates it. The core engine is never forked.

| Archetype | Outlay | NPV | IRR | Verdict |
|---|---:|---:|---:|---|
| Installing automation technology *(flagship)* | AED 24.0M | +12.08M | 26.3% | Approve |
| Expanding a production facility | AED 26.7M | +7.28M | 16.4% | Phased |
| Purchasing new machinery | AED 5.21M | +1.57M | 18.9% | Approve |
| Building an AI platform | AED 7.80M | (0.01M) | 16.0% | Delay |
| Opening a new branch | AED 6.80M | (0.10M) | 12.1% | Delay |
| Introducing a new product | AED 6.30M | (0.55M) | 10.4% | Delay |
| Launching an online service | AED 6.90M | (1.49M) | 14.0% | Reject |
| Entering a new market | AED 10.9M | (2.21M) | 10.7% | Reject |

Five of eight defaults fail deliberately. A template pack where every archetype is
comfortably profitable would demonstrate optimistic defaults, not a working engine.

### Role-based access control

Authority comes from a signed `httpOnly` session cookie, verified in Edge middleware
**before the requested page renders**. Six executive roles map to twenty named
permissions; modules outside a role are unreachable by URL, not merely hidden from
navigation. Unknown routes fail closed to "signed-in users only".

Passwords are PBKDF2-SHA256 (210k iterations). Sessions are HMAC-SHA256 over a compact
payload, built on Web Crypto so the same verify path runs at the edge. The app refuses to
sign sessions in production without `AUTH_SECRET`.

Demo accounts and the full permission matrix: [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).

### Retrieval-grounded AI assistant

The assistant retrieves the project documentation bearing on a question before answering,
so every claim carries a numbered citation you can expand to its source extract.

- **Corpus** — 90 passages built from the methodology, assumption register, scenario
  definitions and deliverables (`pnpm build:kb`)
- **Retrieval** — BM25 with domain synonym expansion ∪ dense vectors, fused by
  Reciprocal Rank Fusion. RRF rather than a weighted blend because the two score scales
  are incomparable and normalising them needs per-corpus tuning that rots silently
- **Streaming** — SSE, first token in ~0.6s
- **Degradation** — falls back to lexical-only retrieval if embeddings are unreachable

### Guardrails

- **No scraping, structurally.** All outbound requests pass a single chokepoint with an
  allowlist containing only the configured model provider, failing closed.
  `tests/guardrails.test.ts` walks `src/` and fails the build if a scraping library or a
  literal external fetch is reintroduced. Legal basis:
  [`docs/DATA_COLLECTION_POLICY.md`](docs/DATA_COLLECTION_POLICY.md)
- **Input screening.** Instruction-override detection, scraping-request refusal, and PII
  redaction (email, UAE mobile, Emirates ID, IBAN, card numbers) before any text reaches
  the provider
- **Security headers.** Full CSP, `frame-ancestors 'none'`, Permissions-Policy, and
  `no-store` on every `/api/*` response

### Eleven AI route handlers

`explain` · `recommend` · `threat-radar` · `board-debate` · `board-memo` ·
`scenario-studio` · `esg-impact` · `parse-quote` · `live-macro` · `voice-intent` ·
`rfp-negotiator`

Every route returns `200 OK` with a deterministic fallback when no API key is configured,
so the platform is fully functional offline.

> **A note on `live-macro`.** An earlier build prompted the model to act as a "real-time
> macroeconomic data ingestion agent" and published the result as observed market data.
> Nothing was ever fetched — every rate, tariff and lease price shown had been generated.
> The generation step was removed. The route now serves hand-transcribed values with
> per-figure source and `asOf`, and reports `isLive: false`. It is documented here because
> it is the clearest illustration of this project's central ethical risk: not that a model
> states something false, but that a well-designed interface can make a generated figure
> look exactly like a measured one.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local     # optional — the app runs fully without an API key
pnpm dev                       # http://localhost:3000
```

Sign in with any demo account, e.g. `cfo@novaretail.example` / `cfo-capex-2026`.
The login page lists all six.

```bash
# Production build. NODE_ENV becomes production, so AUTH_SECRET is required
# even locally; without it the sign-in endpoint returns 503.
echo "AUTH_SECRET=\"$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64url"))')\"" >> .env.local
pnpm build && pnpm start
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | **yes, for `pnpm start`** | Session signing key (≥16 chars). Required whenever `NODE_ENV=production`, which includes running the production build locally. Sign-in returns 503 without it. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `OPENAI_API_KEY` | no | Enables live model responses; without it every route serves its deterministic fallback |
| `OPENAI_BASE_URL` | no | For OpenAI-compatible providers |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o` |
| `OPENAI_EMBEDDING_MODEL` | no | Dense retrieval stage; lexical-only without it |
| `CAPEXIQ_USERS` | no | Replaces the seeded directory wholesale — required for any real deployment |

---

## Quality gates

```bash
pnpm typecheck     # tsc --noEmit, strict
pnpm test          # Vitest — 18 suites
pnpm test:e2e      # Playwright
pnpm build
```

`tests/golden.test.ts` is the gate that matters. It pins the exact base-case figures
above, so a silent change to the engine fails the build rather than quietly invalidating
the report and the deck. `tests/auth.test.ts` additionally fails if any navigable route
is missing a permission mapping, keeping the nav taxonomy and the middleware table from
drifting apart.

## Tech stack

Next.js 14.2.24 (App Router) · TypeScript 5.6 strict · Tailwind CSS · Zustand (persisted,
versioned, with migration) · Recharts · Framer Motion · Vitest · Playwright · Web Worker
for Monte Carlo

---

## Submissions

Course deliverables live in [`submissions/`](submissions/):

| File | Requirement |
|---|---|
| `CapExIQ_Individual_Report.docx` | Submission A — individual report, 1,645 words, all ten required sections |
| `CapExIQ_Executive_Presentation.pptx` | Submission C — 14 slides, ~10 minutes, speaker notes throughout |
| `README.md` | Requirement-to-artefact mapping for all five main questions |

Submission B is this application.

## Documentation

| Document | Covers |
|---|---|
| [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md) | Roles, permissions, session design, demo accounts |
| [`docs/DATA_COLLECTION_POLICY.md`](docs/DATA_COLLECTION_POLICY.md) | Why the platform does not scrape, and the legal basis |
| [`docs/FINANCIAL_METHODOLOGY.md`](docs/FINANCIAL_METHODOLOGY.md) | Formulas, WACC derivation, engine design |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Every input, classified by provenance |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | External data and its citations |
| [`docs/MODEL_LIMITATIONS.md`](docs/MODEL_LIMITATIONS.md) | What this model does not do |
| [`docs/AI_GOVERNANCE.md`](docs/AI_GOVERNANCE.md) | The boundary between engine and model |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module layout and data flow |
| [`docs/TESTING.md`](docs/TESTING.md) | Suite structure and the golden-value gate |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Headers, egress policy, input handling |
| [`docs/FRONTEND_DESIGN_SYSTEM.md`](docs/FRONTEND_DESIGN_SYSTEM.md) | The Midnight Vault design system |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Walkthrough of every module |

---

## Academic integrity

**NovaRetail GCC is hypothetical**, which the brief expressly permits, and is labelled as
such throughout. External reference data — UAE corporate tax, DEWA tariffs, EIBOR — is
transcribed by hand from published sources and cited. Operational benchmarking uses the
DataCo Smart Supply Chain dataset (Mendeley Data `8gx2fvg2k6`, CC BY 4.0), which is
genuine and never presented as NovaRetail's own financial statements.

Final responsibility for the investment decision rests with the Chief Financial Officer
and the Capital Expenditure Committee — not with the AI system.

## Licence

MIT. See [`LICENSE`](LICENSE).
