'use client';

import React, { useState, useEffect } from 'react';
import { LiveMacroResponse } from '@/app/api/ai/live-macro/route';
import { Globe, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

export function LiveMacroTicker() {
  const [macroData, setMacroData] = useState<LiveMacroResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMacro = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/live-macro');
      if (res.ok) {
        const data: LiveMacroResponse = await res.json();
        setMacroData(data);
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

  if (!macroData) return null;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white text-[11px] py-1 px-4 border-b border-indigo-500/30 flex items-center justify-between gap-4 overflow-x-auto select-none">
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
          <Globe className="h-3 w-3" /> Live GCC Macro RAG:
        </span>
        <span className="font-mono text-muted-foreground">{macroData.macroSentiment}</span>
      </div>

      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar shrink-0 font-mono">
        {macroData.indicators.map((ind, idx) => (
          <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
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

      <button onClick={fetchMacro} disabled={loading} className="text-slate-400 hover:text-white shrink-0">
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
