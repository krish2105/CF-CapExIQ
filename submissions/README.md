# Submissions — CF Topic 9

**AI-Enabled Corporate Finance Decision Dashboard**
Topic 9 — AI Capital-Budgeting Dashboard · *installing automation technology*

**Group:** Krishna Mathur · Neel Kapadia · Yash Petkar · Atharva Soundankar ·
Tanishk Verma · Nihal Pusthe · Karan Baid

| Brief requirement | Artefact |
|---|---|
| **A. Individual Report** (1,300–1,650 words) | `CapExIQ_Individual_Report.docx` — 1,645 words |
| **B. Dashboard / App** | The CapExIQ application in this repository |
| **C. Presentation** (8–15 slides, 7–10 min) | `CapExIQ_Executive_Presentation.pptx` — 14 slides, ~10 min, speaker notes on every slide |

---

## The five main questions

| # | Question | Report | Deck |
|---|---|---|---|
| 1 | What financial decision is analysed, and why does it matter? | §2 | Slide 2 |
| 2 | Which concepts, formulas, data and assumptions are required? | §3, §4 | Slides 3–4 |
| 3 | What do the calculations show across the three scenarios? | §8 | Slides 7–8 |
| 4 | How does AI improve the analysis, dashboard and decision-making? | §6 | Slides 11–12 |
| 5 | What recommendation, and what financial and AI risks attach? | §10 | Slide 14 |

## Required report sections (brief §10)

All ten present: Executive summary · Financial problem · Relevant corporate finance
concepts · Data and assumptions · Financial calculations · AI features · Dashboard
explanation · Scenario and sensitivity analysis · AI limitations and ethical risks ·
Final recommendation.

## AI features (brief §5 — at least five, each with five explained elements)

**Twelve** capabilities are documented in report §6 and deck slides 11–12, each against
all five required elements: what it does · what information it uses · what result it
produces · how it helps the decision-maker · what limitation or risk it carries.

## Dashboard components (brief §5 — at least six)

| # | Component | Route |
|---|---|---|
| 1 | Financial KPI cards (NPV, IRR, MIRR, PI, payback) | `/dashboard` |
| 2 | Cash-flow chart with cumulative payback line | `/dashboard`, `/financial-model` |
| 3 | Optimistic / base / pessimistic scenario comparison | `/scenarios` |
| 4 | Sensitivity analysis — tornado plus two-way heatmaps | `/sensitivity` |
| 5 | Risk and alert panel — eleven severity-ranked rules | `/dashboard` |
| 6 | AI recommendation panel | `/dashboard` |

## Data classification (brief §3 — five ways)

Historical · current external · forecast · user-entered · AI-generated — classified in
report §4 and shown with provenance badges at `/assumptions`.

## Ethical use of AI (brief §8 — seven points)

All seven in report §9 and deck slide 13, plus a documented case found in our own build:
the macro panel once published model-generated rates as observed market data. It now
serves hand-transcribed values with citations, flagged not live.

---

## Figure control

Every figure in both documents is a deterministic engine output pinned by
`tests/golden.test.ts`:

```
NPV 12,083,628 · IRR 26.30% · MIRR 19.34% · PI 1.5035
Payback 3.10 yrs · Discounted payback 3.98 yrs · Decision: Approve
```

If that suite fails, the model has drifted and **both documents must be regenerated**
before submission. Verify with:

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Note on Submission A

The brief requires an individual report **per student**. This document is the group's
shared analysis of the common dashboard; each member should submit under their own name
and is responsible for the wording they submit.
