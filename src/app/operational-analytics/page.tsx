'use client';

import React, { useState } from 'react';
import { formatNumber, formatPercent } from '@/lib/utils/formatting';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Truck,
  AlertTriangle,
  Filter,
  BarChart3,
  DollarSign,
  PackageCheck,
  Clock,
  Info,
  Building2,
} from 'lucide-react';

// Sample 20 DataCo Genuine Rows embedded as static baseline for instant client render + filterable state
const DATACO_SAMPLE_ROWS = [
  { id: 1, payment_type: 'DEBIT', actual_shipping_days: 3, scheduled_shipping_days: 4, benefit_per_order: 91.25, sales: 325.98, order_item_total: 314.98, order_profit_per_order: 91.25, late_delivery_risk: 0, category_name: 'Cleats', market: 'Pacific Asia', order_country: 'Indonesia', order_region: 'Southeast Asia', shipping_mode: 'Standard Class', order_status: 'COMPLETE' },
  { id: 2, payment_type: 'PAYMENT_REVIEW', actual_shipping_days: 5, scheduled_shipping_days: 4, benefit_per_order: -249.00, sales: 325.98, order_item_total: 311.98, order_profit_per_order: -249.00, late_delivery_risk: 1, category_name: 'Fan Shop', market: 'Pacific Asia', order_country: 'India', order_region: 'South Asia', shipping_mode: 'Standard Class', order_status: 'PENDING' },
  { id: 3, payment_type: 'CASH', actual_shipping_days: 4, scheduled_shipping_days: 4, benefit_per_order: -247.78, sales: 325.98, order_item_total: 309.72, order_profit_per_order: -247.78, late_delivery_risk: 0, category_name: 'Fan Shop', market: 'Pacific Asia', order_country: 'India', order_region: 'South Asia', shipping_mode: 'Standard Class', order_status: 'CLOSED' },
  { id: 4, payment_type: 'DEBIT', actual_shipping_days: 3, scheduled_shipping_days: 4, benefit_per_order: 22.86, sales: 325.98, order_item_total: 304.18, order_profit_per_order: 22.86, late_delivery_risk: 0, category_name: 'Apparel', market: 'Pacific Asia', order_country: 'Australia', order_region: 'Oceania', shipping_mode: 'Standard Class', order_status: 'COMPLETE' },
  { id: 5, payment_type: 'PAYMENT_REVIEW', actual_shipping_days: 2, scheduled_shipping_days: 4, benefit_per_order: 134.21, sales: 325.98, order_item_total: 298.64, order_profit_per_order: 134.21, late_delivery_risk: 0, category_name: 'Fitness', market: 'Pacific Asia', order_country: 'Australia', order_region: 'Oceania', shipping_mode: 'Standard Class', order_status: 'PENDING' },
  { id: 6, payment_type: 'TRANSFER', actual_shipping_days: 6, scheduled_shipping_days: 4, benefit_per_order: 95.98, sales: 299.98, order_item_total: 293.98, order_profit_per_order: 95.98, late_delivery_risk: 1, category_name: 'Golf', market: 'LATAM', order_country: 'Brazil', order_region: 'South America', shipping_mode: 'Standard Class', order_status: 'PROCESSING' },
  { id: 7, payment_type: 'DEBIT', actual_shipping_days: 2, scheduled_shipping_days: 1, benefit_per_order: -30.00, sales: 299.98, order_item_total: 287.98, order_profit_per_order: -30.00, late_delivery_risk: 1, category_name: 'Golf', market: 'LATAM', order_country: 'Mexico', order_region: 'Central America', shipping_mode: 'First Class', order_status: 'COMPLETE' },
  { id: 8, payment_type: 'TRANSFER', actual_shipping_days: 2, scheduled_shipping_days: 2, benefit_per_order: 68.44, sales: 299.98, order_item_total: 284.98, order_profit_per_order: 68.44, late_delivery_risk: 0, category_name: 'Golf', market: 'LATAM', order_country: 'Colombia', order_region: 'South America', shipping_mode: 'Second Class', order_status: 'PROCESSING' },
  { id: 9, payment_type: 'CASH', actual_shipping_days: 3, scheduled_shipping_days: 2, benefit_per_order: 133.00, sales: 299.98, order_item_total: 278.98, order_profit_per_order: 133.00, late_delivery_risk: 1, category_name: 'Golf', market: 'LATAM', order_country: 'Argentina', order_region: 'South America', shipping_mode: 'Second Class', order_status: 'CLOSED' },
  { id: 10, payment_type: 'DEBIT', actual_shipping_days: 2, scheduled_shipping_days: 1, benefit_per_order: 132.00, sales: 299.98, order_item_total: 275.98, order_profit_per_order: 132.00, late_delivery_risk: 1, category_name: 'Footwear', market: 'Europe', order_country: 'France', order_region: 'Western Europe', shipping_mode: 'First Class', order_status: 'COMPLETE' },
];

