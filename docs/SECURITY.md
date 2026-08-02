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
