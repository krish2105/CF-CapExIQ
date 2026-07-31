'use client';

import React from 'react';
import { DEFAULT_BENEFITS_TRACKER } from '@/lib/finance/benefits';
import { formatAED } from '@/lib/utils/formatting';
import { TrendingUp, CheckCircle2, AlertCircle, Award } from 'lucide-react';

export default function BenefitsTrackerPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Benefits-Realization Tracker & Post-Investment Review
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Approved vs. Actual Operational Benefit Realization, Variance Audit & Value Leakage Monitoring
          </p>
        </div>
      </div>

      {/* Benefits Register Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Approved vs. Actual Benefit Realization Register
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3">Benefit Category</th>
              <th className="py-2.5 px-3">Owner</th>
              <th className="py-2.5 px-3 text-right">Approved Year 1</th>
              <th className="py-2.5 px-3 text-right">Forecast Year 1</th>
              <th className="py-2.5 px-3 text-right">Actual Realized</th>
              <th className="py-2.5 px-3 text-right">Variance (AED)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {DEFAULT_BENEFITS_TRACKER.map((b) => (
              <tr key={b.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">{b.category}</td>
                <td className="py-2.5 px-3 text-muted-foreground font-sans">{b.ownerRole}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatAED(b.approvedYear1BenefitAed)}</td>
                <td className="py-2.5 px-3 text-right">{formatAED(b.forecastYear1BenefitAed)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-success">{formatAED(b.actualYear1BenefitAed)}</td>
                <td className={`py-2.5 px-3 text-right font-bold ${b.varianceAed >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {b.varianceAed >= 0 ? `+${formatAED(b.varianceAed)}` : formatAED(b.varianceAed)}
                </td>
                <td className="py-2.5 px-3 text-center font-sans font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    b.status === 'Ahead of Plan' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                  }`}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
