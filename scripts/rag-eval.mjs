#!/usr/bin/env node
/**
 * Retrieval evaluation report.
 *
 *   pnpm rag:eval              measure at the default top-K
 *   pnpm rag:eval --k 3,6,12   compare several
 *
 * Separate from `tests/ragEval.test.ts`, which asserts floors and answers
 * "did this regress". This one prints the detail and answers "did that change
 * help" — the question you have while tuning RRF_K, CANDIDATE_DEPTH or the
 * chunker, and the one a pass/fail assertion cannot.
 *
 * With no embedding provider configured the dense stage is skipped and this
 * measures the lexical fallback. That is worth measuring in its own right:
 * it is the path every request takes whenever the provider is unreachable,
 * and the state of a fresh clone.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const kArg = args[args.indexOf('--k') + 1];
const ks = args.includes('--k') && kArg ? kArg.split(',').map(Number) : [6];

/**
 * Run inside vitest rather than importing directly.
 *
 * The retriever imports a 684 KB JSON corpus through the `@/` alias and reads
 * `node:sqlite` transitively; reproducing vitest's resolution in a plain node
 * script means duplicating config that will drift. Borrowing the runner is
 * less clever and stays correct.
 */
const harness = path.join(ROOT, 'tests', '__rag_eval_run.test.ts');
const out = path.join(ROOT, '.rag-eval-output.json');

writeFileSync(
  harness,
  `import { describe, it } from 'vitest';
import { evaluateRetrieval, formatReport } from '@/lib/rag/evaluate';
import { writeFileSync } from 'node:fs';

describe('rag-eval', () => {
  it('runs', async () => {
    const reports = [];
    for (const k of ${JSON.stringify(ks)}) {
      const r = await evaluateRetrieval({ topK: k });
      reports.push({ k, text: formatReport(r), recall: r.recallAtK, mrr: r.mrr, p1: r.precisionAt1, semantic: r.semanticUsed });
    }
    writeFileSync(${JSON.stringify(out)}, JSON.stringify(reports, null, 1));
  }, 180000);
});
`
);

try {
  // One command string rather than an args array: passing args with
  // shell:true is deprecated (DEP0190) because they are concatenated
  // unescaped. Nothing here is user-supplied, but the warning is noise in
  // every report and the fix is free.
  const result = spawnSync(
    `pnpm exec vitest run "${harness}" --silent`,
    {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: 'false' },
    }
  );

  if (!existsSync(out)) {
    console.error('Evaluation did not produce a report.');
    console.error(result.stdout?.slice(-2000) ?? '');
    console.error(result.stderr?.slice(-2000) ?? '');
    process.exit(1);
  }

  const reports = JSON.parse((await import('node:fs')).readFileSync(out, 'utf8'));

  for (const r of reports) {
    console.log(`\n${'='.repeat(64)}`);
    console.log(r.text);
  }

  if (reports.length > 1) {
    console.log(`\n${'='.repeat(64)}\nComparison\n`);
    console.log('   K   recall   P@1     MRR');
    for (const r of reports) {
      console.log(
        `  ${String(r.k).padStart(2)}   ` +
          `${(r.recall * 100).toFixed(1).padStart(5)}%  ` +
          `${(r.p1 * 100).toFixed(1).padStart(5)}%  ` +
          `${r.mrr.toFixed(3)}`
      );
    }
  }

  if (!reports[0]?.semantic) {
    console.log(
      '\nNote: measured on the lexical stage only — no embedding provider is ' +
        'configured, so these numbers describe the fallback path rather than ' +
        'the hybrid retriever a keyed deployment uses.'
    );
  }
} finally {
  if (existsSync(harness)) unlinkSync(harness);
  if (existsSync(out)) unlinkSync(out);
}
