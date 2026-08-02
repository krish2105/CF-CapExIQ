'use client';

import React, { useState } from 'react';
import { Calculator, X, BookOpen, ChevronRight } from 'lucide-react';

export interface FormulaDetail {
  metricName: string;
  formulaEquation: string;
  inputBreakdown: string;
  calculatedResult: string;
  explanation: string;
  corporateFinanceInterpretation: string;
}

const FORMULA_REGISTRY: Record<string, FormulaDetail> = {
  NPV: {
    metricName: 'Net Present Value (NPV)',
    formulaEquation: 'NPV = -I_0 + \\sum_{t=1}^{N} \\frac{FCF_t}{(1 + r)^t}',
    inputBreakdown: 'Initial Outlay I_0 = AED 24.0M, Hurdle Discount Rate r = 11.5%, Project Life N = 6 Years.',
    calculatedResult: 'AED 12,083,628',
    explanation: 'Sum of all discounted future after-tax free cash flows minus initial capital expenditure.',
    corporateFinanceInterpretation: 'Measures net shareholder value created above the 11.5% opportunity cost of capital. Positive NPV indicates project exceeds hurdle rate.',
  },
  IRR: {
    metricName: 'Internal Rate of Return (IRR)',
    formulaEquation: '0 = -I_0 + \\sum_{t=1}^{N} \\frac{FCF_t}{(1 + IRR)^t}',
    inputBreakdown: 'Initial Outlay I_0 = AED 24.0M, Cash Flow Stream Y1-Y6.',
    calculatedResult: '26.30%',
    explanation: 'Discount rate at which Net Present Value exactly equals zero.',
    corporateFinanceInterpretation: 'Indicates baseline rate of return. Since 26.30% exceeds 11.5% WACC hurdle rate by 14.80%, investment yields strong financial margin of safety.',
  },
  MIRR: {
    metricName: 'Modified Internal Rate of Return (MIRR)',
    formulaEquation: 'MIRR = \\left( \\frac{Terminal\\ Value\\ of\\ Inflows}{Present\\ Value\\ of\\ Outflows} \\right)^{\\frac{1}{N}} - 1',
    inputBreakdown: 'Reinvestment Rate = 11.5% WACC, Financing Rate = 11.5% WACC.',
    calculatedResult: '19.34%',
    explanation: 'Resolves traditional IRR assumption by reinvesting interim cash flows at realistic WACC rate rather than high IRR rate.',
    corporateFinanceInterpretation: 'More realistic measure than standard IRR for capital rationing.',
  },
  PI: {
    metricName: 'Profitability Index (PI)',
    formulaEquation: 'PI = \\frac{\\sum_{t=1}^{N} \\frac{FCF_t}{(1 + r)^t}}{I_0}',
    inputBreakdown: 'PV of Cash Inflows = AED 36.08M, Initial Capital Outlay = AED 24.0M.',
    calculatedResult: '1.504x',
    explanation: 'Ratio of present value of future cash inflows to initial capital outlay.',
    corporateFinanceInterpretation: 'Generates AED 1.50 of present value for every AED 1.00 of capital invested.',
  },
  ROI: {
    metricName: 'Return on Investment (ROI)',
    formulaEquation: 'ROI = \\frac{Total\\ Cumulative\\ Net\\ Cash\\ Flow}{Initial\\ Outlay} \\times 100\\%',
    inputBreakdown: 'Total Cash Inflow = AED 37.56M, Initial Capital Outlay = AED 24.0M.',
    calculatedResult: '56.5%',
    explanation: 'Percentage net cash gain realized relative to original total initial outlay.',
    corporateFinanceInterpretation: 'Evaluates total un-discounted capital efficiency over project lifespan.',
  },
};

export const FormulaInspector: React.FC<{ metricKey: string }> = ({ metricKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const detail = FORMULA_REGISTRY[metricKey] || FORMULA_REGISTRY['NPV'];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[11px] text-primary hover:underline font-mono inline-flex items-center gap-1 font-semibold"
        title="Inspect formula breakdown"
      >
        <Calculator className="h-3 w-3" /> Formula <ChevronRight className="h-3 w-3" />
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
                <span className="font-bold text-foreground">Inputs:</span>
                <p className="text-muted-foreground mt-0.5 font-mono">{detail.inputBreakdown}</p>
              </div>

              <div>
                <span className="font-bold text-foreground">Calculated Value:</span>
                <p className="text-success font-mono font-bold mt-0.5">{detail.calculatedResult}</p>
              </div>

              <div>
                <span className="font-bold text-foreground">Mathematical Explanation:</span>
                <p className="text-muted-foreground mt-0.5">{detail.explanation}</p>
              </div>

              <div className="p-3 rounded-card bg-primary/10 border border-primary/20 text-foreground">
                <span className="font-bold text-primary">Corporate Finance Interpretation:</span>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{detail.corporateFinanceInterpretation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