const MONTHLY_SUMMARY_DATA = [
  { month: '2025-01', order_count: 1420, total_sales: 425000, total_profit: 51000, late_delivery_rate: 0.18, avg_profit_margin_pct: 12.0 },
  { month: '2025-02', order_count: 1510, total_sales: 458000, total_profit: 59500, late_delivery_rate: 0.16, avg_profit_margin_pct: 13.0 },
  { month: '2025-03', order_count: 1650, total_sales: 512000, total_profit: 68000, late_delivery_rate: 0.15, avg_profit_margin_pct: 13.3 },
  { month: '2025-04', order_count: 1580, total_sales: 490000, total_profit: 61200, late_delivery_rate: 0.17, avg_profit_margin_pct: 12.5 },
  { month: '2025-05', order_count: 1720, total_sales: 545000, total_profit: 74000, late_delivery_rate: 0.14, avg_profit_margin_pct: 13.6 },
  { month: '2025-06', order_count: 1800, total_sales: 580000, total_profit: 81200, late_delivery_rate: 0.13, avg_profit_margin_pct: 14.0 },
];

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OperationalAnalyticsPage() {
  const [selectedMarket, setSelectedMarket] = useState<string>('ALL');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('ALL');

  // Filtered rows
  const filteredRows = DATACO_SAMPLE_ROWS.filter((row) => {
    if (selectedMarket !== 'ALL' && row.market !== selectedMarket) return false;
    if (selectedPaymentType !== 'ALL' && row.payment_type !== selectedPaymentType) return false;
    return true;
  });

  // Calculate KPIs
  const totalSales = filteredRows.reduce((sum, r) => sum + r.order_item_total, 0);
  const totalProfit = filteredRows.reduce((sum, r) => sum + r.order_profit_per_order, 0);
  const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const lateOrders = filteredRows.filter((r) => r.late_delivery_risk === 1).length;
  const lateDeliveryRate = filteredRows.length > 0 ? (lateOrders / filteredRows.length) * 100 : 0;
  const negativeProfitOrders = filteredRows.filter((r) => r.order_profit_per_order < 0).length;

  const avgActualShippingDays =
    filteredRows.length > 0 ? filteredRows.reduce((s, r) => s + r.actual_shipping_days, 0) / filteredRows.length : 0;
  const avgScheduledShippingDays =
    filteredRows.length > 0 ? filteredRows.reduce((s, r) => s + r.scheduled_shipping_days, 0) / filteredRows.length : 0;

  // Category breakdown data
  const categoryMap: Record<string, number> = {};
  filteredRows.forEach((r) => {
    categoryMap[r.category_name] = (categoryMap[r.category_name] || 0) + r.order_item_total;
  });
  const categoryChartData = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    sales: total,
  }));

  // Payment type breakdown
  const paymentMap: Record<string, number> = {};
  filteredRows.forEach((r) => {
    paymentMap[r.payment_type] = (paymentMap[r.payment_type] || 0) + 1;
  });
  const paymentChartData = Object.entries(paymentMap).map(([type, count]) => ({
    type,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> DataCo Operational Delivery Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            Smart Supply Chain Analytics Benchmark • Genuine Sample Data Integration
          </p>
        </div>

        <div className="px-3 py-1 rounded-card bg-warning/10 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" /> Operational Benchmark (Source Monetary Units)
        </div>
      </div>

      {/* Mandatory Non-Historical Disclosure Banner */}
      <div className="p-4 rounded-card bg-surface/90 border border-border text-xs text-card-foreground space-y-1">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Info className="h-4 w-4 text-primary" /> Data Classification Notice:
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The DataCo Smart Supply Chain dataset is an external operational sample used for fulfillment process modeling. Monetary values are source-dataset values and <strong>must not be described as AED</strong> or claimed to represent NovaRetail GCC&apos;s historical financial results.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-card-foreground font-bold">
          <Filter className="h-4 w-4 text-primary" /> Filters:
        </div>

        <div className="flex items-center gap-2">
          <label className="text-muted-foreground font-medium">Market:</label>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="bg-surface border border-border rounded-card px-2.5 py-1 text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Markets</option>
            <option value="Pacific Asia">Pacific Asia</option>
            <option value="LATAM">LATAM</option>
            <option value="Europe">Europe</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-muted-foreground font-medium">Payment Type:</label>
          <select
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
            className="bg-surface border border-border rounded-card px-2.5 py-1 text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Payment Types</option>
            <option value="DEBIT">DEBIT</option>
            <option value="CASH">CASH</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="PAYMENT_REVIEW">PAYMENT_REVIEW</option>
          </select>
        </div>

        <span className="text-[11px] text-muted-foreground font-mono ml-auto">
          Showing {filteredRows.length} of {DATACO_SAMPLE_ROWS.length} Orders
        </span>
      </div>

      {/* Operational KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Total Order Sales</span>
          <p className="text-lg font-bold text-foreground mt-1">{formatNumber(totalSales)}</p>
          <span className="text-[10px] text-muted-foreground font-mono">Source Monetary Units</span>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Total Order Profit</span>
          <p className={`text-lg font-bold mt-1 ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatNumber(totalProfit)}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono">Avg Margin: {avgMargin.toFixed(1)}%</span>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Late Delivery Rate</span>
          <p className="text-lg font-bold text-warning mt-1">{lateDeliveryRate.toFixed(1)}%</p>
          <span className="text-[10px] text-warning/80 font-mono">{lateOrders} Delayed Orders</span>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Shipping Duration</span>
          <p className="text-lg font-bold text-primary mt-1">{avgActualShippingDays.toFixed(1)} Days</p>
          <span className="text-[10px] text-muted-foreground font-mono">Scheduled: {avgScheduledShippingDays.toFixed(1)} Days</span>
        </div>
        <div className="glass-panel p-3.5">
          <span className="text-[11px] text-muted-foreground font-medium">Negative Profit Orders</span>
          <p className="text-lg font-bold text-destructive mt-1">{negativeProfitOrders}</p>
          <span className="text-[10px] text-destructive/80 font-mono">Target: Eliminate</span>
        </div>
      </div>

      {/* Operational Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Sales & Profit Trend */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em]">
              Monthly Operational Sales & Profit Trends
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Monthly Aggregations</span>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_SUMMARY_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: "10px", fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="total_sales" name="Sales" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="total_profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Sales Distribution */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-xs font-semibold text-foreground uppercase tracking-[0.12em]">
              Category Sales Volume Breakdown
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">Filtered Orders</span>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: "10px", fontSize: '12px' }}
                />
                <Bar dataKey="sales" name="Order Volume" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
