export interface DatasetMetadata {
  id: string;
  name: string;
  filename: string;
  category: 'Operational' | 'Financial' | 'External Macro' | 'Data Quality';
  description: string;
  rowCount: number;
  columns: string[];
}

export const DATASET_METADATA: DatasetMetadata[] = [
  {
    id: 'dataco_sample',
    name: 'DataCo Operational Sample',
    filename: '01_dataco_operational_sample_20.csv',
    category: 'Operational',
    description: '20 transaction records covering orders, shipping modes, late delivery risk, and profit margins.',
    rowCount: 20,
    columns: ['Order Id', 'Order Item Id', 'Delivery Status', 'Late_risk', 'Category Name', 'Customer City', 'Order Profit Per Order', 'Sales'],
  },
  {
    id: 'monthly_summary',
    name: 'Monthly Operational Summary',
    filename: '02_monthly_operational_summary_sample.csv',
    category: 'Operational',
    description: '12-month aggregated operating performance metrics including orders processed and error rates.',
    rowCount: 12,
    columns: ['Month', 'Total Orders Processed', 'Late Delivery Count', 'On-Time Fulfillment Rate (%)', 'Total Order Profit (AED)', 'Average Order Value (AED)'],
  },
  {
    id: 'project_assumptions',
    name: 'CapExIQ Project Assumptions',
    filename: '03_capexiq_project_assumptions.csv',
    category: 'Financial',
    description: 'Core financial assumptions register with baseline numbers, classifications, and parameter sources.',
    rowCount: 12,
    columns: ['Assumption ID', 'Category', 'Assumption Name', 'Value', 'Unit', 'Classification', 'Source', 'Notes'],
  },
  {
    id: 'scenario_defs',
    name: 'Scenario Definitions',
    filename: '04_scenario_definitions.csv',
    category: 'Financial',
    description: 'Multi-scenario multiplier parameters for Optimistic, Base Case, and Stress-Test Pessimistic runs.',
    rowCount: 3,
    columns: ['Scenario ID', 'Scenario Name', 'Investment Multiplier', 'Operating Benefit Multiplier', 'Operating Cost Multiplier', 'Hurdle Rate'],
  },
  {
    id: 'dewa_tariffs',
    name: 'DEWA Electricity Tariffs (July 2026)',
    filename: '05_dewa_electricity_tariffs_july_2026.csv',
    category: 'External Macro',
    description: 'Dubai Electricity & Water Authority commercial tariff schedules and fuel surcharge slabs.',
    rowCount: 5,
    columns: ['Tariff Category', 'Monthly Slab (kWh)', 'Tariff Rate (Fils/kWh)', 'Fuel Surcharge (Fils/kWh)', 'Effective Date'],
  },
  {
    id: 'corporate_tax',
    name: 'UAE Corporate Tax Rates',
    filename: '06_uae_corporate_tax_rates.csv',
    category: 'External Macro',
    description: 'Federal Tax Authority statutory rates, small business relief thresholds, and free zone exemptions.',
    rowCount: 4,
    columns: ['Tax Bracket', 'Taxable Income Threshold (AED)', 'Statutory Tax Rate (%)', 'Applicable Entities'],
  },
  {
    id: 'eibor_catalog',
    name: 'CBUAE EIBOR Download Catalog',
    filename: '07_cbuae_eibor_download_catalog.csv',
    category: 'External Macro',
    description: 'Central Bank of the UAE benchmark interest rates across overnight, 1-month, 3-month, and 1-year tenors.',
    rowCount: 6,
    columns: ['Tenor', 'EIBOR Rate (%)', 'Publication Date', 'Source Authority'],
  },
  {
    id: 'data_dictionary',
    name: 'Data Dictionary Catalog',
    filename: '08_data_dictionary.csv',
    category: 'Data Quality',
    description: 'Complete data dictionary defining data types, validation rules, and allowable ranges.',
    rowCount: 18,
    columns: ['Dataset', 'Field Name', 'Data Type', 'Description', 'Validation Rule'],
  },
  {
    id: 'data_sources',
    name: 'Data Source Register',
    filename: '09_data_source_register.csv',
    category: 'Data Quality',
    description: 'Audit lineage register mapping source systems, refresh frequencies, and governance ownership.',
    rowCount: 8,
    columns: ['Source ID', 'Source System', 'Data Category', 'Refresh Frequency', 'Owner Role'],
  },
  {
    id: 'finance_formulas',
    name: 'Finance Formula Catalog',
    filename: '10_finance_formula_catalog.csv',
    category: 'Financial',
    description: 'Formal mathematical formulation registry for NPV, IRR, MIRR, Payback, and WACC hurdle rate.',
    rowCount: 6,
    columns: ['Formula ID', 'Metric Name', 'Mathematical Expression', 'Key Variables'],
  },
];
