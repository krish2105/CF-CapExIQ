'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { ThreatRadarResponse } from '@/app/api/ai/threat-radar/route';
import { ShieldAlert, RefreshCw, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

const INITIAL_THREAT_DATA: ThreatRadarResponse = {
  overallThreatScore: 38,
  threatLevel: 'MODERATE ELEVATED',
  executiveRiskSummary: 'Multi-axis risk radar indicates manageable downside exposure across DEWA tariffs and Swisslog AMR equipment lead times. Active stage-gate capital controls provide 85% risk mitigation efficiency.',
  threatVectors: [
    {
      dimension: 'DEWA Tariff Escalation',
      score: 45,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Lock in 3-year commercial solar power purchase agreement (PPA) to cap energy costs.',
    },
    {
      dimension: 'Robotics Integration Lead Time',
      score: 55,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Enforce liquid damages clause of 1.5%/week on Swisslog AMR equipment delivery delays.',
    },
    {
      dimension: 'UAE Corporate Tax Impact',
      score: 25,
      riskLevel: 'Low',
      mitigationStrategy: 'Utilize qualifying free-zone reinvestment exemptions under UAE Federal Tax Law.',
    },
    {
      dimension: 'Inflation & Labor Rate Hikes',
      score: 40,
      riskLevel: 'Moderate',
      mitigationStrategy: 'Accelerate Phase-1 automated picking to permanently replace manual shift labor.',
    },
    {
      dimension: 'SLA Demand Conversion',
      score: 30,
      riskLevel: 'Low',
      mitigationStrategy: 'Sign pre-launch SLA volume commitments with NovaRetail GCC anchor merchant partners.',
    },
    {
      dimension: 'WACC Interest Rate Volatility',
      score: 35,
      riskLevel: 'Low',
      mitigationStrategy: 'Secure fixed 5-year commercial facility with Emirates NBD at 5.25% fixed margin.',
    },
  ],
};

export default function AiThreatRadarPage() {
  const { getActiveAssumptions, getActiveScenarioResult } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [loading, setLoading] = useState(false);
  const [threatData, setThreatData] = useState<ThreatRadarResponse>(INITIAL_THREAT_DATA);

  const fetchThreatRadar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/threat-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions, metrics }),
      });

      if (!res.ok) throw new Error('Failed to fetch threat radar');
      const data: ThreatRadarResponse = await res.json();
      setThreatData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatRadar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = threatData?.threatVectors.map((v) => ({
    subject: v.dimension,
    score: v.score,
    fullMark: 100,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-500" /> Real-Time AI Threat Radar & Risk Matrix
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Multi-axis radar chart evaluating 6 macro risk dimensions with automated mitigation playbooks.
          </p>
        </div>

        <button
          onClick={fetchThreatRadar}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Rescan Risk Radar
        </button>
      </div>

      {threatData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Radar Chart Panel */}
          <div className="lg:col-span-5 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-xs uppercase font-bold text-muted-foreground">Overall Risk Posture</span>
                  <h3 className="text-2xl font-black text-foreground mt-0.5">{threatData.threatLevel}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Threat Index</span>
                  <p className="text-2xl font-black text-rose-500 font-mono">{threatData.overallThreatScore} / 100</p>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                    <PolarGrid stroke="currentColor" className="text-border/60" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10 }} className="text-muted-foreground font-semibold" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Threat Score" dataKey="score" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed italic bg-background/50 p-3 rounded-lg border border-border">
              {threatData.executiveRiskSummary}
            </p>
          </div>

          {/* Risk Mitigation Table */}
          <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Multi-Axis Risk Mitigation Playbook
            </h3>

            <div className="space-y-3">
              {threatData.threatVectors.map((vector, idx) => (
                <div key={idx} className="bg-background/60 border border-border/80 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{vector.dimension}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-foreground">{vector.score}/100</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        vector.riskLevel === 'Critical' ? 'bg-rose-500/20 text-rose-500' :
                        vector.riskLevel === 'High' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {vector.riskLevel}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-primary font-medium">Mitigation:</strong> {vector.mitigationStrategy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
