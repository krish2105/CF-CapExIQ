import { z } from 'zod';

export const datacoSampleRowSchema = z.object({
  payment_type: z.string().min(1, 'Payment type is required'),
  actual_shipping_days: z.number().min(0, 'Shipping days cannot be negative'),
  scheduled_shipping_days: z.number().min(0, 'Scheduled shipping days cannot be negative'),
  benefit_per_order: z.number(),
  sales: z.number().min(0, 'Sales cannot be negative'),
  order_item_total: z.number().min(0, 'Order item total cannot be negative'),
  order_profit_per_order: z.number(),
  late_delivery_risk: z.number().min(0).max(1),
  category_name: z.string().optional(),
  market: z.string().optional(),
  order_country: z.string().optional(),
  order_region: z.string().optional(),
  shipping_mode: z.string().optional(),
  order_status: z.string().optional(),
});

export const monthlySummaryRowSchema = z.object({
  month: z.string().min(1, 'Month is required'),
  order_count: z.number().min(0),
  total_sales: z.number().min(0),
  total_profit: z.number(),
  late_delivery_rate: z.number().min(0).max(1),
  avg_profit_margin_pct: z.number(),
});

export const projectAssumptionRowSchema = z.object({
  assumption_id: z.string().min(1),
  category: z.string().min(1),
  assumption_name: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  data_classification: z.string(),
  source_type: z.string(),
  notes: z.string().optional(),
  last_updated: z.string().optional(),
});

export const scenarioDefinitionRowSchema = z.object({
  scenario: z.string().min(1),
  investment_multiplier: z.number().min(0.1).max(5.0),
  operating_benefit_multiplier: z.number().min(0.0).max(5.0),
  operating_cost_multiplier: z.number().min(0.0).max(5.0),
  discount_rate: z.number().min(0.001).max(0.50),
  description: z.string(),
});

export const dewaTariffRowSchema = z.object({
  customer_type: z.string().min(1),
  monthly_kwh_from: z.number().min(0),
  monthly_kwh_to: z.number().nullable().optional(),
  base_tariff_aed_per_kwh: z.number().min(0),
  fuel_surcharge_aed_per_kwh: z.number().min(0),
  vat_rate: z.number().min(0).max(1),
  effective_month: z.string(),
  unit: z.string(),
  source: z.string(),
  source_url: z.string().optional(),
});

export const uaeTaxRateRowSchema = z.object({
  taxable_income_from_aed: z.number().min(0),
  taxable_income_to_aed: z.number().nullable().optional(),
  corporate_tax_rate: z.number().min(0).max(1),
  description: z.string(),
  source: z.string(),
  source_url: z.string().optional(),
  model_note: z.string().optional(),
});

export const eiborCatalogRowSchema = z.object({
  coverage_period: z.string().min(1),
  publication_date: z.string(),
  file_type: z.string(),
  download_url: z.string(),
  source: z.string(),
  use_in_model: z.string(),
});

export const dataDictionaryRowSchema = z.object({
  file_name: z.string().min(1),
  field_name: z.string().min(1),
  definition: z.string(),
  unit_or_type: z.string(),
  source_class: z.string(),
});

export const dataSourceRegisterRowSchema = z.object({
  dataset: z.string().min(1),
  purpose: z.string(),
  data_classification: z.string(),
  licence_or_status: z.string(),
  source_url: z.string().optional(),
  usage_note: z.string().optional(),
});

export const financeFormulaRowSchema = z.object({
  metric: z.string().min(1),
  formula: z.string(),
  interpretation: z.string(),
});
