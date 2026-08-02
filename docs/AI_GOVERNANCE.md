# CapExIQ — AI Governance and Ethical Framework

## 1. Scope

Three features in this application call a large language model: the finance assistant
(`/ai-assistant`), the metric explainer (`/api/ai/explain`) and the board recommendation panel
(`/api/ai/recommend`). Nothing else does. The Monte Carlo engine, the sensitivity engine, the risk
alert engine and the portfolio optimiser are deterministic code, not AI, and are not covered by this
document except where noted.

## 2. Zero Key Exposure and the Server Boundary

- All OpenAI calls are routed through Next.js Route Handlers (`/api/ai/explain`, `/api/ai/recommend`),
  which execute server-side only.
- `OPENAI_API_KEY` is read from the server environment. There is no `NEXT_PUBLIC_` variant and the key
  never reaches the client bundle.
- If the key is absent or the call fails, the application degrades to a deterministic narrative rather
  than failing silently or fabricating a response.

## 3. Confidentiality and PII

- No personal customer data is transmitted to any AI endpoint.
- Prompts carry only validated, aggregated model output: NPV, IRR, MIRR, PI, payback, the active
  scenario, and the assumption set. These are hypothetical academic figures for a hypothetical entity.
- The DataCo operational sample shipped with the repository is de-identified at source and is not sent
  to any AI endpoint.

## 4. Accuracy — AI Never Computes

Every financial number in this application is produced by deterministic TypeScript in
`src/lib/finance/`. The language model receives numbers that have **already been computed** and can
only describe them. It cannot write to the model store, cannot alter an assumption and cannot change a
displayed figure. The engine's outputs are pinned by `tests/golden.test.ts`, so a drift in the numbers
fails the build.

## 5. Incorrect Input Data

AI cannot detect a wrong assumption. The controls against bad input are:

- The assumptions register (`/assumptions`, `ASSUMPTIONS.md`) classifies every input by provenance, so
  a forecast is never mistaken for an observed fact.
- `ModelHealthPanel` flags internally inconsistent or implausible assumption combinations.
- The `RISK-UNREALISTIC-ASSUMPTION` rule in the risk engine raises an alert on out-of-range inputs.
- `MODEL_LIMITATIONS.md` states what the model does not do, including the flat 9% tax treatment and the
  absence of loss carry-forward.
- Uploaded CSVs pass through schema validation and a data-quality check before use.

## 6. Hallucination Control

- The recommendation endpoint validates the model's JSON against a Zod schema before anything is
  rendered. Output that does not conform is rejected, not displayed.
- Both the assistant and the recommendation panel have a **deterministic fallback narrative** whose
  wording is conditional on the actual numbers, so a negative NPV or a sub-hurdle IRR can never be
  narrated as a success.
- On an advisory-service error the interface shows an explicit error message and shows **no** narrative
  at all, rather than substituting a plausible-sounding one.
- Residual risk, stated plainly: a language model can still produce fluent, confident and wrong
  reasoning from correct inputs. AI narrative in this application is a drafting aid, not a source of
  truth.

## 7. Bias

- **Model bias.** The underlying model is trained predominantly on Western, English-language corporate
  finance material. Its framing of a UAE capital project may not reflect local market convention.
- **Prompt bias.** The system prompts cast the model as a CFO adviser for the sponsoring entity, which
  predisposes it towards the sponsor's framing. Downside evidence is supplied explicitly (the
  pessimistic scenario is passed into the recommendation prompt) to counter this.
- **Assumption anchoring.** The AI narrates management's own forecasts. If those forecasts are
  optimistic, the narrative inherits the optimism. This is precisely why the pessimistic scenario
  (`Reject`, NPV −AED 4,940,625) is displayed alongside the base case rather than behind it.

## 8. Human Review

- Every AI output carries the label **"AI advisory — human approval required."**
- The dashboard advisory panel repeats in full: *"AI-generated explanations and recommendations are
  advisory. All assumptions, calculations and final investment decisions must be reviewed and approved
  by a qualified human decision-maker."*
- The `/approvals` route captures an immutable, human-signed snapshot of the model at the point of
  decision. No AI output can create, alter or sign an approval.

## 9. Responsibility

Accountability for the investment decision rests with the human decision-makers named in the
assumptions register and the approvals snapshot — the CFO for financial inputs and the hurdle rate, the
COO for operational benefits and costs, and the capital committee for the decision itself. **The AI is
never the decision-maker of record and is never cited as justification for a decision.** If an AI
narrative is included in a board pack, the person presenting it owns it.

## 10. Academic Disclosure

NovaRetail GCC is a hypothetical entity and the project assumptions are academic estimates. This
application is coursework, not investment advice.
