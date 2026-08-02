'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { financialAssumptionsSchema, FinancialAssumptionsFormData } from '@/lib/types/schema';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { AssumptionItem, DataClassification } from '@/lib/types/finance';
import { formatAED, formatNumber, formatPercent } from '@/lib/utils/formatting';
import { FileSpreadsheet, RotateCcw, Save, Info, Check } from 'lucide-react';

/**
 * The brief requires five distinct provenance classes. They are driven off the
 * `dataClassification` field on the assumptions register - never hardcoded in the JSX - so a badge
 * can no longer disagree with the register it is supposed to describe.
 */
const ALL_DATA_CLASSIFICATIONS: DataClassification[] = [
  'Historical',
  'Current external',
  'Forecast',
  'User-entered assumption',
  'AI-generated',
];

const CLASSIFICATION_STYLES: Record<DataClassification, { short: string; className: string; swatch: string; blurb: string }> = {
  Historical: {
    short: 'Historical',
    className: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border border-sky-500/30',
    swatch: 'bg-sky-500',
    blurb: 'Observed actuals from a closed period.',
  },
  'Current external': {
    short: 'Current Ext.',
    className: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30',
    swatch: 'bg-purple-500',
    blurb: 'Published third-party or regulatory data as at today.',
  },
  Forecast: {
    short: 'Forecast',
    className: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
    swatch: 'bg-emerald-500',
    blurb: 'Forward-looking management projection.',
  },
  'User-entered assumption': {
    short: 'User-entered',
    className: 'text-primary bg-primary/10 border border-primary/30',
    swatch: 'bg-primary',
    blurb: 'Value typed into this model by the analyst.',
  },
  'AI-generated': {
    short: 'AI-generated',
    className: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30',
    swatch: 'bg-amber-500',
    blurb: 'Produced by the AI assistant and pending human review.',
  },
};

/** Renders a register value in the unit the register itself declares. */
function formatRegisterValue(item: AssumptionItem): string {
  if (item.unit.startsWith('decimal')) return formatPercent(item.value, 2);
  if (item.unit.startsWith('AED')) return `${formatAED(item.value)}${item.unit.includes('/year') ? '/yr' : ''}`;
  return `${formatNumber(item.value, 0)} ${item.unit}`;
}

