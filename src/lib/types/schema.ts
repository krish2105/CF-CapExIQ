import { z } from 'zod';

export const financialAssumptionsSchema = z.object({
  automationEquipment: z.number().min(1, 'Automation equipment cost must be positive'),
  installationIntegration: z.number().min(0, 'Installation cost cannot be negative'),
  softwareCybersecurity: z.number().min(0, 'Software cost cannot be negative'),
  trainingLaunch: z.number().min(0, 'Training cost cannot be negative'),
  initialWorkingCapital: z.number().min(0, 'Initial working capital cannot be negative'),

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

export type FinancialAssumptionsFormData = z.infer<typeof financialAssumptionsSchema>;
