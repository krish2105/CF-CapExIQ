'use client';

import React, { useState } from 'react';
import { parseCsvString } from '@/lib/csv/csvParser';
import { computeDataQualityReport, DataQualityReport } from '@/lib/csv/dataQuality';
import { projectAssumptionRowSchema } from '@/lib/csv/schemas';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { Download, Upload, FileText, CheckCircle2, AlertTriangle, FileSpreadsheet, Printer } from 'lucide-react';
import VendorQuoteUploader from '@/components/csv/VendorQuoteUploader';
import Link from 'next/link';

export default function CsvManagementPage() {
  const { getActiveScenarioResult, assumptions, selectedScenario } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const yearlyCashFlows = scenarioResult.yearlyCashFlows;
  const metrics = scenarioResult.metrics;

  const [uploadReport, setUploadReport] = useState<DataQualityReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCsvString(text);

      const { report } = computeDataQualityReport(
        file.name,
        parsed.data,
        (record) => {
          const res = projectAssumptionRowSchema.safeParse(record);
          return { success: res.success, data: res.data, error: res.error };
        },
        'assumption_id'
      );

      setUploadReport(report);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAssumptionsCsv = () => {
    const headers = ['Assumption ID', 'Category', 'Name', 'Value', 'Unit', 'Classification', 'Source', 'Notes'];
    const rows = [
      ['CAPEX-EQUIP', 'Capital expenditure', 'Automation equipment', assumptions.automationEquipment, 'AED', 'User-entered', 'Academic estimate', 'Goods-to-person robotics'],
      ['CAPEX-INSTALL', 'Capital expenditure', 'Installation', assumptions.installationIntegration, 'AED', 'User-entered', 'Academic estimate', 'Mechanical & Electrical'],
      ['CAPEX-SOFTWARE', 'Capital expenditure', 'Software', assumptions.softwareCybersecurity, 'AED', 'User-entered', 'Academic estimate', 'WCS Licences'],
      ['CAPEX-TRAIN', 'Capital expenditure', 'Training', assumptions.trainingLaunch, 'AED', 'User-entered', 'Academic estimate', 'Staff launch support'],
      ['NWC-INITIAL', 'Working capital', 'Initial working capital', assumptions.initialWorkingCapital, 'AED', 'Forecast', 'Management assumption', 'Recovered Y6'],
      ['LIFE', 'Project', 'Project life', assumptions.projectLifeYears, 'years', 'User-entered', 'Management policy', 'Economic life'],
      ['DISCOUNT', 'Finance', 'Discount rate', assumptions.discountRate, 'decimal', 'User-entered', 'Management policy', 'WACC Hurdle Rate'],
      ['TAX', 'Tax', 'Corporate tax rate', assumptions.corporateTaxRate, 'decimal', 'Current external', 'UAE MoF', 'Headline rate'],
    ];
    downloadCsv(`NovaRetail_Assumptions_${selectedScenario}.csv`, headers, rows);
  };

  const exportCashFlowsCsv = () => {
    const headers = ['Year', 'Savings (AED)', 'Margin (AED)', 'Benefits (AED)', 'OpEx (AED)', 'EBITDA (AED)', 'EBIT (AED)', 'Tax (AED)', 'OCF (AED)', 'Free Cash Flow (AED)', 'Present Value (AED)'];
    const rows = yearlyCashFlows.map((y) => [
      y.year,
      y.operatingSavings.toFixed(2),
      y.incrementalMargin.toFixed(2),
      y.totalOperatingBenefits.toFixed(2),
      y.additionalOpEx.toFixed(2),
      y.ebitda.toFixed(2),
      y.ebit.toFixed(2),
      y.tax.toFixed(2),
      y.operatingCashFlow.toFixed(2),
      y.freeCashFlow.toFixed(2),
      y.presentValue.toFixed(2),
    ]);
    downloadCsv(`NovaRetail_CashFlows_${selectedScenario}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" /> CSV Management & Data Quality Audit
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Browser CSV Import Validation, Multi-Format Exports & Printable Investment Report
          </p>
        </div>

        <Link
          href="/printable-report"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all"
        >
          <Printer className="h-4 w-4" /> View Printable Report
        </Link>
      </div>

      {/* Vendor Quote OCR Ingestion Engine */}
      <VendorQuoteUploader />

      {/* Upload Zone & Export Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Upload Zone */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> User CSV Browser Upload & Audit
          </h3>

          <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center space-y-2 transition-colors">
            <FileSpreadsheet className="h-8 w-8 text-primary mx-auto" />
            <p className="text-xs font-semibold text-foreground">Upload Project Assumptions or Operational CSV</p>
            <p className="text-[11px] text-muted-foreground">Supports .csv files with PapaParse schema validation</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload-input"
            />
            <label
              htmlFor="csv-upload-input"
              className="inline-block mt-2 px-4 py-2 rounded-lg bg-card hover:bg-muted text-primary text-xs font-bold cursor-pointer transition-colors border border-border"
            >
              Select File to Audit
            </label>
          </div>

          {/* Audit Results */}
          {uploadReport && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">Audit Report: {uploadReport.datasetName}</span>
                <span className="text-[10px] text-success font-mono font-bold">
                  {uploadReport.validRows} Valid / {uploadReport.rejectedRows} Rejected
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-muted-foreground">
                <div>Total Rows: {uploadReport.totalRows}</div>
                <div>Missing Values: {uploadReport.missingValueCount}</div>
                <div>Duplicates: {uploadReport.duplicateCount}</div>
              </div>

              {uploadReport.validationErrors.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Row Errors Log:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[10px] font-mono text-destructive bg-muted p-2 rounded">
                    {uploadReport.validationErrors.map((err, idx) => (
                      <div key={idx}>
                        Row {err.rowIndex} ({err.fieldName}): {err.errorMessage}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Multi-Format Export Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Multi-Format CSV Exports
          </h3>

          <div className="space-y-3">
            <button
              onClick={exportAssumptionsCsv}
              className="w-full p-3 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> Export Project Assumptions CSV
              </span>
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={exportCashFlowsCsv}
              className="w-full p-3 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-success" /> Export 6-Year Cash Flow Forecast CSV
              </span>
              <Download className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
