import { describe, it, expect } from 'vitest';
import { evaluateRetrieval, answerEvalAvailable, formatReport } from '@/lib/rag/evaluate';
import { EVAL_QUESTIONS } from '@/lib/rag/evalSet';
import { retrieve } from '@/lib/rag/retrieve';
import kb from '@/lib/rag/knowledge-base.json';

const chunkIds = new Set(
  (kb as { chunks: Array<{ id: string }> }).chunks.map((c) => c.id)
);

/**
 * Thresholds are set from a measured baseline, not chosen first.
 *
 * On the lexical-only path (no embedding provider, which is the state of a
 * fresh clone) the current corpus and question set produce recall@6 of 80%,
 * precision@1 of 35% and MRR 0.517. These floors sit just under that: high
 * enough that a real regression in chunking, tokenisation or fusion fails the
 * build, low enough not to fail on noise from one reworded question.
 *
 * Picking round numbers first and then adjusting until they passed would make
 * the assertion a description of whatever the code happens to do, which is the
 * failure mode these guards exist to prevent elsewhere in this repo.
 */
const FLOOR_RECALL_AT_6 = 0.75;
const FLOOR_PRECISION_AT_1 = 0.3;
const FLOOR_MRR = 0.45;

describe('the golden set is valid', () => {
  it('references only chunks that exist', () => {
    // A question pointing at a deleted chunk can never be hit, so it silently
    // drags every metric down and looks like a retrieval regression.
    const dangling = EVAL_QUESTIONS.flatMap((q) =>
      q.expected.filter((id) => !chunkIds.has(id)).map((id) => `${q.id} -> ${id}`)
    );
    expect(dangling).toEqual([]);
  });

  it('has a unique id per question', () => {
    const ids = EVAL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is large enough for the metrics to mean anything', () => {
    expect(EVAL_QUESTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('does not simply quote its target passages', async () => {
    // A set written by copying distinctive phrases out of each chunk scores
    // near-perfectly by construction and measures nothing.
    const report = await evaluateRetrieval();
    expect(report.precisionAt1).toBeLessThan(0.95);
  }, 60_000);
});

describe('retrieval quality', () => {
  it('meets the recall floor', async () => {
    const report = await evaluateRetrieval();
    // Printed on failure so a regression names the questions that broke
    // rather than only the number that moved.
    if (report.recallAtK < FLOOR_RECALL_AT_6) console.log('\n' + formatReport(report));
    expect(report.recallAtK).toBeGreaterThanOrEqual(FLOOR_RECALL_AT_6);
  }, 60_000);

  it('meets the ranking floors', async () => {
    const report = await evaluateRetrieval();
    if (report.mrr < FLOOR_MRR) console.log('\n' + formatReport(report));
    expect(report.precisionAt1).toBeGreaterThanOrEqual(FLOOR_PRECISION_AT_1);
    expect(report.mrr).toBeGreaterThanOrEqual(FLOOR_MRR);
  }, 60_000);

  it('improves, or at least does not degrade, with a deeper K', async () => {
    // Recall is monotonic in K by definition. If it is not, fusion or
    // deduplication is dropping results as the window grows.
    const [six, twelve] = await Promise.all([
      evaluateRetrieval({ topK: 6 }),
      evaluateRetrieval({ topK: 12 }),
    ]);
    expect(twelve.recallAtK).toBeGreaterThanOrEqual(six.recallAtK);
  }, 90_000);

  it('returns something for every question', async () => {
    // An empty result set is worse than a wrong one: the model then answers
    // from its priors with no context to contradict it.
    const report = await evaluateRetrieval();
    for (const r of report.results) expect(r.retrieved.length).toBeGreaterThan(0);
  }, 60_000);
});

describe('evaluation respects the permission filter', () => {
  it('withholds restricted passages from a role that lacks them', async () => {
    const restricted = EVAL_QUESTIONS.filter((q) => q.requires);
    expect(restricted.length).toBeGreaterThan(0);

    for (const q of restricted) {
      // CEO holds ai.advisory but not metrics.advanced.
      const asCeo = await retrieve(q.question, 'CEO');
      const ids = asCeo.chunks.map((c) => c.chunk.id);
      // The metrics.advanced passage must not appear, however well it scores.
      expect(ids).not.toContain('docs/FINANCIAL_METHODOLOGY.md#1');
    }
  }, 60_000);

  it('still answers the same question for a role that holds them', async () => {
    const analyst = await retrieve('Why is MIRR lower than IRR?', 'Analyst');
    expect(analyst.chunks.length).toBeGreaterThan(0);
  }, 60_000);
});

describe('answer-level evaluation', () => {
  /**
   * Deliberately reported rather than silently skipped.
   *
   * Faithfulness, citation correctness and appropriate hedging cannot be
   * measured without a provider and a judge model. Leaving that unstated would
   * let "the RAG evaluation passes" be read as "the answers are good", which
   * is a stronger claim than anything here supports.
   */
  it('states whether it could run at all', () => {
    const available = answerEvalAvailable();
    if (!available) {
      console.log(
        '[rag-eval] answer-level evaluation SKIPPED — no OPENAI_API_KEY. ' +
          'Retrieval is measured; faithfulness and citation quality are not.'
      );
    }
    expect(typeof available).toBe('boolean');
  });
});
