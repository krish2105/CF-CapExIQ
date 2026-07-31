'use client';

import React from 'react';
import { DEFAULT_VENDOR_CATALOG } from '@/lib/finance/vendors';
import { formatAED } from '@/lib/utils/formatting';
import { Truck, ShieldCheck, Award, ExternalLink } from 'lucide-react';

export default function VendorAnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Vendor & Procurement TCO Matrix
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Automated Warehouse System Supplier Comparison & 6-Year Lifecycle Cost Analysis
          </p>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Supplier Quotations & TCO Scoring
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3">Vendor / System Provider</th>
              <th className="py-2.5 px-3 text-right">Equipment Capex</th>
              <th className="py-2.5 px-3 text-right">Integration & Software</th>
              <th className="py-2.5 px-3 text-right">Annual OpEx</th>
              <th className="py-2.5 px-3 text-right">6-Year Total TCO</th>
              <th className="py-2.5 px-3 text-center">Cyber Rating</th>
              <th className="py-2.5 px-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {DEFAULT_VENDOR_CATALOG.map((v) => (
              <tr key={v.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">{v.vendorName}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatAED(v.equipmentCost)}</td>
                <td className="py-2.5 px-3 text-right">{formatAED(v.installationCost + v.softwareCost)}</td>
                <td className="py-2.5 px-3 text-right">{formatAED(v.annualMaintenance)}</td>
                <td className="py-2.5 px-3 text-right font-bold text-success">{formatAED(v.sixYearTco)}</td>
                <td className="py-2.5 px-3 text-center font-bold text-purple-400">{v.cybersecurityRating}</td>
                <td className="py-2.5 px-3 text-right font-bold text-primary">{v.score} / 5.0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
