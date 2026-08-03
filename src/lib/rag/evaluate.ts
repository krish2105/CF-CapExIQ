import { retrieve } from './retrieve';
import { EVAL_QUESTIONS, type EvalQuestion } from './evalSet';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Retrieval evaluation.
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT
 *
 * It measures retrieval: given a question, does the passage that answers it
 * come back, and how far up. That is the half of a RAG system this project can
 * check offline and deterministically, and it is the half that governs whether
 * an answer is even possible — a model cannot cite what was never retrieved.
 *
 * It does NOT measure answer quality: faithfulness to the retrieved passages,
 * whether citations point at the sentence they support, or whether the model
 * hedged when the context was thin. Those need a provider and a judge model,
 * are non-deterministic, and cost money per run. `answerEvalAvailable()` below
 * reports whether that second layer could run at all, so the gap is visible
 * rather than implied.
 *
 * WHY IT MATTERS THAT THIS EXISTS
 *
 * `RRF_K`, `CANDIDATE_DEPTH` and `DEFAULT_TOP_K` are tuning knobs, and query
 * expansion is on. Before this, changing any of them was unfalsifiable: there
 * was no way to tell an improvement from a regression, so nobody would touch
 * them and nobody could defend them.
 */

export interface QuestionResult {
  id: string;
  question: string;
  /** 1-based rank of the first expected chunk, or null if never retrieved. */
  rank: number | null;
  hit: boolean;
  retrieved: string[];
  expected: string[];
}

export interface EvalReport {
  questions: number;
  /** Fraction whose answer appeared anywhere in the top K. */
  recallAtK: number;
  /** Fraction whose answer was the single top result. */
  precisionAt1: number;
  /** Mean reciprocal rank — rewards being first, not merely present. */
  mrr: number;
  /** Whether the dense stage contributed; false means BM25-only. */
  semanticUsed: boolean;
  topK: number;
  results: QuestionResult[];
  misses: QuestionResult[];
}

/** Is the second, generation-level evaluation layer runnable in this process? */
export function answerEvalAvailable(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && !key.includes('your-openai-api-key') && !key.includes('here'));
}

export interface EvaluateOptions {
  topK?: number;
  /**
   * Role to retrieve as. Defaults to Analyst, which holds the widest read
   * access — evaluating as a restricted role would score the permission
   * filter rather than the retriever.
   */
  role?: ExecutiveRole;
  questions?: EvalQuestion[];
}

export async function evaluateRetrieval(options: EvaluateOptions = {}): Promise<EvalReport> {
  const topK = options.topK ?? 6;
  const role = options.role ?? 'Analyst';
  const questions = options.questions ?? EVAL_QUESTIONS;

  const results: QuestionResult[] = [];
  let semanticUsed = false;

  for (const q of questions) {
    const result = await retrieve(q.question, role, topK);
    semanticUsed ||= result.semanticUsed;

    const retrieved = result.chunks.map((c) => c.chunk.id);
    // First position at which ANY acceptable chunk appears. Several questions
    // have more than one right answer, and penalising a retriever for
    // returning the other one would measure the question set, not the system.
    const index = retrieved.findIndex((id) => q.expected.includes(id));

    results.push({
      id: q.id,
      question: q.question,
      rank: index === -1 ? null : index + 1,
      hit: index !== -1,
      retrieved,
      expected: q.expected,
    });
  }

  const hits = results.filter((r) => r.hit);

  return {
    questions: results.length,
    recallAtK: hits.length / results.length,
    precisionAt1: results.filter((r) => r.rank === 1).length / results.length,
    mrr: results.reduce((sum, r) => sum + (r.rank ? 1 / r.rank : 0), 0) / results.length,
    semanticUsed,
    topK,
    results,
    misses: results.filter((r) => !r.hit),
  };
}

/** Human-readable report, for tuning runs. */
export function formatReport(report: EvalReport): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines = [
    `Questions      ${report.questions}`,
    `Retrieval      ${report.semanticUsed ? 'hybrid (BM25 + dense)' : 'BM25 only — no embedding provider configured'}`,
    `Top K          ${report.topK}`,
    '',
    `Recall@${report.topK}      ${pct(report.recallAtK)}`,
    `Precision@1    ${pct(report.precisionAt1)}`,
    `MRR            ${report.mrr.toFixed(3)}`,
  ];

  if (report.misses.length) {
    lines.push('', `Missed (${report.misses.length}):`);
    for (const miss of report.misses) {
      lines.push(`  ${miss.id}  "${miss.question}"`);
      lines.push(`     wanted  ${miss.expected.join(', ')}`);
      lines.push(`     got     ${miss.retrieved.slice(0, 4).join(', ')}`);
    }
  }

  const ranked = report.results.filter((r) => r.rank && r.rank > 3);
  if (ranked.length) {
    lines.push('', `Found but ranked low (${ranked.length}):`);
    for (const r of ranked) lines.push(`  #${r.rank}  ${r.id}`);
  }

  return lines.join('\n');
}
