# CapExIQ — Deployment Guide

## 1. Prerequisites

- Node.js 20
- pnpm 9

These are the versions CI uses (`.github/workflows/ci.yml`).

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill it in.

| Variable | Required | Purpose |
| :--- | :---: | :--- |
| `OPENAI_API_KEY` | No | Enables the AI advisory routes. Without it the application still runs and falls back to a deterministic narrative. **Never prefix this with `NEXT_PUBLIC_`.** |
| `OPENAI_MODEL` | No | Chat model for the advisory routes. Defaults to `gpt-4o`. |
| `NEXT_PUBLIC_APP_URL` | No | Public base URL. |

## 3. Build and Launch — Correct Order

The build must come **before** the browser tests. `pnpm start` serves the output of `pnpm build`, so
running end-to-end tests against a production server without building first will either fail or, worse,
silently test a stale build.

```bash
# 1. Install dependencies
pnpm install --frozen-lockfile

# 2. Static quality gates (no server needed)
pnpm typecheck
pnpm lint
pnpm test

# 3. Compile the production bundle
pnpm build

# 4. Launch the production server
pnpm start          # serves http://localhost:3000

# 5. With that server running, verify in the browser (separate terminal)
pnpm test:e2e
```

Earlier versions of this guide put `pnpm test:e2e` at step 2, before `pnpm build`. That ordering is
wrong for a deployment check.

**Why step 5 must follow step 4.** `playwright.config.ts` sets `webServer.command: 'pnpm dev'` with
`reuseExistingServer: true`. Run on its own, the E2E suite therefore spins up a **development** server
and tests that instead of the artefact you are about to deploy. Because `reuseExistingServer` is
`true`, starting the production server first means Playwright reuses it and tests the real build.
Confirm what is listening on port 3000 before trusting a green run.

## 4. Deploying to a Platform

The application is a standard Next.js 14 App Router project with no database and no server-side
persistence, so any Node-capable host works.

- **Build command:** `pnpm build`
- **Start command:** `pnpm start`
- **Node version:** 20
- **Environment:** set `OPENAI_API_KEY` as a server-side secret. It must not be exposed to the client.

Security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`) are applied to all routes by `next.config.mjs`.

## 5. Continuous Integration

`.github/workflows/ci.yml` runs on every push and pull request to `main`: install with
`--frozen-lockfile`, then `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. The E2E suite is
not part of CI and must be run locally.

## 6. Post-Deployment Verification

1. `/dashboard` shows an NPV of **AED 12,083,628** and a decision status of **Approve**.
2. `/financial-model` Year 6 free cash flow is **AED 13,186,330**.
3. `/scenarios` shows the pessimistic case at **−AED 4,940,625** with a decision of **Reject**.
4. `/monte-carlo` reproduces the same result on every reload at seed 12345.
5. `/ai-assistant` returns either an AI answer or the labelled deterministic fallback — never a blank
   panel.
