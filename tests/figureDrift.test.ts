import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_FINANCIAL_ASSUMPTIONS } from '@/lib/data/defaultAssumptions';
import { evaluateAllScenarios } from '@/lib/finance/scenarios';
import kb from '@/lib/rag/knowledge-base.json';

/**
 * Documentation must not contradict the engine.
 *
 * WHY THIS EXISTS
 *
 * The corpus carried two whole generations of stale figures — a base-case NPV
 * of AED 9.18M in the deliverables and 4.68M in the Q&A handbook — against an
 * engine that computes 12.08M. Both were written when they were true and were
 * never revisited when the model moved.
 *
 * That is worse here than in an ordinary project, because the advisory
 * assistant retrieves these documents and quotes them **with citations**. A
 * reader asking "what is the NPV?" got a confident, sourced, wrong answer, and
 * the citation made it more credible rather than less.
 *
 * Correcting the numbers once fixes today. This test is what stops it
 * recurring: the moment an assumption changes and moves the model, every
 * document asserting the old headline figure fails the build.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK
 *
 * Only the headline scenario metrics, which are derivable from the engine and
 * therefore verifiable. Sensitivity tables, Monte Carlo distributions and
 * illustrative worked examples contain many other figures this cannot confirm
 * — asserting on those would mean encoding a second, unverified source of
 * truth in a test file, which is the problem rather than the fix.
 */

const truth = evaluateAllScenarios(DEFAULT_FINANCIAL_ASSUMPTIONS) as unknown as Record<
  string,
  { metrics: { npv: number; irr: number; mirr: number } }
>;

const ROOT = path.resolve(__dirname, '..');

/**
 * Files that legitimately quote superseded figures.
 *
 * `AUDIT_FINDINGS.md` records the discrepancy itself — its whole subject is
 * that the documents said 9.18M while the engine said 12.08M. "Correcting" it
 * would delete the finding it exists to report.
 */
const EXEMPT = [/AUDIT_FINDINGS\.md$/, /figureDrift\.test\.ts$/];

const DOCS = [
  'docs/DEMO_SCRIPT.md',
  'docs/AUDIT_FINDINGS.md',
  'deliverables/01_individual_report_structure.md',
  'deliverables/02_presentation_deck_structure.md',
  'deliverables/03_live_demonstration_script.md',
  'deliverables/04_financial_model_reconciliation.md',
  'deliverables/CapExIQ_Complete_Project_Guide_and_QnA.md',

  /*
   * The generators, which were the blind spot.
   *
   * `scripts/generate-pdf.js` used to hold its own copy of the guide's prose
   * — 29 superseded figures — and rendered that instead of reading the
   * markdown. Correcting the .md therefore did nothing to the PDF, and
   * regenerating would have reintroduced every figure this suite exists to
   * remove. A third copy of the numbers is exactly the drift the guard is
   * for, and it was not looking at scripts/ at all.
   */
  'scripts/generate-pdf.js',
  'scripts/generate-board-report.js',
].filter((f) => !EXEMPT.some((re) => re.test(f)));

/** Base-case NPV in millions, to two decimals, as the documents write it. */
const baseNpvM = (truth.Base.metrics.npv / 1e6).toFixed(2);
const optNpvM = (truth.Optimistic.metrics.npv / 1e6).toFixed(2);
const pessNpvM = Math.abs(truth.Pessimistic.metrics.npv / 1e6).toFixed(2);

/**
 * Superseded values, kept explicit rather than inferred.
 *
 * A test that flagged "any number near the words Net Present Value" would fire
 * on every worked example and sensitivity row in the corpus. Naming the
 * generations that were actually wrong keeps the signal honest, and adding to
 * this list is the deliberate act of recording that a figure has moved.
 */
const SUPERSEDED_NPV = ['9.18', '4.68', '15.42', '2.14'];

describe('the engine is the source of truth', () => {
  it('still produces the figures the documents were corrected to', () => {
    // If this fails, the model moved and the documents need regenerating —
    // which is the whole point of the test below.
    expect(baseNpvM).toBe('12.08');
    expect(optNpvM).toBe('19.01');
    expect(pessNpvM).toBe('4.94');
  });
});

describe('no document asserts a superseded headline NPV', () => {
  it.each(DOCS)('%s', (relative) => {
    const source = readFileSync(path.join(ROOT, relative), 'utf8');

    const offenders = SUPERSEDED_NPV.filter((value) => {
      // Only where the figure is presented as an NPV, so an unrelated 2.14
      // elsewhere in a table does not trip this.
      const re = new RegExp(
        `(NPV|[Nn]et [Pp]resent [Vv]alue)[^.\\n|]{0,80}${value.replace('.', '\\.')}` +
          `|${value.replace('.', '\\.')}\\s*(M|Million)[^.\\n|]{0,40}(NPV|[Nn]et [Pp]resent [Vv]alue)`
      );
      return re.test(source);
    });

    expect(offenders).toEqual([]);
  });
});

describe('the retrieved corpus agrees with the engine', () => {
  const chunks = (kb as {
    chunks: Array<{ id: string; source: string; section: string; text: string }>;
  }).chunks;

  it('contains no superseded headline NPV', () => {
    // This is the one that matters most: these chunks are what the assistant
    // quotes back to a reader, with a citation attached.
    const offenders = chunks
      .filter((c) =>
        SUPERSEDED_NPV.some((v) =>
          new RegExp(
            `(NPV|[Nn]et [Pp]resent [Vv]alue)[^.\\n|]{0,80}${v.replace('.', '\\.')}`
          ).test(c.text)
        )
      )
      .map((c) => `${c.source} > ${c.id}`);

    expect(offenders).toEqual([]);
  });

  /**
   * Section headings matter more than body text, not less: the heading is the
   * citation label rendered beside an answer. One survived the first pass of
   * this correction precisely because the check only looked at `text` --
   * "Q3: ... why is AED 4.68 Million a good result?" was being shown to
   * readers as the source of a figure that had been corrected everywhere else.
   */
  it('contains no superseded figure in a section heading', () => {
    const offenders = chunks
      .filter((c) => SUPERSEDED_NPV.some((v) => c.section.includes(v)))
      .map((c) => c.section);
    expect(offenders).toEqual([]);
  });

  it('states the current base-case NPV where it states one at all', () => {
    const mentions = chunks.filter((c) => /base.{0,30}(NPV|[Nn]et [Pp]resent)/i.test(c.text));
    // Not asserting every chunk carries it — only that those which do are right.
    for (const chunk of mentions) {
      const figures = [...chunk.text.matchAll(/([0-9]+\.[0-9]{2})\s*(M|Million)/gi)].map((m) => m[1]);
      for (const f of figures) {
        expect(SUPERSEDED_NPV).not.toContain(f);
      }
    }
  });
});
