'use client';

import React, { useState, useEffect } from 'react';
import { LiveMacroResponse } from '@/app/api/ai/live-macro/route';
import { Globe, TrendingUp, TrendingDown, Minus, RefreshCw, CheckCircle2 } from 'lucide-react';

export function LiveMacroTicker() {
  const [macroData, setMacroData] = useState<LiveMacroResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [justRefreshed, setJustRefreshed] = useState(false);

  const fetchMacro = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/live-macro');
      if (res.ok) {
        const data: LiveMacroResponse = await res.json();
        setMacroData(data);
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastRefreshed(time);
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMacro();
  }, []);

  const defaultIndicators = [
    { name: 'CBUAE 3M EIBOR', value: '4.85%', change: '0.00%', trend: 'stable', sentiment: 'neutral' },
    { name: 'DEWA Slab Tariff', value: 'AED 0.38/kWh', change: '+1.2%', trend: 'up', sentiment: 'risk' },
    { name: 'UAE Corporate Tax', value: '9.0%', change: 'Fixed', trend: 'stable', sentiment: 'positive' },
    { name: 'GCC AMR Shipping SLA', value: '18 Days', change: '-2 Days', trend: 'down', sentiment: 'positive' },
    { name: 'Dubai South Lease', value: 'AED 42/sqft', change: '0.0%', trend: 'stable', sentiment: 'neutral' },
  ];

  const displayData = macroData || {
    timestamp: new Date().toISOString(),
    macroSentiment: 'STABLE WACC ENVIRONMENT',
    indicators: defaultIndicators,
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white text-[11px] py-1.5 px-4 border-b border-indigo-500/30 shadow-md backdrop-blur-md flex items-center justify-between gap-4 select-none">
      {/* Pulse Status */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> LIVE GCC MACRO RAG:
        </span>
        <span className="font-mono font-bold text-slate-200">{displayData.macroSentiment}</span>
      </div>

      {/* Ticker Items */}
      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar shrink-0 font-mono">
        {displayData.indicators.map((ind, idx) => (
          <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/20">
            <span className="text-slate-400">{ind.name}:</span>
            <span className="font-bold text-white">{ind.value}</span>
            <span
              className={`flex items-center text-[10px] font-bold ${
                ind.sentiment === 'positive'
                  ? 'text-emerald-400'
                  : ind.sentiment === 'risk'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {ind.trend === 'up' && <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
              {ind.trend === 'down' && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
              {ind.trend === 'stable' && <Minus className="h-2.5 w-2.5 mr-0.5" />}
              {ind.change}
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Refresh Button */}
      <div className="flex items-center gap-2 shrink-0">
        {lastRefreshed && (
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Updated: {lastRefreshed}
          </span>
        )}
        <button
          onClick={fetchMacro}
          disabled={loading}
          title="Click to refresh live macro rates and DEWA tariffs"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono transition-all ${
            justRefreshed
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-indigo-900/50 hover:bg-indigo-800 border-indigo-500/40 text-slate-200 hover:text-white'
          }`}
        >
          {justRefreshed ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Refreshed
            </>
          ) : (
            <>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-primary' : ''}`} /> Refresh
            </>
          )}
        </button>
      </div>
    </div>
  );
}
