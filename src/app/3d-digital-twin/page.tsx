'use client';

import React, { useState } from 'react';
import { Box, Layers, Cpu, Play, RefreshCw, CheckCircle2, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function DigitalTwinPage() {
  const [activeZone, setActiveZone] = useState<'A' | 'B' | 'C'>('A');
  const [robotCount, setRobotCount] = useState(45);
  const [simulating, setSimulating] = useState(false);

  const runSimulation = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Box className="h-6 w-6 text-cyan-500" /> 3D Spatial Digital Twin & Warehouse Layout Optimizer
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spatial optimization canvas mapping Dubai South MFC storage racks, AMR picking routes, and packing stations.
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={simulating}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors"
        >
          {simulating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Simulating AMR Routes...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Run Spatial Layout Simulation
            </>
          )}
        </button>
      </div>

      {/* Main 3D Canvas Canvas Visualizer Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between min-h-[420px]">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Layers className="h-4 w-4 text-cyan-500" /> Interactive Spatial Grid — Dubai South MFC (3,500 sq meters)
            </div>
            <div className="flex gap-1.5 font-mono text-xs">
              {(['A', 'B', 'C'] as const).map((zone) => (
                <button
                  key={zone}
                  onClick={() => setActiveZone(zone)}
                  className={`px-3 py-1 rounded-md font-bold transition-all ${
                    activeZone === zone
                      ? 'bg-cyan-500 text-white shadow'
                      : 'bg-muted text-muted-foreground hover:bg-card'
                  }`}
                >
                  Zone {zone}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Spatial Grid Visualizer */}
          <div className="relative flex-1 bg-slate-950 border border-slate-800 rounded-lg p-6 flex flex-col justify-between overflow-hidden">
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30"></div>

            {/* Warehouse Rack Modules */}
            <div className="relative z-10 grid grid-cols-4 sm:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    i % 3 === 0
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : i % 2 === 0
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold block">RACK-0{i + 1}</span>
                  <span className="text-[9px] text-slate-400">Cap: 94%</span>
                </div>
              ))}
            </div>

            {/* AMR Fleet Activity Visualizer */}
            <div className="relative z-10 pt-6 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400 animate-pulse" />
                <span>Active AMRs: <strong className="text-white">{robotCount} Units</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Throughput: <strong className="text-white">8,450 Orders/Day</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Spatial Controls & Optimization Metrics */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-500" /> Spatial AI Layout Optimizer
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-muted-foreground font-semibold mb-1">AMR Fleet Deployment Size</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={robotCount}
                  onChange={(e) => setRobotCount(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-mono font-bold text-primary w-12 text-right">{robotCount} Bots</span>
              </div>
            </div>

            <div className="bg-background/60 p-3 rounded-lg border border-border space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Order Pick SLA Time</span>
                <span className="text-emerald-500 font-mono">1.8 Mins / Tote</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Space Utilization</span>
                <span className="text-cyan-500 font-mono">92.4% Optimal</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Congestion Bottleneck</span>
                <span className="text-emerald-500 font-mono">0.2% Low</span>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <span className="font-bold text-primary uppercase text-[10px] tracking-wider">AI Layout Verdict</span>
              <p className="text-foreground text-xs leading-relaxed">
                Zone {activeZone} layout operates at peak packing efficiency. 45 AMR units maintain optimal 2-hour SLA fulfillment without warehouse floor congestion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
