# CapExIQ — User and Executive Operating Guide

## Getting Started

`pnpm install`, then `pnpm dev`, then open `http://localhost:3000`. The application opens on the
project overview; `/dashboard` is the main working view.

State is held in your browser's `localStorage`. Assumption edits, the selected scenario, saved project
profiles and the chat history persist across reloads on the same browser. `Reset model assumptions to
defaults` in the header restores the shipped base case.

## The Header Controls

| Control | What it does |
| :--- | :--- |
| **Scenario selector** | Switches the active scenario between Base, Optimistic, Pessimistic and Custom. **This changes every number on every page.** |
| **Executive role selector** | Sets the acting role (CEO / CFO / COO / CTO / Capital Committee / Analyst). See the note below on what it actually affects. |
| **Project profile menu** | Save, load and duplicate whole assumption sets as named investment proposals. |
| **Reset assumptions** | Restores `DEFAULT_FINANCIAL_ASSUMPTIONS`. |
| **Theme toggle** | Light / dark / system. |

### What the role selector actually does

Selecting a role does **not** re-lay out the dashboard or hide pages. Every user sees every page and
every metric. The role setting is used in four specific places:

1. It sets the persona passed to the AI assistant, so answers are pitched at that audience.
2. It attributes entries in the assumptions audit trail.
3. It stamps the signer on the immutable decision snapshot in `/approvals`.
4. It labels the header in `/presentation` and the board memorandum.

The role framings below are therefore a **reading guide** — which pages matter most to whom — not a
description of six different interfaces.

| Role | Pages to focus on |
| :--- | :--- |
| **CEO** | `/dashboard`, `/strategic-scorecard`, `/printable-report` — value created, strategic fit, principal risks, board memorandum |
| **CFO** | `/financial-model`, `/scenarios`, `/sensitivity`, `/funding`, `/external-data` — NPV, IRR, MIRR, PI, payback, WACC, capital rationing |
| **COO** | `/capacity-model`, `/operational-analytics`, `/electricity-estimator` — throughput, labour productivity, utilisation, power cost |
| **CTO** | `/vendor-analysis`, `/implementation-plan`, `/csv-management` — architecture, integration dependencies, delivery sequencing |
| **Capital Committee** | `/approvals`, `/portfolio`, `/real-options` — the decision pack, capital rationing, staging options |
| **Analyst** | `/assumptions`, `/financial-model`, `/monte-carlo`, `/data-sources` — the register, the schedule, distributions and data lineage |

## A Typical Working Session

1. **`/assumptions`** — review the register. Every input is classified by provenance and the source is
   stated. Edit anything that needs changing; the audit trail records it.
2. **`/financial-model`** — read the year-by-year schedule that those assumptions produce. Export it as
   CSV if you need it outside the app.
3. **`/dashboard`** — the six KPI cards, the cash-flow charts, the scenario comparison, the rule-based
   risk alerts and the AI advisory panel.
4. **`/scenarios`** — compare optimistic, base and pessimistic side by side, and adjust the probability
   weights behind the expected-NPV banner.
5. **`/sensitivity`** — the tornado chart tells you which driver matters most; the heatmaps show where
   the NPV = 0 frontier sits.
6. **`/monte-carlo`** — turn the point estimate into a probability distribution. The seed is fixed, so
   results reproduce exactly; press *Reseed PRNG* to draw a different sample path.
7. **`/ai-assistant`** — ask questions in plain language. Answers are advisory only.
8. **`/approvals`** — sign and lock a decision snapshot when you are ready.
9. **`/printable-report`** or **`/presentation`** — produce the board output.

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Open the command palette to jump to any page |
| `Escape` | Close the command palette |
| `Tab` / `Shift + Tab` | Move between controls |

## Things Worth Knowing

- **AI never computes.** Every financial figure comes from deterministic TypeScript. AI explains
  results that already exist; it cannot change one. See `AI_GOVERNANCE.md`.
- **Without an `OPENAI_API_KEY` the app still works.** The AI panels fall back to a deterministic
  narrative whose wording follows the actual numbers.
- **The pessimistic scenario returns Reject.** That is the correct output, not a bug: NPV
  −AED 4,940,625 at a 14.5% hurdle rate.
- **Read `MODEL_LIMITATIONS.md` before quoting a number externally.** In particular, the model applies
  a flat 9% tax rate and does not model the AED 375,000 zero-rate band or loss carry-forward.
