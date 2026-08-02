# Data Collection Policy — No Web Scraping

## Position

CapExIQ performs **no web scraping, no crawling, and no automated retrieval of
third-party web content**. This is enforced structurally, not by convention.

The only host the application contacts is the configured AI model provider,
reached through its documented API under its terms of service. Every other
outbound request is refused before a socket opens.

## Why — the UAE legal position

Automated collection from third-party websites is not a neutral technical
choice in this jurisdiction:

| Instrument | Relevance |
|---|---|
| **Federal Decree-Law No. 34 of 2021** (Cybercrimes) | Criminalises access to an information system without authorisation. A site's Terms of Use and `robots.txt` are the ordinary evidence of what was authorised. Exceeding that is the offence, regardless of whether the data was publicly visible. |
| **Federal Decree-Law No. 45 of 2021** (PDPL) | Restricts processing personal data without a lawful basis. A scraper cannot establish consent or legitimate interest for data subjects it has never contacted. |
| **Federal Decree-Law No. 38 of 2021** (Copyright) | Protects compilations and databases. Bulk extraction of a structured dataset can infringe even where individual facts are not protectable. |

Site terms bind independently of statute. Several sources this project cites —
including `centralbank.ae` and `dewa.gov.ae` — publish terms restricting
automated access. **They are cited, never fetched.**

This document is a summary written for a student project, not legal advice.

## How the policy is enforced

**1. Egress allowlist — `src/lib/guardrails/egress.ts`**

`guardedFetch()` is the only sanctioned outbound call. It validates against an
allowlist containing exactly one entry (the configured model provider), rejects
plaintext HTTP, and fails closed on anything unrecognised.

**2. Build-breaking tests — `tests/guardrails.test.ts`**

The suite walks the entire `src/` tree and fails if:
- any file imports `puppeteer`, `playwright`, `cheerio`, `jsdom`, `axios`, `got`, `node-fetch` or `request`;
- any file contains a hard-coded `fetch('https://…')` to a literal external host.

Reintroducing a scraper breaks the build. That is the point.

**3. Assistant refusal — `src/lib/guardrails/aiGuardrails.ts`**

Asking the AI assistant to fetch, scrape or crawl external content produces an
explicit refusal that explains the policy, rather than a silent failure or a
hallucinated figure. The system prompt separately forbids presenting a
remembered value as a current market rate.

## How external figures actually enter the model

1. A human reads the value from the published source.
2. It is entered in the **Assumptions Register** with its `source`,
   `dataClassification` and `lastUpdated` fields populated.
3. The audit log records the change.
4. The RAG assistant can then cite it, with provenance, when asked.

This is slower than scraping and that is acceptable — an auditable figure with
a named source is worth more to a capital committee than a fast one without.

## Macro indicators: what changed

`/api/ai/live-macro` previously prompted the language model as a *"Real-Time
Macroeconomic Data Ingestion Agent"* and published the result under a **"Live
GCC Macro"** banner. Nothing was ever fetched — the model has no data feed, so
every EIBOR rate, DEWA tariff and lease price on that ticker was **invented**
and shown to a capital committee as a market observation.

That is a worse integrity failure than scraping would have been. The generation
step has been removed. The route now serves fixed reference values transcribed
by hand from named sources, each carrying `source` and `asOf`, with
`isLive: false`. The ticker is labelled **"GCC Macro Reference · as of …"**.

Making these genuinely live would require a **licensed market-data API** added
deliberately to the egress allowlist. Scraping the primary sites is not an
available option.

## Adding a legitimate data source

1. Obtain a licence or documented API access permitting programmatic use.
2. Add the host to `allowedHosts()` in `egress.ts` with the reason it is permitted.
3. Route the call through `guardedFetch()`.
4. Record the licence basis in `docs/DATA_SOURCES.md`.
5. Confirm no personal data is ingested, or establish a PDPL lawful basis first.
