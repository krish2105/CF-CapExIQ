'use client';

import React from 'react';
import { DEFAULT_VENDOR_CATALOG } from '@/lib/finance/vendors';
import { formatAED } from '@/lib/utils/formatting';
import { Info, Truck, ShieldCheck, Award, ExternalLink } from 'lucide-react';

export default function VendorAnalysisPage() {
  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Vendor & Procurement TCO Matrix
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Supplier comparison and 6-year lifecycle cost analysis — illustrative pricing
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 text-warning mt-0.5" />
        <p className="text-[11px] text-foreground/85 leading-relaxed">
          <strong className="font-medium">Illustrative pricing — not quotations.</strong> The suppliers
          named below are real companies, but no quotation was requested from or issued by any of them.
          The figures are academic estimates constructed to exercise the total-cost-of-ownership
          comparison, and they must not be read as market pricing or used for procurement. A live
          evaluation would replace them with quotations obtained under a request-for-proposal process.
        </p>
      </div>

      {/* Vendor Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em] border-b border-border pb-2 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Supplier Quotations & TCO Scoring
        </h3>

        <table className="ledger-table">
          <thead>
            <tr>
              <th className="py-2.5 px-3">Vendor / System Provider</th>
              <th className="py-2.5 px-3 num">Equipment Capex</th>
              <th className="py-2.5 px-3 num">Integration & Software</th>
              <th className="py-2.5 px-3 num">Annual OpEx</th>
              <th className="py-2.5 px-3 num">6-Year Total TCO</th>
              <th className="py-2.5 px-3 text-center">Cyber Rating</th>
              <th className="py-2.5 px-3 num">Score</th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_VENDOR_CATALOG.map((v) => (
              <tr key={v.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">{v.vendorName}</td>
                <td className="py-2.5 px-3 num font-bold">{formatAED(v.equipmentCost)}</td>
                <td className="py-2.5 px-3 num">{formatAED(v.installationCost + v.softwareCost)}</td>
                <td className="py-2.5 px-3 num">{formatAED(v.annualMaintenance)}</td>
                <td className="py-2.5 px-3 num font-bold text-success">{formatAED(v.sixYearTco)}</td>
                <td className="py-2.5 px-3 text-center font-bold text-info">{v.cybersecurityRating}</td>
                <td className="py-2.5 px-3 num font-bold text-primary">{v.score} / 5.0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