const ClassificationBadge: React.FC<{ item?: AssumptionItem }> = ({ item }) => {
  if (!item) {
    return (
      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono font-bold border border-border">
        Unclassified
      </span>
    );
  }
  const style = CLASSIFICATION_STYLES[item.dataClassification];
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${style.className}`}
      title={`${item.dataClassification} — ${style.blurb}`}
    >
      {style.short}
    </span>
  );
};

/** Surfaces the register's `source`, `notes` and `lastUpdated`, which were stored but never shown. */
const FieldProvenance: React.FC<{ item?: AssumptionItem }> = ({ item }) => {
  if (!item) return null;
  return (
    <p className="text-[10px] text-muted-foreground leading-snug" title={item.notes}>
      <span className="font-semibold text-foreground/80">{item.source}</span>
      {' · updated '}
      {item.lastUpdated}
      <span className="block italic">{item.notes}</span>
    </p>
  );
};

export default function AssumptionsPage() {
  const { assumptions, updateAssumptions, resetAssumptions, assumptionsRegister } = useFinancialStore();

  const registerById = React.useMemo(() => {
    const map: Record<string, AssumptionItem> = {};
    assumptionsRegister.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [assumptionsRegister]);

  const classificationCounts = React.useMemo(() => {
    const counts: Record<DataClassification, number> = {
      Historical: 0,
      'Current external': 0,
      Forecast: 0,
      'User-entered assumption': 0,
      'AI-generated': 0,
    };
    assumptionsRegister.forEach((item) => {
      counts[item.dataClassification] += 1;
    });
    return counts;
  }, [assumptionsRegister]);

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
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
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
            className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset to Defaults
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2 font-bold">
          <Check className="h-4 w-4" /> Assumptions successfully saved to model store!
        </div>
      )}

      {/* Data classification legend - all five classes, with the live count held by the register */}
      <div className="glass-panel p-4 rounded-2xl border border-border space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> Data Classification Legend
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {ALL_DATA_CLASSIFICATIONS.map((classification) => {
            const style = CLASSIFICATION_STYLES[classification];
            const count = classificationCounts[classification];
            return (
              <div key={classification} className="p-2.5 rounded-xl border border-border bg-muted/30 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.swatch}`} />
                  <span className="text-[11px] font-bold text-foreground">{classification}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{style.blurb}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {count === 0 ? 'No register entries' : `${count} register ${count === 1 ? 'entry' : 'entries'}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Assumptions Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Capital Outlay (CaPeX & NWC) */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            1. Initial Capital Outlay & Working Capital (Time Zero)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Automation Equipment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Automation Equipment (AED)</span>
                <ClassificationBadge item={registerById['CAPEX-EQUIP']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('automationEquipment', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.automationEquipment && (
                <p className="text-[11px] text-destructive font-bold">{errors.automationEquipment.message}</p>
              )}
              <FieldProvenance item={registerById['CAPEX-EQUIP']} />
            </div>

            {/* Installation & Integration */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Installation & Integration (AED)</span>
                <ClassificationBadge item={registerById['CAPEX-INSTALL']} />
              </label>
              <input
                type="number"
                step="50000"
                {...register('installationIntegration', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.installationIntegration && (
                <p className="text-[11px] text-destructive font-bold">{errors.installationIntegration.message}</p>
              )}
              <FieldProvenance item={registerById['CAPEX-INSTALL']} />
            </div>

            {/* Software & Cybersecurity */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Software & Cybersecurity (AED)</span>
                <ClassificationBadge item={registerById['CAPEX-SOFTWARE']} />
              </label>
              <input
                type="number"
                step="50000"
                {...register('softwareCybersecurity', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.softwareCybersecurity && (
                <p className="text-[11px] text-destructive font-bold">{errors.softwareCybersecurity.message}</p>
              )}
              <FieldProvenance item={registerById['CAPEX-SOFTWARE']} />
            </div>

            {/* Training & Launch */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Training & Launch (AED)</span>
                <ClassificationBadge item={registerById['CAPEX-TRAIN']} />
              </label>
              <input
                type="number"
                step="10000"
                {...register('trainingLaunch', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.trainingLaunch && (
                <p className="text-[11px] text-destructive font-bold">{errors.trainingLaunch.message}</p>
              )}
              <FieldProvenance item={registerById['CAPEX-TRAIN']} />
            </div>

            {/* Initial Working Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Initial Working Capital (AED)</span>
                <ClassificationBadge item={registerById['NWC-INITIAL']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('initialWorkingCapital', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.initialWorkingCapital && (
                <p className="text-[11px] text-destructive font-bold">{errors.initialWorkingCapital.message}</p>
              )}
              <FieldProvenance item={registerById['NWC-INITIAL']} />
            </div>

            {/* Project Life */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Project Life (Years)</span>
                <ClassificationBadge item={registerById['LIFE']} />
              </label>
              <input
                type="number"
                step="1"
                {...register('projectLifeYears', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.projectLifeYears && (
                <p className="text-[11px] text-destructive font-bold">{errors.projectLifeYears.message}</p>
              )}
              <FieldProvenance item={registerById['LIFE']} />
            </div>
          </div>
        </div>

        {/* Section 2: Operating Benefits & Growth */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            2. Operating Benefits & Revenue Growth
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year 1 Operating Savings */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 Savings (AED/yr)</span>
                <ClassificationBadge item={registerById['SAVE-Y1']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('year1OperatingSavings', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1OperatingSavings && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1OperatingSavings.message}</p>
              )}
              <FieldProvenance item={registerById['SAVE-Y1']} />
            </div>

            {/* Savings Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Savings Growth (decimal)</span>
                <ClassificationBadge item={registerById['SAVE-GROWTH']} />
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualSavingsGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualSavingsGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualSavingsGrowth.message}</p>
              )}
              <FieldProvenance item={registerById['SAVE-GROWTH']} />
            </div>

            {/* Year 1 Contribution Margin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 Margin (AED/yr)</span>
                <ClassificationBadge item={registerById['MARGIN-Y1']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('year1ContributionMargin', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1ContributionMargin && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1ContributionMargin.message}</p>
              )}
              <FieldProvenance item={registerById['MARGIN-Y1']} />
            </div>

            {/* Margin Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Margin Growth (decimal)</span>
                <ClassificationBadge item={registerById['MARGIN-GROWTH']} />
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualMarginGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualMarginGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualMarginGrowth.message}</p>
              )}
              <FieldProvenance item={registerById['MARGIN-GROWTH']} />
            </div>
          </div>
        </div>

        {/* Section 3: Operating Costs, Financial & Tax Rates */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            3. Operating Expenses, Hurdle Rate & Corporate Tax
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Year 1 Additional OpEx */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Year 1 OpEx (AED/yr)</span>
                <ClassificationBadge item={registerById['OPEX-Y1']} />
              </label>
              <input
                type="number"
                step="50000"
                {...register('year1AdditionalOpEx', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.year1AdditionalOpEx && (
                <p className="text-[11px] text-destructive font-bold">{errors.year1AdditionalOpEx.message}</p>
              )}
              <FieldProvenance item={registerById['OPEX-Y1']} />
            </div>

            {/* OpEx Growth Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>OpEx Growth (decimal)</span>
                <ClassificationBadge item={registerById['OPEX-GROWTH']} />
              </label>
              <input
                type="number"
                step="0.005"
                {...register('annualOpExGrowth', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.annualOpExGrowth && (
                <p className="text-[11px] text-destructive font-bold">{errors.annualOpExGrowth.message}</p>
              )}
              <FieldProvenance item={registerById['OPEX-GROWTH']} />
            </div>

            {/* Discount Rate (WACC) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Discount Rate / WACC</span>
                <ClassificationBadge item={registerById['DISCOUNT']} />
              </label>
              <input
                type="number"
                step="0.005"
                {...register('discountRate', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.discountRate && (
                <p className="text-[11px] text-destructive font-bold">{errors.discountRate.message}</p>
              )}
              <FieldProvenance item={registerById['DISCOUNT']} />
            </div>

            {/* Corporate Tax Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>UAE Corporate Tax</span>
                <ClassificationBadge item={registerById['TAX']} />
              </label>
              <input
                type="number"
                step="0.01"
                {...register('corporateTaxRate', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.corporateTaxRate && (
                <p className="text-[11px] text-destructive font-bold">{errors.corporateTaxRate.message}</p>
              )}
              <FieldProvenance item={registerById['TAX']} />
            </div>
          </div>
        </div>

        {/* Section 4: Terminal Values */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-2">
            4. Terminal Cash Flow Values (End of Year {Math.max(1, Math.round(assumptions.projectLifeYears))})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Salvage Value */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Equipment Salvage Value (AED)</span>
                <ClassificationBadge item={registerById['SALVAGE']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('salvageValue', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.salvageValue && (
                <p className="text-[11px] text-destructive font-bold">{errors.salvageValue.message}</p>
              )}
              <FieldProvenance item={registerById['SALVAGE']} />
            </div>

            {/* Working Capital Recovery */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Working Capital Recovery (AED)</span>
                <ClassificationBadge item={registerById['NWC-RECOVERY']} />
              </label>
              <input
                type="number"
                step="100000"
                {...register('workingCapitalRecovery', { valueAsNumber: true })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              {errors.workingCapitalRecovery && (
                <p className="text-[11px] text-destructive font-bold">{errors.workingCapitalRecovery.message}</p>
              )}
              <FieldProvenance item={registerById['NWC-RECOVERY']} />
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Save className="h-4 w-4" /> Save Updated Assumptions & Recalculate
          </button>
        </div>
      </form>

      {/* Full assumptions register - provenance for every parameter, including those with no form field */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Assumptions Register — Provenance & Audit Trail
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            {assumptionsRegister.length} classified parameters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Value</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {assumptionsRegister.map((item) => (
                <tr key={item.id} className="hover:bg-muted/40 align-top">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{item.id}</td>
                  <td className="py-2.5 px-3 font-semibold">{item.name}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{item.category}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-primary whitespace-nowrap">
                    {formatRegisterValue(item)}
                  </td>
                  <td className="py-2.5 px-3">
                    <ClassificationBadge item={item} />
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{item.source}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{item.notes}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {item.lastUpdated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
