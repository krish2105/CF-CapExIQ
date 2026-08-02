import { z } from 'zod';

const depreciableCapexItemsSchema = z.object({
  automationEquipment: z.boolean(),
  installationIntegration: z.boolean(),
  softwareCybersecurity: z.boolean(),
  trainingLaunch: z.boolean(),
});

const financialAssumptionsBaseSchema = z.object({
  automationEquipment: z.number().min(1, 'Automation equipment cost must be positive'),
  installationIntegration: z.number().min(0, 'Installation cost cannot be negative'),
  softwareCybersecurity: z.number().min(0, 'Software cost cannot be negative'),
  trainingLaunch: z.number().min(0, 'Training cost cannot be negative'),
  initialWorkingCapital: z.number().min(0, 'Initial working capital cannot be negative'),

  // Depreciable capex toggles. Declared here so that submitting the assumptions form preserves the
  // user's Settings-page selections instead of silently stripping them (Zod drops unknown keys).
  depreciableCapexItems: depreciableCapexItemsSchema.optional(),

  projectLifeYears: z.number().min(1, 'Project life must be at least 1 year').max(30, 'Project life max 30 years'),

  year1OperatingSavings: z.number().min(0, 'Year 1 operating savings cannot be negative'),
  annualSavingsGrowth: z.number().min(-0.5, 'Savings growth rate invalid').max(0.5, 'Savings growth max 50%'),

  year1ContributionMargin: z.number().min(0, 'Contribution margin cannot be negative'),
  annualMarginGrowth: z.number().min(-0.5, 'Margin growth rate invalid').max(0.5, 'Margin growth max 50%'),

  year1AdditionalOpEx: z.number().min(0, 'Operating costs cannot be negative'),
  annualOpExGrowth: z.number().min(-0.5, 'OpEx growth rate invalid').max(0.5, 'OpEx growth max 50%'),

  discountRate: z.number().min(0.001, 'Discount rate must be > 0').max(0.50, 'Discount rate max 50%'),
  financeRateMIRR: z.number().min(0.001, 'Finance rate must be > 0').max(0.50, 'Finance rate max 50%'),
  reinvestmentRateMIRR: z.number().min(0.001, 'Reinvestment rate must be > 0').max(0.50, 'Reinvestment rate max 50%'),
  corporateTaxRate: z.number().min(0, 'Tax rate cannot be negative').max(1.0, 'Tax rate cannot exceed 100%'),

  salvageValue: z.number().min(0, 'Salvage value cannot be negative'),
  workingCapitalRecovery: z.number().min(0, 'Working capital recovery cannot be negative'),
});

/**
 * Cross-field validation.
 *
 * Field-level rules alone cannot catch assumption combinations that are individually legal but
 * jointly impossible. Both rules below would otherwise flatter the model:
 *  - salvage above total capex drives the depreciable basis negative (EBIT above EBITDA, understated
 *    tax, inflated NPV) and asserts the asset is worth more at disposal than it cost to install;
 *  - recovering more working capital than was ever injected creates cash out of nothing at exit.
 */
export const financialAssumptionsSchema = financialAssumptionsBaseSchema.superRefine((data, ctx) => {
  const totalCapex =
    data.automationEquipment +
    data.installationIntegration +
    data.softwareCybersecurity +
    data.trainingLaunch;

  if (data.salvageValue > totalCapex) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['salvageValue'],
      message: `Salvage value cannot exceed total capital expenditure (AED ${totalCapex.toLocaleString('en-US')}). An asset cannot be worth more at disposal than it cost to acquire and install.`,
    });
  }

  if (data.workingCapitalRecovery > data.initialWorkingCapital) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['workingCapitalRecovery'],
      message: `Working-capital recovery cannot exceed the initial working capital invested (AED ${data.initialWorkingCapital.toLocaleString('en-US')}). You cannot release more working capital than was committed.`,
    });
  }
});

export type FinancialAssumptionsFormData = z.infer<typeof financialAssumptionsSchema>;
