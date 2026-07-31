'use client';

import React, { useState, useEffect } from 'react';
import { DATASET_METADATA } from '@/lib/data/datasetLoaders';
import { BookOpen, Table, Info, Search, FileCode, CheckCircle2 } from 'lucide-react';

interface DataDictionaryEntry {
  file_name: string;
  variable_name: string;
  definition: string;
  unit_or_type: string;
  source_reference: string;
}

interface SourceCatalogEntry {
  source_id: string;
  organisation: string;
  dataset_title: string;
  purpose: string;
  official_url: string;
  licence_or_status: string;
  usage_note: string;
}

interface FormulaEntry {
  metric_name: string;
  formula: string;
  interpretation: string;
}

export default function DataSourcesPage() {
  const [dataDict, setDataDict] = useState<DataDictionaryEntry[]>([]);
  const [sources, setSources] = useState<SourceCatalogEntry[]>([]);
  const [formulas, setFormulas] = useState<FormulaEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dictionary' | 'sources' | 'formulas'>('dictionary');

  useEffect(() => {
    // Load metadata catalogs
    setDataDict([
      { file_name: '01_dataco_supply_chain_sample.csv', variable_name: 'Delivery Status', definition: 'Order shipping status indicator', unit_or_type: 'Categorical', source_reference: 'DataCo Sample' },
      { file_name: '02_dewa_tariff_schedule.csv', variable_name: 'Tariff Slab (AED/kWh)', definition: 'Commercial electricity rate slab', unit_or_type: 'Currency (AED)', source_reference: 'DEWA Official Tariff' },
      { file_name: '03_uae_corporate_tax_guidelines.csv', variable_name: 'Tax Rate (%)', definition: 'Federal corporate tax rate', unit_or_type: 'Percentage (9.0%)', source_reference: 'Ministry of Finance Law 47' },
      { file_name: '04_eibor_historical_rates.csv', variable_name: 'EIBOR 3M Rate', definition: 'Emirates Interbank Offered Rate benchmark', unit_or_type: 'Percentage (4.85%)', source_reference: 'Central Bank of UAE' },
      { file_name: '05_micro_fulfilment_capex_quotes.csv', variable_name: 'Equipment Capex', definition: 'Automated warehouse robotics quotation', unit_or_type: 'Currency (AED)', source_reference: 'Vendor Quotation' },
    ]);

    setSources([
      { source_id: 'SRC-01', organisation: 'Dubai Electricity & Water Authority (DEWA)', dataset_title: 'Commercial Slab Tariffs 2024', purpose: 'Power utility cost modeling', official_url: 'https://www.dewa.gov.ae', licence_or_status: 'Official Public Data', usage_note: 'Applied to facility annual kWh consumption' },
      { source_id: 'SRC-02', organisation: 'UAE Ministry of Finance', dataset_title: 'Federal Corporate Tax Decree-Law No. 47', purpose: '9.0% Tax liability calculation', official_url: 'https://mof.gov.ae', licence_or_status: 'Official Legislation', usage_note: 'Applies to net taxable profit > AED 375,000' },
      { source_id: 'SRC-03', organisation: 'Central Bank of the UAE (CBUAE)', dataset_title: '3-Month EIBOR Benchmark Rates', purpose: 'Cost of debt benchmark', official_url: 'https://www.centralbank.ae', licence_or_status: 'Official Public Data', usage_note: 'Base debt interest rate = EIBOR + 1.65% spread' },
    ]);

    setFormulas([
      { metric_name: 'Net Present Value (NPV)', formula: 'NPV = Σ [ FCF_t / (1 + WACC)^t ] - Initial Outlay', interpretation: 'Measures net value created above hurdle rate in AED.' },
      { metric_name: 'Internal Rate of Return (IRR)', formula: 'NPV(IRR) = 0', interpretation: 'Discount rate at which project NPV equals zero.' },
      { metric_name: 'Profitability Index (PI)', formula: 'PI = PV of Inflows / Initial Outlay', interpretation: 'Value created per AED 1.00 of capital committed.' },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Data Dictionary, Source Catalog & Methodology
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • Data Governance, Variable Specifications, Authoritative Sources & Financial Formulas
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'dictionary'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Variable Dictionary
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'sources'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Authoritative Sources
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'formulas'
                ? 'bg-card text-foreground font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Formula Catalog
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables or formulas..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          />
        </div>
      </div>

      {/* Active Content Table */}
      {activeTab === 'dictionary' && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">Dataset File</th>
                <th className="py-2.5 px-3">Variable Name</th>
                <th className="py-2.5 px-3">Definition & Purpose</th>
                <th className="py-2.5 px-3">Unit / Data Type</th>
                <th className="py-2.5 px-3">Source Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {dataDict
                .filter((item) => item.variable_name.toLowerCase().includes(searchQuery.toLowerCase()) || item.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="py-2.5 px-3 text-muted-foreground">{item.file_name}</td>
                    <td className="py-2.5 px-3 font-bold text-primary">{item.variable_name}</td>
                    <td className="py-2.5 px-3 font-sans text-muted-foreground">{item.definition}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{item.unit_or_type}</td>
                    <td className="py-2.5 px-3 font-bold text-success">{item.source_reference}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Source Organisation</th>
                <th className="py-2.5 px-3">Dataset Title</th>
                <th className="py-2.5 px-3">Model Usage</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {sources
                .filter((item) => item.organisation.toLowerCase().includes(searchQuery.toLowerCase()) || item.dataset_title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="py-2.5 px-3 font-bold text-primary">{item.source_id}</td>
                    <td className="py-2.5 px-3 font-bold text-foreground">{item.organisation}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{item.dataset_title}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{item.purpose}</td>
                    <td className="py-2.5 px-3 text-success font-bold">{item.licence_or_status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'formulas' && (
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-muted text-foreground text-[11px] border-b border-border">
                <th className="py-2.5 px-3">Metric Name</th>
                <th className="py-2.5 px-3">Mathematical Formula</th>
                <th className="py-2.5 px-3">Corporate Finance Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {formulas
                .filter((item) => item.metric_name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="py-2.5 px-3 font-bold text-primary">{item.metric_name}</td>
                    <td className="py-2.5 px-3 font-bold text-purple-600 dark:text-purple-400">{item.formula}</td>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans">{item.interpretation}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
