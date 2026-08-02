# CapExIQ — Data Sources & Methodology Catalog

## 1. Integrated CSV Data Files (`public/data/`)
1. `01_dataco_supply_chain_sample.csv`: Sample operational shipment performance benchmark.
2. `02_dewa_tariff_schedule.csv`: Official Dubai Electricity & Water Authority commercial slab tariffs.
3. `03_uae_corporate_tax_guidelines.csv`: UAE Federal Decree-Law No. 47 of 2022 guidelines (9.0% tax).
4. `04_eibor_historical_rates.csv`: Central Bank of UAE 3-Month EIBOR benchmarks (4.85%).
5. `05_micro_fulfilment_capex_quotes.csv`: Automated warehouse supplier quotations (Dematic, Swisslog, Knapp, AutoStore).
6. `06_logistics_opex_benchmarks.csv`: Middle East warehouse operating cost benchmarks.
7. `07_e_commerce_growth_uae.csv`: GCC e-commerce delivery volume forecasts.
8. `08_inflation_cpi_uae.csv`: UAE Consumer Price Index trends.
9. `09_industrial_rent_dubai.csv`: Dubai South / JAFZA warehouse lease rates.
10. `10_finance_formula_catalog.csv`: Master corporate finance formula definitions.

## 2. Data Governance & Entity Safeguards
- **NovaRetail GCC**: Hypothetical UAE omnichannel retail entity.
- **DataCo Data**: Demonstration sample used strictly for operational benchmarking; never represented as AED financial statements.
- **Formula Injection Defense**: Escapes leading `=`, `+`, `-`, `@` characters on import and export.
