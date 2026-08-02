'use client';

import React, { useState } from 'react';
import { Calculator, X, BookOpen, ChevronRight } from 'lucide-react';
import { FinancialAssumptions, FinancialMetrics } from '@/lib/types/finance';
import { formatAED, formatPercent } from '@/lib/utils/formatting';

export interface FormulaDetail {
  metricName: string;
  /**
   * Clean Unicode maths. The app has no LaTeX renderer installed, so raw LaTeX source
   * (`\\frac{...}{...}`, `\\sum_{t=1}^{N}`) used to be printed verbatim on screen.
   */
  formulaEquation: string;
  inputBreakdown: string;
  calculatedResult: string;
  explanation: string;
  corporateFinanceInterpretation: string;
}

export type FormulaMetricKey = 'NPV' | 'IRR' | 'MIRR' | 'PI' | 'ROI' | 'PAYBACK';

export const FORMULA_METRIC_KEYS: FormulaMetricKey[] = ['NPV', 'IRR', 'MIRR', 'PI', 'ROI', 'PAYBACK'];

const yearsLabel = (years: number) => `${Math.max(1, Math.round(years))}`;

/**
 * Builds the formula registry from the LIVE model outputs. Nothing here is hardcoded: change an
 * assumption and every equation, input line and result below moves with it.
 */
export function buildFormulaRegistry(
  metrics: FinancialMetrics,
  assumptions: FinancialAssumptions
): Record<FormulaMetricKey, FormulaDetail> {
  const n = yearsLabel(assumptions.projectLifeYears);
  const r = formatPercent(assumptions.discountRate);
  const outlay = formatAED(metrics.totalInitialOutlay);
  const pvInflows = formatAED(metrics.breakEvenInitialInvestment);
  const irrSpread =
    metrics.irr !== null ? `${((metrics.irr - assumptions.discountRate) * 100).toFixed(2)} points` : 'N/A';

  return {
    NPV: {
      metricName: 'Net Present Value (NPV)',
      formulaEquation: 'NPV = -I₀ + Σ FCFₜ ÷ (1 + r)ᵗ    for t = 1 … N',
      inputBreakdown: `Initial outlay I₀ = ${outlay} · hurdle discount rate r = ${r} · project life N = ${n} years · PV of inflows = ${pvInflows}.`,
      calculatedResult: formatAED(metrics.npv),
      explanation:
        'Sum of all discounted after-tax free cash flows from Year 1 to Year N, less the Year-0 capital outlay and working-capital injection.',
      corporateFinanceInterpretation: `Measures net shareholder value created above the ${r} opportunity cost of capital. ${
        metrics.npv >= 0
          ? 'A positive NPV means the project clears its hurdle rate and adds value.'
          : 'A negative NPV means the project destroys value at the current hurdle rate.'
      }`,
    },
    IRR: {
      metricName: 'Internal Rate of Return (IRR)',
      formulaEquation: '0 = -I₀ + Σ FCFₜ ÷ (1 + IRR)ᵗ    for t = 1 … N',
      inputBreakdown: `Initial outlay I₀ = ${outlay} · cash-flow stream Year 1 to Year ${n}.`,
      calculatedResult: formatPercent(metrics.irr),
      explanation:
        'The discount rate at which net present value is exactly zero, solved numerically (Newton-Raphson with a bracketed bisection fallback).',
      corporateFinanceInterpretation:
        metrics.irr === null
          ? 'IRR is undefined for this cash-flow pattern; NPV takes precedence as the decision metric.'
          : `${formatPercent(metrics.irr)} sits ${irrSpread} ${
              metrics.irr >= assumptions.discountRate ? 'above' : 'below'
            } the ${r} WACC hurdle. It is also the break-even discount rate: at ${formatPercent(
              metrics.irr
            )} the NPV of the project is zero.`,
    },
    MIRR: {
      metricName: 'Modified Internal Rate of Return (MIRR)',
      formulaEquation: 'MIRR = (TV of inflows ÷ PV of outflows)^(1 ÷ N) - 1',
      inputBreakdown: `Reinvestment rate = ${formatPercent(
        assumptions.reinvestmentRateMIRR
      )} · financing rate = ${formatPercent(assumptions.financeRateMIRR)} · N = ${n} years.`,
      calculatedResult: formatPercent(metrics.mirr),
      explanation:
        'Compounds every inflow forward to the terminal year at the reinvestment rate and discounts every outflow back to Year 0 at the financing rate, then annualises the ratio.',
      corporateFinanceInterpretation:
        metrics.mirr === null
          ? 'MIRR is undefined for this cash-flow pattern (no financed outflows or no terminal inflows).'
          : 'Removes the standard IRR assumption that interim cash flows are reinvested at the IRR itself, so it is the more conservative ranking metric under capital rationing.',
    },
    PI: {
      metricName: 'Profitability Index (PI)',
      formulaEquation: 'PI = [ Σ FCFₜ ÷ (1 + r)ᵗ ] ÷ I₀',
      inputBreakdown: `PV of cash inflows = ${pvInflows} · initial capital outlay I₀ = ${outlay}.`,
      calculatedResult: `${metrics.profitabilityIndex.toFixed(3)}x`,
      explanation: 'Ratio of the present value of future cash inflows to the initial capital outlay.',
      corporateFinanceInterpretation: `Generates ${formatAED(
        metrics.profitabilityIndex,
        2
      )} of present value for every AED 1.00 of capital committed. Under capital rationing, rank competing projects by PI rather than by absolute NPV.`,
    },
    ROI: {
      metricName: 'Return on Investment (ROI)',
      formulaEquation: 'ROI = (Total net cash flow ÷ I₀) × 100%',
      inputBreakdown: `Total undiscounted inflows = ${formatAED(
        metrics.totalProjectCashInflow
      )} · net cash flow = ${formatAED(metrics.totalProjectNetCashFlow)} · initial outlay I₀ = ${outlay}.`,
      calculatedResult: `${metrics.roiPct.toFixed(1)}%`,
      explanation:
        'Percentage net cash gain relative to the original total initial outlay, before any discounting.',
      corporateFinanceInterpretation:
        'A simple, undiscounted capital-efficiency yardstick. It ignores the timing of cash flows, so it should never override NPV or IRR in the decision.',
    },
    PAYBACK: {
      metricName: 'Payback & Discounted Payback',
      formulaEquation: 'Payback = t* where Σ FCFₜ (t = 0 … t*) ≥ 0',
      inputBreakdown: `Initial outlay I₀ = ${outlay} · discount rate r = ${r} for the discounted variant.`,
      calculatedResult:
        metrics.paybackPeriodYears !== null
          ? `${metrics.paybackPeriodYears.toFixed(2)} yrs (discounted: ${
              metrics.discountedPaybackPeriodYears !== null
                ? `${metrics.discountedPaybackPeriodYears.toFixed(2)} yrs`
                : 'not recovered'
            })`
          : 'Not recovered within the project life',
      explanation:
        'The point at which cumulative cash flow first turns non-negative, interpolated linearly within the recovery year. The discounted variant applies the same test to present values.',
      corporateFinanceInterpretation:
        'A liquidity and risk-exposure measure, not a value measure: it says how long capital is at risk, but ignores everything that happens after recovery.',
    },
  };
}

