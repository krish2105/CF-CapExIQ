# CapExIQ — Security and Governance Policy

## 1. Client / Server Boundary

External AI credentials (`OPENAI_API_KEY`) are read only inside Next.js Route Handlers
(`/api/ai/explain` and `/api/ai/recommend`), which execute server-side. There is no `NEXT_PUBLIC_`
variant of the key, so it is never included in a client bundle.

## 2. CSV Formula Injection — Exact Scope

`src/lib/csv/sanitizer.ts` escapes a leading `=`, `+`, `-`, `@`, tab or carriage return by prepending a
single quote, and `sanitizeCsvRecord` applies that to every **string** field of a parsed record.

**Where it is applied:** on **import only**. `src/lib/csv/csvParser.ts` maps `sanitizeCsvRecord` over
every parsed row, so any CSV a user uploads through `/csv-management` is sanitised before it reaches
application state.

**Where it is not applied:** the **export path is not sanitised**. The CSV download in
`src/app/financial-model/page.tsx` builds its output by joining header strings with numeric values
formatted through `.toFixed()`; it does not call `sanitizeCsvField` or `sanitizeCsvRecord`. Earlier
versions of this document claimed sanitisation "on both upload import and download exports"; that was
an overclaim and has been corrected.

**Practical risk assessment.** The exported schedule contains only fixed header labels and engine-
generated numbers, and no user-supplied free text is written into it today, so there is no known
injection path through the current export. That is a property of the data, not a control: if a
user-editable string (a project name, a scenario label, an assumption note) is ever added to an
exported CSV, `sanitizeCsvField` must be applied on the way out.

Two further notes on the sanitiser itself:

- `sanitizeCsvRecord` sanitises string fields only; non-string values pass through unchanged.
- The sanitiser escapes but does not quote. Fields containing commas or newlines are not CSV-quoted by
  the export path either, so a value containing a comma would break column alignment in the download.

## 3. Data Privacy and PII

- No personal customer data is processed by the financial engine or transmitted to any AI model.
- AI prompts carry only aggregated, validated model output (NPV, IRR, scenario type, assumptions).
- The DataCo operational sample in `public/data/` is de-identified at source.

## 4. State and Persistence

Application state is held in Zustand and persisted to browser `localStorage`. There is no server-side
database and no user account system, so there is no authentication, authorisation or multi-tenant
isolation. Anything saved is visible to anyone with access to that browser profile. This is acceptable
for an academic demonstrator and would not be acceptable for real capital-project data.

## 5. Dependency and Build Integrity

CI (`.github/workflows/ci.yml`) installs with `--frozen-lockfile` and runs typecheck, lint, unit tests
and a production build on every push and pull request to `main`. Automated dependency vulnerability
scanning is **not** configured.

---

## Deployment boundaries (added with the P0 hardening pass)

Three controls are correct on a single long-lived instance and **ineffective on
serverless or multi-instance hosting**. Each is written against an interface so
the swap is small, and each is listed here rather than discovered in production.

| Control | Default | Required before autoscaling |
|---|---|---|
| Rate limiting | Per-process `Map` | `setRateLimitBackend({ hit })` backed by Redis or Upstash |
| Session revocation | Per-process `Map` | `setRevocationStore({ revoke, isRevoked })` backed by Redis or a table |
| AI usage metering | None | Required before any free tier is offered |

Why it matters: with the in-memory backends, every instance keeps its own
counters and every cold start forgets them, so the effective limit becomes
*(instances × configured limit)* rather than the configured limit. A revocation
recorded on one instance is invisible to the others, which means a signed-out
token may still be honoured by a sibling process.

`isRateLimitDistributed()` reports whether a shared backend is installed, so a
health check can assert it in production rather than assuming.

## AI cost controls

Every route that calls the model bounds its own cost:

- **`max_tokens`** sized per route, from 300 (voice intent) to 1,500 (board memorandum)
- **`AbortSignal.timeout(30s)`** so a hung provider cannot hold a connection open
- **`guardRequestBody`** caps the payload at 16 KB and screens short string
  fields for instruction-override patterns before anything is forwarded

`tests/aiCostControls.test.ts` walks the route directory rather than listing
routes by name, so a new route shipped without a cap fails the build.

### What the body guard deliberately does not do

Injection screening is applied only to strings under 500 characters, and the
scraping patterns are not applied to request bodies at all. A long field is
pasted source material, and screening it produces false refusals on legitimate
input — a real vendor quotation contains lines such as `System: AutoStore
B-1450` and a supplier URL, each of which a naive screen would reject. Refusing
a genuine quotation to block a hypothetical injection is the wrong trade when
the size cap already bounds the cost and the system prompt already delimits
untrusted text. Free-text questions still pass through `guardInput`, which is
where a "go and fetch this" request actually arrives.

## Session revocation

Sessions carry a `jti`. Signing out records that id on a denylist until the
token would have expired anyway, and the middleware consults it before any page
renders — so clearing the cookie now means the token is dead rather than merely
absent from that browser. Tokens minted before the field existed carry no id and
are treated as live, so deploying this does not sign every active user out; they
age out within the eight-hour TTL.
