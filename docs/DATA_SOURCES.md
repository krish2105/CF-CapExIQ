# CapExIQ — Data Sources and Provenance

## 1. Files Actually Shipped in `public/data/`

Verified by `ls public/data/`. These eleven files are the complete dataset pack; no other data files
are loaded by the application.

| # | File | What it contains | Classification | Feeds the financial model? |
| :---: | :--- | :--- | :--- | :--- |
| 01 | `01_dataco_operational_sample_20.csv` | 20 de-identified rows from the DataCo Smart Supply Chain dataset (order, shipping, profit and delivery-status fields) | Real external dataset | **No** — operational benchmark only |
| 02 | `02_monthly_operational_summary_sample.csv` | Monthly aggregation derived from file 01 (order lines, sales, profit, shipping days, late-delivery rate) | Derived from real external data | **No** — operational benchmark only |
| 03 | `03_capexiq_project_assumptions.csv` | The NovaRetail GCC assumptions register (capex, benefits, opex, WACC, tax, salvage) with classification and source columns | Hypothetical academic assumptions | **Yes** — mirrors `ASSUMPTIONS.md` |
| 04 | `04_scenario_definitions.csv` | Optimistic / base / pessimistic investment, benefit and cost multipliers and discount rates | Hypothetical academic assumptions | **Yes** |
| 05 | `05_dewa_electricity_tariffs_july_2026.csv` | DEWA slab tariffs and fuel surcharge, effective July 2026 | Current official external | Indirectly — informs the OpEx power assumption via `/electricity-estimator` |
| 06 | `06_uae_corporate_tax_rates.csv` | UAE corporate tax bands | Current official external | **Yes** — the 9% rate |
| 07 | `07_cbuae_eibor_download_catalog.csv` | A **catalogue of CBUAE EIBOR download locations** (coverage period, publication date, URL) | Current official external (catalogue) | Indirectly — points to the cost-of-debt source |
| 08 | `08_data_dictionary.csv` | Field-level definitions across the pack (`file_name`, `field_name`, `definition`, unit, source class) | Documentation | No |
| 09 | `09_data_source_register.csv` | Source, purpose, classification, licence/status, URL and usage note for each dataset | Documentation | No |
| 10 | `10_finance_formula_catalog.csv` | Reference catalogue of the corporate finance formulas (metric, formula, interpretation) | Documentation | No |
| — | `README.txt` | Pack contents and the use rules reproduced below | Documentation | No |

## 2. Provenance — Stated Honestly

**DataCo Smart Supply Chain (files 01 and 02) — genuine, but not a financial input.**
Source: Mendeley Data, dataset `8gx2fvg2k6` (<https://data.mendeley.com/datasets/8gx2fvg2k6/5>),
licensed **CC BY 4.0**. The pack contains a de-identified 20-row sample of the full 91.5 MB dataset.
This is **US-market operational data** (orders in USD, US regions and states). It is used purely as an
operational delivery/late-shipment benchmark in `/operational-analytics`. It does **not** feed the
NPV, IRR, MIRR, PI or payback calculations, and its monetary amounts must never be presented as AED
values or as NovaRetail financial statements.

**DEWA electricity tariffs (file 05) — real and current.**
Source: DEWA slab tariff page (<https://www.dewa.gov.ae/en/consumer/billing/slab-tariff>), effective
July 2026. Slabs of **23 / 28 / 32 / 38 fils per kWh**, a **6 fils per kWh fuel surcharge**, and
**5% VAT**. Both the Residential/Commercial and Industrial slab structures are included.

**UAE corporate tax (file 06) — real and current.**
Federal Decree-Law No. 47 of 2022, per the UAE Ministry of Finance: **0% on taxable income up to and
including AED 375,000, and 9% above that threshold**. The model applies a flat 9% marginal rate and
does **not** model the zero-rate band — see `MODEL_LIMITATIONS.md`.

**CBUAE EIBOR (file 07) — a source catalogue, not rate data.**
The file lists official CBUAE download locations for EIBOR history. It contains **no rate
observations whatsoever**. The cost-of-debt input used in the model is the **live 3-month EIBOR of
3.79%**, to which a 2.50% credit spread is added. The 4.85% figure quoted in earlier versions of this
repository was stale and has been removed.

**Capital expenditure figures — illustrative, not sourced.**
The AED 18.0M / 2.5M / 1.2M / 0.3M CapEx lines are **illustrative academic estimates**. There are no
vendor quotations in this repository and none are cited. `09_data_source_register.csv` records the
instruction to replace them with supplier quotations before any real-world use. Any earlier claim
that supplier quotations (Dematic, Swisslog, Knapp, AutoStore or others) were sourced was incorrect
and has been removed.

## 3. Data Governance and Use Rules

Reproduced from `public/data/README.txt`:

- Do not claim the DataCo monetary amounts are UAE/AED values.
- Do not claim NovaRetail assumptions are real historical company data.
- Use deterministic code for NPV/IRR; use AI only to explain validated outputs.
- Replace major project assumptions with vendor quotations where possible.
- Download the full DataCo file from the official Mendeley page listed in the source register.

**NovaRetail GCC** is a hypothetical UAE omnichannel retail entity created for this assignment.

**CSV formula-injection defence:** leading `=`, `+`, `-`, `@`, tab and carriage-return characters are
escaped with a leading apostrophe **on CSV import**. See `SECURITY.md` for the precise scope, which
does not currently extend to the export path.
