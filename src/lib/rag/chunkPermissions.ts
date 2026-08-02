import type { Permission } from '@/lib/auth/permissions';

/**
 * Permission classification for corpus chunks.
 *
 * WHY THIS EXISTS
 *
 * Route-level RBAC decided which *pages* a role could open, but retrieval
 * ignored role entirely and `/api/ai/explain` is reachable by everyone
 * holding `ai.advisory` — which is every role. So a CTO, explicitly denied
 * `funding.view` at the route, could ask the assistant about the funding
 * structure and get it back with citations. The retriever was a way around
 * the access-control matrix that the matrix did not know about.
 *
 * HOW IT CLASSIFIES, AND WHY NOT BY KEYWORD
 *
 * Matching keywords against chunk *body text* was tried and abandoned: an
 * architecture overview that name-drops "funding", "vendor" and "cash flow"
 * in one paragraph would be restricted three ways over, and a reader asking
 * "how is this app built?" would be refused. Classification is therefore by
 * document and *section heading* — what a passage is about — with an explicit
 * table rather than inference.
 *
 * DEFAULT IS OPEN, DELIBERATELY
 *
 * An unclassified chunk is readable by any authenticated user. This corpus is
 * overwhelmingly project methodology, limitations and governance narrative —
 * material every executive should be able to interrogate, and the honest
 * reason the assistant is useful. Defaulting to deny would gut it to protect
 * documents that carry nothing privileged.
 *
 * That default is safe only while ingestion is first-party. The moment user
 * documents enter the corpus, they must be stamped at ingestion with the
 * permission of whoever supplied them, not fall through to open. See
 * `docs/AI_GOVERNANCE.md`.
 */

interface Rule {
  /** Matched against `${source} > ${section}`. */
  match: RegExp;
  permission: Permission;
  why: string;
}

/**
 * Ordered; first match wins. Narrow patterns first, so a specific section is
 * not captured by a broader document-level rule.
 */
const RULES: Rule[] = [
  {
    // `\bMIRR\b` rather than "IRR & MIRR": the real heading is
    // "3. Internal Rate of Return (IRR) & MIRR", and the parenthesis defeated
    // the tighter pattern. In a section *heading* the bare term is already a
    // strong enough signal — it is a title, not prose that mentions it once.
    match: /(\bMIRR\b|difference between IRR|Profitability Index|discounted payback)/i,
    permission: 'metrics.advanced',
    why: 'Analyst-grade metric definitions — CEO/COO/CTO lenses omit these figures.',
  },
  {
    match: /(Free Cash Flow Reconciliation|Year-by-Year|Cash-Flow Schedule|cash flow schedule)/i,
    permission: 'financials.schedule',
    why: 'The itemised schedule itself, not the formula behind it.',
  },
  {
    match: /(funding structure|debt (structure|tranche)|gearing|DSCR|green loan|liquidity position)/i,
    permission: 'funding.view',
    why: 'Capital structure and lender terms — out of lens for COO and CTO.',
  },
  {
    match: /(RFP|negotiat|vendor quotation|commercial terms)/i,
    permission: 'vendor.negotiate',
    why: 'Commercially sensitive procurement positioning.',
  },
];

/**
 * The permission a chunk requires, or `null` for "any authenticated user".
 */
export function permissionForChunk(chunk: {
  source: string;
  section: string;
  href?: string;
}): Permission | null {
  const subject = `${chunk.source} > ${chunk.section}`;

  for (const rule of RULES) {
    if (rule.match.test(subject)) return rule.permission;
  }

  // An in-app href is a stronger signal than prose: a chunk that points at a
  // gated route describes that route's content by construction.
  if (chunk.href === '/funding') return 'funding.view';
  if (chunk.href === '/financial-model') return 'financials.schedule';
  if (chunk.href === '/rfp-negotiator') return 'vendor.negotiate';

  return null;
}

/** Explanation for a classification, for the build script's report. */
export function reasonForChunk(chunk: { source: string; section: string }): string | null {
  const subject = `${chunk.source} > ${chunk.section}`;
  return RULES.find((r) => r.match.test(subject))?.why ?? null;
}
