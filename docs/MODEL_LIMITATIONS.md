# CapExIQ — Model Limitations and Governance Disclosures

## Explicit Limitations and Boundaries

1. **Hypothetical corporate entity.** NovaRetail GCC is a hypothetical retail entity created solely
   for a postgraduate corporate finance assignment. Nothing in this repository is investment advice.

2. **DataCo benchmark scope.** The operational sample data
   (`public/data/01_dataco_operational_sample_20.csv` and the derived
   `02_monthly_operational_summary_sample.csv`) is genuine external data from the DataCo Smart Supply
   Chain dataset, but it is **US-market operational data**. It is used only as a delivery-performance
   benchmark, does not feed any financial calculation, and must not be interpreted as NovaRetail
   historical financial statements.

3. **Capital expenditure figures are illustrative.** The AED 22.0M CapEx build-up is an academic
   estimate. No vendor quotations have been obtained or cited.

4. **Deterministic calculation isolation.** All NPV, IRR, MIRR, PI, payback and WACC calculations are
   produced by deterministic TypeScript in `src/lib/finance/`. AI models generate advisory narrative
   only and cannot alter any financial figure.

5. **Depreciation method.** The model uses **straight-line depreciation to salvage over the 6-year
   project life**: (AED 22,000,000 − AED 2,000,000) ÷ 6 = **AED 3,333,333 per year**. It does **not**
   use MACRS. MACRS is a US tax regime, it is an accelerated (declining-balance) method rather than
   straight line, and it does not apply to a UAE project. Any earlier reference in this repository to
   "straight-line 5-year MACRS" was wrong on all three counts and has been removed. The model also
   assumes 100% of CapEx is depreciable (the per-item toggles in `cashflow.ts` default to on) and
   applies no half-year or mid-quarter convention.

6. **Flat tax rate — the zero-rate band is ignored.** The model applies a flat **9%** to positive EBIT
   in every year. UAE Federal Decree-Law No. 47 of 2022, as documented in the repository's own
   `public/data/06_uae_corporate_tax_rates.csv`, charges **0% on the first AED 375,000 of taxable
   income** and 9% only above that threshold. The model does not apply that band, so project tax is
   slightly overstated (by up to AED 33,750 per year, roughly AED 0.14M of NPV) and the NPV is
   correspondingly conservative. This is a simplification, not a rounding artefact.

7. **No loss carry-forward.** Tax is computed as `max(0, EBIT x 9%)` on a standalone year-by-year
   basis. A year with negative EBIT produces zero tax, but the loss is **not carried forward** to
   shelter taxable income in later years, as UAE corporate tax law would generally permit. In the base
   case EBIT is positive in all six years so this has no effect, but in the pessimistic scenario and
   in downside Monte Carlo draws it makes the model **understate** after-tax cash flow.

8. **Standalone project appraisal.** The model appraises the project on its own incremental cash
   flows. It does not model group-level tax consolidation, transfer pricing, financing cash flows
   inside the FCF stream (financing is reflected in the discount rate only), inflation on a separate
   real/nominal basis, or foreign-exchange exposure.

9. **Working capital is a single flat amount.** AED 2,000,000 is committed at time zero and recovered
   in full in Year 6. The model does not scale working capital with revenue or model any intermediate
   build or release.

10. **Terminal value.** The Year-6 cash flow includes salvage of AED 2,000,000 plus the AED 2,000,000
    working-capital recovery. No going-concern or perpetuity terminal value is assumed, and no tax is
    charged on the salvage proceeds.

11. **Electricity costs.** DEWA commercial slab pricing is used for the power component of OpEx. Real
    industrial supply agreements, demand charges and capacity charges are not modelled.

12. **Portfolio IRR is an approximation.** `/portfolio` reports an investment-weighted arithmetic mean
    of individual project IRRs. IRRs are roots of NPV polynomials and are not additive; this figure is
    presentational, and the code says so explicitly.
