'use client';

import React from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { Sliders, RotateCcw, ShieldCheck, Check, Info } from 'lucide-react';

export default function SettingsPage() {
  const { assumptions, updateAssumptions, resetAssumptions } = useFinancialStore();

  const [savedNotice, setSavedNotice] = React.useState(false);

  const toggles = assumptions.depreciableCapexItems || {
    automationEquipment: true,
    installationIntegration: true,
    softwareCybersecurity: true,
    trainingLaunch: true,
  };

  const handleToggleCapex = (itemKey: keyof typeof toggles) => {
    updateAssumptions({
      depreciableCapexItems: {
        ...toggles,
        [itemKey]: !toggles[itemKey],
      },
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" /> Model Configuration & Recommendation Engine Thresholds
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Configurable Decision Threshold Rules & Depreciable Asset Allocation
          </p>
        </div>

        <button
          onClick={resetAssumptions}
          className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="h-4 w-4 text-primary" /> Reset Model to Defaults
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold flex items-center gap-2">
          <Check className="h-4 w-4" /> Settings updated!
        </div>
      )}

      {/* Depreciable Capex Items Toggles */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Depreciable Capital Expenditure Items Configuration
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure which capital expenditure line items are depreciated over the 6-year project life. Non-depreciated items are written off immediately in Year 0 without annual depreciation tax shields.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <label className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="text-foreground font-medium">Automation Equipment (AED 18M)</span>
            <input
              type="checkbox"
              checked={toggles.automationEquipment}
              onChange={() => handleToggleCapex('automationEquipment')}
              className="rounded bg-card border-border text-primary focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="text-foreground font-medium">Installation & Systems Integration (AED 2.5M)</span>
            <input
              type="checkbox"
              checked={toggles.installationIntegration}
              onChange={() => handleToggleCapex('installationIntegration')}
              className="rounded bg-card border-border text-primary focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="text-foreground font-medium">Software & Cybersecurity (AED 1.2M)</span>
            <input
              type="checkbox"
              checked={toggles.softwareCybersecurity}
              onChange={() => handleToggleCapex('softwareCybersecurity')}
              className="rounded bg-card border-border text-primary focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-xs cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="text-foreground font-medium">Training & Launch Support (AED 300K)</span>
            <input
              type="checkbox"
              checked={toggles.trainingLaunch}
              onChange={() => handleToggleCapex('trainingLaunch')}
              className="rounded bg-card border-border text-primary focus:ring-0"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
