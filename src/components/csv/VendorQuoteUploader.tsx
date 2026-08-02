'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ParsedVendorQuote } from '@/app/api/ai/parse-quote/route';
import { FileUp, Sparkles, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

export default function VendorQuoteUploader() {
  const { updateAssumptions, assumptions } = useFinancialStore();
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedVendorQuote | null>(null);
  const [applied, setApplied] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setApplied(false);
    try {
      const text = await file.text();
      const res = await fetch('/api/ai/parse-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: text,
          filename: file.name,
        }),
      });

      if (!res.ok) throw new Error('Failed to parse quote');
      const data: ParsedVendorQuote = await res.json();
      setParsedResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyToFinancialModel = () => {
    if (!parsedResult) return;
    updateAssumptions({
      automationEquipment: parsedResult.extractedCapEx.automationEquipment,
      installationIntegration: parsedResult.extractedCapEx.installationIntegration,
      softwareCybersecurity: parsedResult.extractedCapEx.softwareCybersecurity,
      trainingLaunch: parsedResult.extractedCapEx.trainingLaunch,
    });
    setApplied(true);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Multimodal Vendor Quotation OCR Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload supplier proposal PDFs or quotes (Swisslog, Dematic, AutoStore, Knapp) to auto-extract line-item CapEx.
          </p>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shrink-0">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> AI Extracting...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" /> Upload Vendor Quote
            </>
          )}
          <input type="file" accept=".txt,.csv,.json,.pdf" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>

      {parsedResult && (
        <div className="bg-background/60 border border-primary/20 rounded-lg p-4 space-y-4 text-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <span className="font-bold text-foreground text-sm">{parsedResult.vendorName}</span>
              <p className="text-muted-foreground">Ref: {parsedResult.quotationRef} • Date: {parsedResult.quoteDate}</p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Total Extracted CapEx</span>
              <p className="text-lg font-black text-primary">
                AED {parsedResult.extractedCapEx.totalCapEx.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-1.5">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">Itemized Line Items</span>
            <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-card">
              {parsedResult.itemizedBreakdown.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
                      {item.category}
                    </span>
                    <span className="text-foreground">{item.itemDescription}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground shrink-0">
                    AED {item.amountAED.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-muted-foreground italic text-[11px]">{parsedResult.vendorNotes}</p>
            <button
              onClick={applyToFinancialModel}
              disabled={applied}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {applied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Model Updated!
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" /> Apply Extracted CapEx to Model
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
