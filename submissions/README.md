# Submissions — CF Topic 9

Everything the course requires, in two files.

| Deliverable | File | Specification | Status |
| :--- | :--- | :--- | :--- |
| **A. Individual report** | `CapExIQ_Individual_Report.docx` | 1,300–1,650 words, 10 sections | 1,445 words · all 10 sections · all 5 main questions answered under explicit headings |
| **C. Presentation** | `CapExIQ_Executive_Presentation.pptx` | 8–15 slides, 7–10 minutes, speaker notes | 14 slides · ~9.5 minutes · speaker notes on every slide |
| **B. Dashboard / app** | the repository itself | working application | `pnpm dev` — 26 page routes, 10 AI routes, 8 archetypes |

## Where the brief's requirements are met

| Requirement | Report | Deck |
| :--- | :--- | :--- |
| Q1 — what decision, why it matters | §2 | Slide 2 |
| Q2 — concepts, formulas, data, assumptions | §3, §4 | Slides 3, 4 |
| Q3 — the three scenarios | §8 | Slide 7 |
| Q4 — how AI improves the analysis | §6 | Slides 11, 12 |
| Q5 — recommendation and risks | §10 | Slide 14 |
| ≥5 AI features, each with 5 explained elements | §6 — **10 features**, five-column table | Slides 11–12 |
| Six dashboard components | §7 | Slides 5–9 |
| Five-way data classification | §4 | Slide 4 |
| Scenario + sensitivity, greatest driver, decision-flip conditions | §8 | Slides 7, 8 |
| Ethical use of AI — all seven points | §9 | Slide 13 |
| Final recommendation | §10 | Slide 14 |

## Figure control

Every number in both files is a deterministic output of the finance engine, pinned by
`tests/golden.test.ts` and reconciled against `NovaRetail_MFC_Financial_Model_Base.csv`.

Base case: **NPV AED 12,083,628 · IRR 26.30% · MIRR 19.34% · PI 1.5035 · payback 3.10 yrs ·
discounted payback 3.98 yrs · decision Approve.** If a figure here disagrees with the running
application, the application is right and these documents are stale — run `pnpm test` to confirm.

## Regenerating

```bash
pnpm test        # golden suite — the gate. If this fails, do not submit.
pnpm typecheck
pnpm build
```
