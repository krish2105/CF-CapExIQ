import type { Permission } from '@/lib/auth/permissions';

/**
 * Golden question set for retrieval evaluation.
 *
 * WHY THESE QUESTIONS LOOK THE WAY THEY DO
 *
 * Each is phrased the way an executive would ask it, not as a keyword echo of
 * the passage it should find. A set written by copying distinctive phrases out
 * of each chunk measures nothing: BM25 scores near-perfectly on it by
 * construction, the numbers look excellent, and the harness reports success on
 * a system that would fail on the first real question. Several deliberately
 * use vocabulary the target chunk does not contain — "hurdle rate" for a
 * passage that says WACC, "written off" for one that says salvage value —
 * because that gap is exactly where retrieval earns its keep.
 *
 * `expected` lists chunk ids that genuinely answer the question. Where more
 * than one does, any of them counts as a hit: a retriever that finds the
 * scenario definition instead of the assumption row has not failed the user.
 */
export interface EvalQuestion {
  id: string;
  question: string;
  /** Chunk ids that answer it. A hit on any one counts. */
  expected: string[];
  /** Restricted material — used to check the permission filter under load. */
  requires?: Permission;
  notes?: string;
}

export const EVAL_QUESTIONS: EvalQuestion[] = [
  // ---- assumption register: direct lookups ----------------------------
  {
    id: 'q-discount-rate',
    question: 'What hurdle rate is the project being judged against?',
    expected: ['assumption:DISCOUNT'],
    notes: 'Says "hurdle rate"; the register row leads with "Discount rate".',
  },
  {
    id: 'q-equipment-cost',
    question: 'How much are we spending on the robots and automation hardware?',
    expected: ['assumption:CAPEX-EQUIP'],
    notes: 'Colloquial "robots" against a row titled "Automation equipment".',
  },
  {
    id: 'q-tax-rate',
    question: 'What corporate tax rate is assumed for the UAE?',
    expected: ['assumption:TAX'],
  },
  {
    id: 'q-salvage',
    question: 'What is the equipment worth at the end of the project?',
    expected: ['assumption:SALVAGE'],
    notes: 'Avoids the word "salvage" entirely.',
  },
  {
    id: 'q-project-life',
    question: 'Over how many years is this investment evaluated?',
    expected: ['assumption:LIFE'],
  },
  {
    id: 'q-working-capital',
    question: 'Do we get the working capital back at the end?',
    expected: ['assumption:NWC-RECOVERY', 'assumption:NWC-INITIAL'],
  },
  {
    id: 'q-savings',
    question: 'How much do we save on operating costs in the first year?',
    expected: ['assumption:SAVE-Y1'],
  },
  {
    id: 'q-opex-growth',
    question: 'Do the additional running costs grow over time?',
    expected: ['assumption:OPEX-GROWTH', 'assumption:OPEX-Y1'],
  },

  // ---- scenarios --------------------------------------------------------
  {
    id: 'q-downside',
    question: 'What happens in the downside case?',
    expected: ['scenario:Pessimistic'],
    notes: '"Downside" never appears in the scenario text, which says Pessimistic.',
  },
  {
    id: 'q-scenario-multipliers',
    question: 'What multipliers does the optimistic scenario apply to capex and benefits?',
    expected: ['scenario:Optimistic'],
  },

  // ---- methodology ------------------------------------------------------
  {
    id: 'q-wacc-formula',
    question: 'How is the cost of capital calculated?',
    expected: ['docs/FINANCIAL_METHODOLOGY.md#2'],
  },
  {
    id: 'q-mirr-vs-irr',
    question: 'Why is MIRR lower than IRR?',
    // Verified against the corpus, not assumed: #1 is the chunk headed
    // "3. Internal Rate of Return (IRR) & MIRR", and it is the one stamped
    // metrics.advanced.
    expected: ['docs/FINANCIAL_METHODOLOGY.md#1', 'docs/MODEL_RECONCILIATION.md#2'],
    requires: 'metrics.advanced',
    notes: 'Restricted: the passages that explain this are metrics.advanced.',
  },
  {
    id: 'q-fcf',
    question: 'How is free cash flow computed in this model?',
    expected: ['docs/FINANCIAL_METHODOLOGY.md#0'],
  },

  // ---- governance and limitations --------------------------------------
  {
    id: 'q-hypothetical',
    question: 'Is NovaRetail a real company?',
    expected: ['docs/MODEL_LIMITATIONS.md#0'],
  },
  {
    id: 'q-scraping',
    question: 'Does this system collect data from other websites?',
    expected: ['docs/DATA_SOURCES.md#0', 'docs/AI_GOVERNANCE.md#1', 'docs/AI_GOVERNANCE.md#0'],
  },
  {
    id: 'q-api-key',
    question: 'Where is the AI provider credential kept?',
    expected: ['docs/AI_GOVERNANCE.md#0', 'docs/SECURITY.md#0'],
  },
  {
    id: 'q-pii',
    question: 'What stops personal data being sent to the model?',
    expected: ['docs/AI_GOVERNANCE.md#1', 'docs/SECURITY.md#1'],
  },
  {
    id: 'q-accessibility',
    question: 'Has this been checked against accessibility standards?',
    expected: ['docs/ACCESSIBILITY.md#0'],
  },

  // ---- data provenance --------------------------------------------------
  {
    id: 'q-electricity',
    question: 'Where do the electricity tariff figures come from?',
    expected: ['docs/DATA_SOURCES.md#0', 'docs/DATA_SOURCES.md#1'],
  },
  {
    id: 'q-reconciliation',
    question: 'Has the engine been checked against Excel?',
    expected: [
      'docs/MODEL_RECONCILIATION.md#0',
      'docs/MODEL_RECONCILIATION.md#1',
      'deliverables/04_financial_model_reconciliation.md#0',
    ],
  },
];
