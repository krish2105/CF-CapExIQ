import type { KnowledgeChunk } from './types';

/**
 * Okapi BM25 lexical retrieval.
 *
 * This is the floor of the hybrid retriever, not a fallback of last resort:
 * it costs well under a millisecond and it is the only stage that reliably
 * matches exact financial vocabulary — "MIRR", "AED 375,000", "Stage Gate 4".
 * Dense embeddings routinely blur those into their nearest neighbours, so the
 * two stages fail in different directions and are fused rather than ranked.
 */

const K1 = 1.5;
const B = 0.75;

/** Words carrying no retrieval signal in a corpus that is entirely about one project. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have', 'how',
  'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your', 'we', 'our',
  'can', 'do', 'does', 'if', 'so', 'than', 'then', 'there', 'these', 'those', 'about',
]);

/**
 * Domain expansion. A user asking "what's the payback" and a document saying
 * "discounted payback period" share no stem, so the query is widened with
 * known synonyms before scoring. Expansion is one-directional per entry and
 * applied to the query only — expanding documents would flatten IDF.
 */
const SYNONYMS: Record<string, string[]> = {
  npv: ['net', 'present', 'value', 'discounted'],
  irr: ['internal', 'rate', 'return'],
  mirr: ['modified', 'internal', 'rate', 'return', 'reinvestment'],
  wacc: ['weighted', 'average', 'cost', 'capital', 'discount', 'hurdle'],
  pi: ['profitability', 'index'],
  payback: ['break', 'even', 'recovery', 'period'],
  capex: ['capital', 'expenditure', 'outlay', 'investment'],
  opex: ['operating', 'cost', 'expense'],
  nwc: ['working', 'capital'],
  roi: ['return', 'investment'],
  risk: ['sensitivity', 'volatility', 'downside', 'exposure'],
  hurdle: ['discount', 'wacc', 'threshold'],
  savings: ['benefit', 'saving', 'efficiency'],
  tax: ['corporate', 'taxation'],
  salvage: ['terminal', 'residual', 'resale'],
  robot: ['robotics', 'automation', 'amr'],
  assumption: ['assumptions', 'input', 'parameter'],
  source: ['provenance', 'citation', 'reference'],
  limitation: ['limitations', 'caveat', 'weakness'],
  montecarlo: ['monte', 'carlo', 'simulation', 'probabilistic'],
  scenario: ['scenarios', 'case', 'optimistic', 'pessimistic'],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // Keep digits attached to their magnitude ("24m", "11.5") — the corpus is
    // full of figures and splitting them destroys the match.
    .replace(/[^a-z0-9.%]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.%]+|[.%]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function expandQuery(tokens: string[]): string[] {
  const out = [...tokens];
  for (const t of tokens) {
    const extra = SYNONYMS[t];
    if (extra) out.push(...extra);
  }
  return out;
}

interface IndexedDoc {
  id: string;
  length: number;
  freq: Map<string, number>;
}

export class Bm25Index {
  private docs: IndexedDoc[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;

  constructor(chunks: KnowledgeChunk[]) {
    for (const c of chunks) {
      // Heading text is repeated so a chunk whose *title* matches outranks one
      // that merely mentions the term in passing.
      const tokens = tokenize(`${c.section} ${c.section} ${c.source} ${c.text}`);
      const freq = new Map<string, number>();
      for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
      for (const t of freq.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ id: c.id, length: tokens.length, freq });
    }
    this.avgLength = this.docs.reduce((n, d) => n + d.length, 0) / Math.max(1, this.docs.length);
  }

  /** Ranked chunk ids, best first. */
  search(query: string, limit: number): Array<{ id: string; score: number }> {
    const terms = expandQuery(tokenize(query));
    if (terms.length === 0) return [];

    const N = this.docs.length;
    const scored: Array<{ id: string; score: number }> = [];

    for (const doc of this.docs) {
      let score = 0;
      for (const term of terms) {
        const f = doc.freq.get(term);
        if (!f) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const norm = f * (K1 + 1);
        const denom = f + K1 * (1 - B + (B * doc.length) / this.avgLength);
        score += idf * (norm / denom);
      }
      if (score > 0) scored.push({ id: doc.id, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}
