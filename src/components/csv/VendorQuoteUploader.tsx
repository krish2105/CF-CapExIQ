'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ParsedVendorQuote } from '@/app/api/ai/parse-quote/route';
import { FileUp, Sparkles, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

/**
 * 2 MB of text is far more than any real quotation and small enough that
 * `file.text()` cannot lock the main thread.
 */
const MAX_UPLOAD_BYTES = 2 * 1_048_576;

/**
 * Text-bearing formats only. `.pdf` was accepted and then read with
 * `file.text()`, which yields binary noise, not the document — the extractor
 * was being handed garbage and answering confidently from it.
 */
const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.json', '.md'] as const;

export default function VendorQuoteUploader() {
  const { updateAssumptions, assumptions } = useFinancialStore();
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedVendorQuote | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validated here as well as server-side. The server bound exists to stop
    // an attacker; this one exists to stop an accident — reading a 40 MB file
    // with `file.text()` freezes the tab before any request is sent, so a
    // server-only limit still lets a mistyped upload break the page.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `${file.name} is ${(file.size / 1_048_576).toFixed(1)} MB. The limit is ` +
          `${MAX_UPLOAD_BYTES / 1_048_576} MB — export the quote as text or CSV and retry.`
      );
      e.target.value = '';
      return;
    }

    if (!ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError(
        `${file.name} is not a supported format. Upload ${ACCEPTED_EXTENSIONS.join(', ')} — ` +
          `binary PDFs are read as raw bytes and produce nonsense figures.`
      );
      e.target.value = '';
      return;
    }

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

      if (res.status === 403) {
        setError('Your role does not hold write access to the capital model.');
        return;
      }
      if (res.status === 429) {
        setError('Too many uploads in a short window. Wait a moment and retry.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? 'Failed to parse the quotation.');
        return;
      }

      const data: ParsedVendorQuote = await res.json();
      setParsedResult(data);
      // Surfaced, not swallowed: a truncated or redacted document produces a
      // confident total over partial input, and the reader has to know that.
      setNotices(Array.isArray(data.notices) ? data.notices : []);
    } catch (err) {
      console.error(err);
      setError('Could not reach the extraction service.');
    } finally {
      setLoading(false);
      e.target.value = '';
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
    <div className="bg-card border border-border rounded-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Multimodal Vendor Quotation OCR Engine
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload supplier proposal PDFs or quotes (Swisslog, Dematic, AutoStore, Knapp) to auto-extract line-item CapEx.
          </p>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-card bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shrink-0">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> AI Extracting...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" /> Upload Vendor Quote
            </>
          )}
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-destructive border border-destructive/30 bg-destructive/5 rounded-card px-3 py-2"
        >
          {error}
        </p>
      )}

      {notices.length > 0 && (
        <ul className="text-[11px] text-muted-foreground border border-border rounded-card px-3 py-2 space-y-1">
          {notices.map((notice) => (
            <li key={notice}>· {notice}</li>
          ))}
        </ul>
      )}

      {parsedResult && (
        <div className="bg-background/60 border border-primary/20 rounded-card p-4 space-y-4 text-xs animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <span className="font-bold text-foreground text-sm">{parsedResult.vendorName}</span>
              <p className="text-muted-foreground">Ref: {parsedResult.quotationRef} • Date: {parsedResult.quoteDate}</p>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Total Extracted CapEx</span>
              <p className="text-lg font-semibold text-primary">
                AED {parsedResult.extractedCapEx.totalCapEx.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-1.5">
            <span className="font-semibold text-foreground uppercase tracking-wider text-[10px] text-muted-foreground">Itemized Line Items</span>
            <div className="divide-y divide-border border border-border rounded-card overflow-hidden bg-card">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-card bg-success hover:opacity-90 text-success-foreground font-bold text-xs transition-colors shrink-0 disabled:opacity-50"
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
