'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { GeneratedScenarioStudio } from '@/app/api/ai/scenario-studio/route';
import { Sparkles, Wand2, Play, Sliders, CheckCircle2, RefreshCw, Activity, Layers } from 'lucide-react';

const INITIAL_STUDIO_SCENARIO: GeneratedScenarioStudio = {
  scenarioName: 'High Inflation & GCC Logistics Bottleneck Scenario',
  narrativeDescription: 'Synthesizes elevated operational costs (+12%) alongside strong e-commerce volume demand (+15%) and a 1.25% interest rate hike.',
  multipliers: {
    investmentMultiplier: 1.08,
    operatingBenefitMultiplier: 1.15,
    operatingCostMultiplier: 1.12,
    discountRate: 0.1275,
  },
  triangularDistribution: {
    minBenefitMultiplier: 0.85,
    modeBenefitMultiplier: 1.15,
    maxBenefitMultiplier: 1.45,
  },
  keyAssumptions: [
    'Order throughput scales to 18,500 picks/day under automated picking.',
    'DEWA energy tariff capped via 3-year solar PPA contract.',
  ],
  macroRiskFactors: [
    'GCC inflation rate spikes to 4.2% in 2026.',
    'Swisslog AMR equipment delivery lead time extended by 4 weeks.',
  ],
};

export default function AiScenarioStudioPage() {
  const { updateCustomScenarioSliders, setScenario } = useFinancialStore();
  const [promptText, setPromptText] = useState('High inflation with 15% increase in picking demand and DEWA tariff hike');
  const [loading, setLoading] = useState(false);
  const [generatedScenario, setGeneratedScenario] = useState<GeneratedScenarioStudio>(INITIAL_STUDIO_SCENARIO);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setLoading(true);
    setApplied(false);
    try {
      const res = await fetch('/api/ai/scenario-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: promptText }),
      });

      if (!res.ok) throw new Error('Failed to generate scenario');
      const data: GeneratedScenarioStudio = await res.json();
      setGeneratedScenario(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyCustomScenario = () => {
    if (!generatedScenario) return;
    updateCustomScenarioSliders({
      investmentMultiplier: generatedScenario.multipliers.investmentMultiplier,
      operatingBenefitMultiplier: generatedScenario.multipliers.operatingBenefitMultiplier,
      operatingCostMultiplier: generatedScenario.multipliers.operatingCostMultiplier,
      discountRate: generatedScenario.multipliers.discountRate,
    });
    setScenario('Custom');
    setApplied(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Generative AI Scenario Studio & Distribution Fitter
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Describe custom macro conditions in natural language to synthesize custom scenario multipliers and Monte Carlo distribution curves.
          </p>
        </div>
      </div>

      {/* Generator Prompt Panel */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
              Enter Natural Language Macro Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., Simulate 2027 GCC logistics boom with 15% DEWA tariff escalation..."
                className="flex-1 bg-background text-sm px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <button
                type="submit"
                disabled={loading || !promptText.trim()}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md shrink-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Synthesize Scenario
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Sample Prompts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
          <span className="text-[11px] font-bold text-muted-foreground">Try Presets:</span>
          {[
            'GCC E-Commerce Boom (+20% volume, low hurdle rate)',
            'Global Supply Chain Inflation (+15% CapEx, high OpEx)',
            'Dubai South Logistics Hub Incentive (-10% lease rate)',
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPromptText(preset);
              }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-muted hover:bg-card border border-border text-foreground transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Result */}
      {generatedScenario && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 rounded-xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Synthesized AI Scenario</span>
                <h3 className="text-xl font-black text-foreground mt-0.5">{generatedScenario.scenarioName}</h3>
              </div>
              <button
                onClick={applyCustomScenario}
                disabled={applied}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md shrink-0 disabled:opacity-50"
              >
                {applied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Active in Custom Model!
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" /> Apply to Model Custom Sliders
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed">{generatedScenario.narrativeDescription}</p>

            {/* Generated Multipliers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-background/60 p-3 rounded-lg border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">CapEx Outlay Multiplier</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{generatedScenario.multipliers.investmentMultiplier.toFixed(2)}x</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Operating Benefit Multiplier</span>
                <p className="text-lg font-bold text-emerald-500 mt-0.5">{generatedScenario.multipliers.operatingBenefitMultiplier.toFixed(2)}x</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Operating Cost Multiplier</span>
                <p className="text-lg font-bold text-rose-500 mt-0.5">{generatedScenario.multipliers.operatingCostMultiplier.toFixed(2)}x</p>
              </div>
              <div className="bg-background/60 p-3 rounded-lg border border-border text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">WACC Discount Rate</span>
                <p className="text-lg font-bold text-primary mt-0.5">{(generatedScenario.multipliers.discountRate * 100).toFixed(1)}%</p>
              </div>
            </div>

            {/* Triangular Distribution */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-purple-500" /> Fitted Monte Carlo Triangular Distribution
              </h4>
              <div className="flex items-center justify-around bg-background/50 p-3 rounded-lg border border-border text-xs font-mono">
                <div>Minimum: <strong className="text-foreground">{generatedScenario.triangularDistribution.minBenefitMultiplier.toFixed(2)}x</strong></div>
                <div>Mode (Peak): <strong className="text-primary">{generatedScenario.triangularDistribution.modeBenefitMultiplier.toFixed(2)}x</strong></div>
                <div>Maximum: <strong className="text-emerald-500">{generatedScenario.triangularDistribution.maxBenefitMultiplier.toFixed(2)}x</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