export const FormulaInspector: React.FC<{
  metricKey: FormulaMetricKey | string;
  metrics: FinancialMetrics;
  assumptions: FinancialAssumptions;
  label?: string;
}> = ({ metricKey, metrics, assumptions, label = 'Formula' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const registry = buildFormulaRegistry(metrics, assumptions);
  const detail = registry[metricKey as FormulaMetricKey] || registry.NPV;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[11px] text-primary hover:underline font-mono inline-flex items-center gap-1 font-semibold"
        title={`Inspect the ${detail.metricName} formula and its live inputs`}
      >
        <Calculator className="h-3 w-3" /> {label} <ChevronRight className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-obsidian/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border text-foreground rounded-card max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> {detail.metricName} Formula Inspector
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-card bg-muted font-mono text-primary text-center">
                {detail.formulaEquation}
              </div>

              <div>
                <span className="font-bold text-foreground">Live Inputs:</span>
                <p className="text-muted-foreground mt-0.5 font-mono">{detail.inputBreakdown}</p>
              </div>

              <div>
                <span className="font-bold text-foreground">Calculated Value:</span>
                <p className="text-primary font-mono font-bold mt-0.5">{detail.calculatedResult}</p>
              </div>

              <div>
                <span className="font-bold text-foreground">Mathematical Explanation:</span>
                <p className="text-muted-foreground mt-0.5">{detail.explanation}</p>
              </div>

              <div className="p-3 rounded-card bg-primary/10 border border-primary/20 text-foreground">
                <span className="font-bold text-primary">Corporate Finance Interpretation:</span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {detail.corporateFinanceInterpretation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
