import type { FinancialAssumptions } from '../types/finance';

/**
 * Automatic formula selection.
 *
 * Named in the assessment brief's own list of AI feature examples, and the one
 * capital-budgeting mistake that is both common and invisible: applying the
 * right arithmetic to the wrong comparison. NPV ranks correctly only when the
 * alternatives share a horizon and the capital budget is unconstrained. Change
 * either condition and NPV silently gives the wrong ranking while remaining
 * perfectly well computed.
 *
 * This module inspects the decision context and states which measure governs,
 * which is merely informative, and why. The rules are deterministic and
 * auditable; the AI layer explains the selection in prose but does not choose.
 */

export interface FormulaAdvice {
  /** The measure that should decide the question. */
  primary: string;
  /** Measures that inform but must not decide it. */
  secondary: string[];
  /** Measures that would actively mislead in this context, and why. */
  cautions: Array<{ measure: string; reason: string }>;
  /** Plain-language statement of the rule being applied. */
  rationale: string;
}

export interface DecisionContext {
  /** More than one project competing for the same money. */
  comparingAlternatives: boolean;
  /** Alternatives run for different numbers of years. */
  unequalLives: boolean;
  /** The capital budget binds — not everything acceptable can be funded. */
  capitalRationed: boolean;
  /** The cash-flow sign changes more than once. */
  nonConventionalCashFlows: boolean;
  /** Liquidity, not value, is the binding constraint. */
  liquidityConstrained: boolean;
}

/** Count sign changes in the cash-flow stream — the multiple-IRR condition. */
export function countSignChanges(cashFlows: number[]): number {
  let changes = 0;
  let previous = 0;
  for (const cf of cashFlows) {
    const sign = Math.sign(cf);
    if (sign === 0) continue;
    if (previous !== 0 && sign !== previous) changes++;
    previous = sign;
  }
  return changes;
}

export function deriveContext(
  assumptions: FinancialAssumptions,
  cashFlows: number[],
  opts: { comparingAlternatives?: boolean; unequalLives?: boolean; capitalRationed?: boolean } = {}
): DecisionContext {
  return {
    comparingAlternatives: opts.comparingAlternatives ?? false,
    unequalLives: opts.unequalLives ?? false,
    capitalRationed: opts.capitalRationed ?? false,
    nonConventionalCashFlows: countSignChanges(cashFlows) > 1,
    liquidityConstrained: assumptions.projectLifeYears <= 3,
  };
}

/**
 * Select the governing measure for a decision context.
 *
 * Order matters: unequal lives is checked before capital rationing because an
 * unequal-life comparison invalidates the PI ranking that rationing would
 * otherwise call for.
 */
export function selectFormula(ctx: DecisionContext): FormulaAdvice {
  const cautions: FormulaAdvice['cautions'] = [];

  if (ctx.nonConventionalCashFlows) {
    cautions.push({
      measure: 'Internal rate of return',
      reason:
        'The cash-flow stream changes sign more than once, so the IRR polynomial may have multiple real roots. Any single reported IRR is one root among several and cannot be compared against a hurdle rate.',
    });
  }

  if (ctx.comparingAlternatives && ctx.unequalLives) {
    return {
      primary: 'Equivalent annual annuity (EAA)',
      secondary: ['Net present value', 'Profitability index'],
      cautions: [
        ...cautions,
        {
          measure: 'Net present value',
          reason:
            'NPV is biased toward the longer-lived alternative simply because it accumulates cash over more years. It is not comparable across unequal horizons without annualising.',
        },
      ],
      rationale:
        'The alternatives run for different numbers of years, so total present value is not a like-for-like comparison. Convert each NPV to the level annual amount it is equivalent to, then compare those.',
    };
  }

  if (ctx.comparingAlternatives && ctx.capitalRationed) {
    return {
      primary: 'Profitability index',
      secondary: ['Net present value', 'Internal rate of return'],
      cautions: [
        ...cautions,
        {
          measure: 'Net present value',
          reason:
            'Under a binding capital constraint, ranking by absolute NPV selects large projects that exhaust the budget and can leave total portfolio value lower than a set of smaller, denser ones.',
        },
      ],
      rationale:
        'The budget binds, so the question is value per dirham committed rather than value in total. Rank by profitability index, then confirm the selected set against the constraint.',
    };
  }

  if (ctx.liquidityConstrained) {
    return {
      primary: 'Net present value',
      secondary: ['Discounted payback period', 'Internal rate of return'],
      cautions: [
        ...cautions,
        {
          measure: 'Simple payback period',
          reason:
            'Payback ignores the time value of money and everything after the payback point. It is a liquidity screen, never a value measure, and must not decide the question on its own.',
        },
      ],
      rationale:
        'Liquidity is the binding constraint, so recovery timing matters — but value still governs. Decide on NPV and use discounted payback to check the exposure window is tolerable.',
    };
  }

  return {
    primary: 'Net present value',
    secondary: ['Internal rate of return', 'Modified IRR', 'Profitability index', 'Discounted payback'],
    cautions: [
      ...cautions,
      {
        measure: 'Internal rate of return',
        reason:
          'IRR assumes interim cash flows are reinvested at the project’s own return, which overstates realistic performance. MIRR corrects this by reinvesting at the cost of capital.',
      },
    ],
    rationale:
      'A single project with a conventional cash-flow pattern and no binding budget constraint. NPV measures the absolute value created after compensating capital providers and governs the accept-or-reject decision directly.',
  };
}
