'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { financialAssumptionsSchema, FinancialAssumptionsFormData } from '@/lib/types/schema';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { FileSpreadsheet, RotateCcw, Save, AlertCircle, Info, ShieldCheck, Check } from 'lucide-react';

export default function AssumptionsPage() {
  const { assumptions, updateAssumptions, resetAssumptions, assumptionsRegister } = useFinancialStore();

  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FinancialAssumptionsFormData>({
    resolver: zodResolver(financialAssumptionsSchema),
    defaultValues: assumptions,
  });

  // Sync form when store assumptions reset
  React.useEffect(() => {
    reset(assumptions);
  }, [assumptions, reset]);

  const onSubmit = (data: FinancialAssumptionsFormData) => {
    updateAssumptions(data);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    resetAssumptions();
    setSavedSuccess(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" /> Assumptions Register & Model Parameters
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Validated Parameter Inputs with Zod Schema Enforcement & Local Storage Persistence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-card bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset to Defaults
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-card bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2 font-bold">
          <Check className="h-4 w-4" /> Assumptions successfully saved to model store!
        </div>
      )}

      {/* Main Assumptions Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Capital Outlay (CaPeX & NWC) */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
            1. Initial Capital Outlay & Working Capital (Time Zero)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Automation Equipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Automation Equipment (AED)</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('automationEquipment', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.automationEquipment && (
                <p className="text-[11px] text-destructive font-bold">{errors.automationEquipment.message}</p>
              )}
            </div>

            {/* Installation & Integration */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Installation & Integration (AED)</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="50000"
                {...register('installationIntegration', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.installationIntegration && (
                <p className="text-[11px] text-destructive font-bold">{errors.installationIntegration.message}</p>
              )}
            </div>

            {/* Software & Cybersecurity */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Software & Cybersecurity (AED)</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="50000"
                {...register('softwareCybersecurity', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.softwareCybersecurity && (
                <p className="text-[11px] text-destructive font-bold">{errors.softwareCybersecurity.message}</p>
              )}
            </div>

            {/* Training & Launch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Training & Launch (AED)</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="10000"
                {...register('trainingLaunch', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.trainingLaunch && (
                <p className="text-[11px] text-destructive font-bold">{errors.trainingLaunch.message}</p>
              )}
            </div>

            {/* Initial Working Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Initial Working Capital (AED)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('initialWorkingCapital', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.initialWorkingCapital && (
                <p className="text-[11px] text-destructive font-bold">{errors.initialWorkingCapital.message}</p>
              )}
            </div>

            {/* Project Life */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Project Life (Years)</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="1"
                {...register('projectLifeYears', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.projectLifeYears && (
                <p className="text-[11px] text-destructive font-bold">{errors.projectLifeYears.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Operating Benefits & Growth */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
            2. Operating Benefits & Revenue Growth
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year 1 Operating Savings */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 Savings (AED/yr)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('year1OperatingSavings', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1OperatingSavings && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1OperatingSavings.message}</p>
              )}
            </div>

            {/* Savings Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Savings Growth (decimal)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualSavingsGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualSavingsGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualSavingsGrowth.message}</p>
              )}
            </div>

            {/* Year 1 Contribution Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 Margin (AED/yr)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('year1ContributionMargin', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1ContributionMargin && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1ContributionMargin.message}</p>
              )}
            </div>

            {/* Margin Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Margin Growth (decimal)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualMarginGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualMarginGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualMarginGrowth.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Operating Costs, Financial & Tax Rates */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
            3. Operating Expenses, Hurdle Rate & Corporate Tax
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year 1 Additional OpEx */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 OpEx (AED/yr)</span>
                <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="50000"
                {...register('year1AdditionalOpEx', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1AdditionalOpEx && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1AdditionalOpEx.message}</p>
              )}
            </div>

            {/* OpEx Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>OpEx Growth (decimal)</span>
                <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualOpExGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualOpExGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualOpExGrowth.message}</p>
              )}
            </div>

            {/* Discount Rate (WACC) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Discount Rate / WACC</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold">User-entered</span>
              </label>
              <input
                type="number"
                step="0.005"
                {...register('discountRate', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.discountRate && (
                <p className="text-[11px] text-destructive font-bold">{errors.discountRate.message}</p>
              )}
            </div>

            {/* Corporate Tax Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>UAE Corporate Tax</span>
                <span className="text-[10px] text-info bg-info/10 px-1.5 py-0.5 rounded font-mono font-bold">Current Ext.</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('corporateTaxRate', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.corporateTaxRate && (
                <p className="text-[11px] text-destructive font-bold">{errors.corporateTaxRate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Terminal Values */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-sans text-sm font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2">
            4. Terminal Cash Flow Values (Year 6 End)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Salvage Value */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Equipment Salvage Value (AED)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('salvageValue', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.salvageValue && (
                <p className="text-[11px] text-destructive font-bold">{errors.salvageValue.message}</p>
              )}
            </div>

            {/* Working Capital Recovery */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Working Capital Recovery (AED)</span>
                <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded font-mono font-bold">Forecast</span>
              </label>
              <input
                type="number"
                step="100000"
                {...register('workingCapitalRecovery', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.workingCapitalRecovery && (
                <p className="text-[11px] text-destructive font-bold">{errors.workingCapitalRecovery.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-card bg-accent text-accent-foreground text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Save className="h-4 w-4" /> Save Updated Assumptions & Recalculate
          </button>
        </div>
      </form>
    </div>
  );
}
