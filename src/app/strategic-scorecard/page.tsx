'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { DEFAULT_STRATEGIC_DIMENSIONS, calculateStrategicScorecard } from '@/lib/finance/strategicScorecard';
import { StrategicDimension } from '@/lib/types/finance';
import { useThemeChartColors } from '@/lib/utils/chartColors';
import { formatAED } from '@/lib/utils/formatting';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Target, Award, ShieldAlert, Sliders, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function StrategicScorecardPage() {
  const { getActiveScenarioResult } = useFinancialStore();
  const scenarioResult = getActiveScenarioResult();
  const npv = scenarioResult.metrics.npv;
  const colors = useThemeChartColors();

  const [dimensions, setDimensions] = useState<StrategicDimension[]>(DEFAULT_STRATEGIC_DIMENSIONS);

  const scorecardResult = calculateStrategicScorecard(dimensions, npv);

  const handleScoreChange = (id: string, newScore: number) => {
    setDimensions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, score: newScore } : d))
    );
  };

  const radarData = dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
    fullMark: 5,
  }));

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Strategic-Fit Scorecard & Alignment Matrix
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • 10-Dimension Strategic Evaluation, Radar Profiling & Financial-Strategic Trade-off Analysis
          </p>
        </div>

        <div className="glass-panel px-4 py-2 rounded-xl border border-primary/30 flex items-center gap-3">
          <Award className="h-6 w-6 text-primary" />
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Weighted Strategic Score</span>
            <p className="text-xl font-bold text-primary">{scorecardResult.weightedScore} / 5.0</p>
          </div>
        </div>
      </div>

      {/* Trade-off Warning Banner */}
      {scorecardResult.tradeoffNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Strategic Trade-off Disclosure:
          </div>
          <p className="text-[11px] leading-relaxed">{scorecardResult.tradeoffNotice}</p>
        </div>
      )}

      {/* Grid Layout: Radar Chart & 2x2 Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> 10-Dimension Strategic Profile Radar
          </h3>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={colors.grid} />
                <PolarAngleAxis dataKey="dimension" stroke={colors.axis} tick={{ fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} stroke={colors.axis} tick={{ fontSize: 9 }} />
                <Radar name="Strategic Score" dataKey="score" stroke={colors.primary} fill={colors.primary} fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, borderRadius: '12px', fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial vs Strategic 2x2 Matrix */}
        <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-success" /> Financial Value vs. Strategic Alignment Matrix
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              npv > 0 && scorecardResult.weightedScore >= 3.5 ? 'bg-success/15 border-success text-success font-bold shadow-md' : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="font-bold text-sm">Quadrant I: Strategic Priority</div>
              <p className="text-[11px] font-normal mt-1">High Financial NPV ({formatAED(npv)}) & High Strategic Fit ({scorecardResult.weightedScore}/5.0). Strongly Recommended for Full Capital Approval.</p>
              {npv > 0 && scorecardResult.weightedScore >= 3.5 && (
                <span className="mt-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-success text-white w-fit">Active Position</span>
              )}
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              npv <= 0 && scorecardResult.weightedScore >= 3.5 ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-bold shadow-md' : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="font-bold text-sm">Quadrant II: Strategic Trade-Off</div>
              <p className="text-[11px] font-normal mt-1">Negative NPV & High Strategic Fit. Requires Board Waiver approving strategic value over short-term returns.</p>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              npv > 0 && scorecardResult.weightedScore < 3.5 ? 'bg-primary/15 border-primary text-primary font-bold shadow-md' : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="font-bold text-sm">Quadrant III: Financial Cash Cow</div>
              <p className="text-[11px] font-normal mt-1">High Financial NPV & Low Strategic Fit. Good returns but limited long-term competitive moat.</p>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              npv <= 0 && scorecardResult.weightedScore < 3.5 ? 'bg-destructive/15 border-destructive text-destructive font-bold shadow-md' : 'bg-muted/40 border-border text-muted-foreground'
            }`}>
              <div className="font-bold text-sm">Quadrant IV: Value Destroyer</div>
              <p className="text-[11px] font-normal mt-1">Negative NPV & Low Strategic Fit. Strongly Recommended for Immediate Rejection.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 10-Dimension Score Tuner Table */}
      <div className="glass-panel p-5 rounded-2xl border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" /> Strategic Dimensions Score & Weighting Register
        </h3>

        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="bg-muted text-foreground text-[11px] border-b border-border">
              <th className="py-2.5 px-3">Dimension</th>
              <th className="py-2.5 px-3">Strategic Rationale & Description</th>
              <th className="py-2.5 px-3 text-center">Weight (%)</th>
              <th className="py-2.5 px-3 text-center">Score (1 - 5)</th>
              <th className="py-2.5 px-3 text-right">Weighted Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {dimensions.map((d) => (
              <tr key={d.id} className="hover:bg-muted/50">
                <td className="py-2.5 px-3 font-bold text-primary">{d.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground font-sans">{d.description}</td>
                <td className="py-2.5 px-3 text-center font-bold">{d.weightPct}%</td>
                <td className="py-2.5 px-3 text-center">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={d.score}
                    onChange={(e) => handleScoreChange(d.id, parseInt(e.target.value))}
                    className="w-24 accent-primary cursor-pointer align-middle"
                  />
                  <span className="ml-2 font-bold text-foreground">{d.score}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-success">
                  {(d.score * (d.weightPct / 100)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
