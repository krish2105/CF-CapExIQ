#!/usr/bin/env node
/**
 * Builds src/lib/rag/knowledge-base.json — the corpus the advisory assistant
 * retrieves over.
 *
 * Run: node scripts/build-knowledge-base.mjs
 *
 * Embedding happens here, at build time, rather than per request: the corpus
 * is static, and paying ~400ms per chunk on a cold serverless start would
 * dominate the response budget. Only the user's question is embedded live.
 *
 * The script is safe to run without an API key — it emits the same chunks with
 * no vectors, and the retriever degrades to BM25-only.
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/lib/rag/knowledge-base.json');
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';

/** Minimum characters for a chunk to be worth indexing. */
const MIN_CHARS = 120;
/**
 * Split anything longer than this, on paragraph boundaries.
 *
 * nv-embedqa-e5-v5 truncates hard at 512 tokens and returns HTTP 400 rather
 * than silently clipping. Dense financial prose with figures and currency
 * codes tokenises at roughly 1.4 chars/token, so 900 characters plus the
 * prepended heading stays comfortably inside the window.
 */
const MAX_CHARS = 900;
/** Hard ceiling on what is sent to the embedding endpoint. */
const MAX_EMBED_CHARS = 1100;

// ---------------------------------------------------------------- env

async function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    const text = await readFile(p, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
  }
}

// ---------------------------------------------------------------- chunking

/** Split markdown on ## / ### headings, carrying the heading path forward. */
/**
 * Permission classification, mirroring src/lib/rag/chunkPermissions.ts.
 *
 * Duplicated rather than imported because this script is plain ESM run by
 * node with no TypeScript pipeline, and adding one to read four regexes is
 * not a trade worth making. The duplication is held honest by
 * `tests/rag.test.ts`, which re-derives every stamp in the shipped corpus
 * from the TypeScript module and fails if the two ever disagree.
 */
const PERMISSION_RULES = [
  [/(\bMIRR\b|difference between IRR|Profitability Index|discounted payback)/i, 'metrics.advanced'],
  [/(Free Cash Flow Reconciliation|Year-by-Year|Cash-Flow Schedule|cash flow schedule)/i, 'financials.schedule'],
  [/(funding structure|debt (structure|tranche)|gearing|DSCR|green loan|liquidity position)/i, 'funding.view'],
  [/(RFP|negotiat|vendor quotation|commercial terms)/i, 'vendor.negotiate'],
];

const PERMISSION_BY_HREF = {
  '/funding': 'funding.view',
  '/financial-model': 'financials.schedule',
  '/rfp-negotiator': 'vendor.negotiate',
};

/** Returns `{ permission }` or `{}` — spread into the chunk. */
function stampPermission({ source, section, href }) {
  const subject = `${source} > ${section}`;
  for (const [re, permission] of PERMISSION_RULES) {
    if (re.test(subject)) return { permission };
  }
  if (href && PERMISSION_BY_HREF[href]) return { permission: PERMISSION_BY_HREF[href] };
  return {};
}

function chunkMarkdown(markdown, source, kind, href) {
  const lines = markdown.split('\n');
  const chunks = [];
  let h2 = '';
  let h3 = '';
  let buffer = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text.length < MIN_CHARS) return;
    const section = [h2, h3].filter(Boolean).join(' > ') || 'Overview';

    // Long sections are split on blank lines so a chunk never straddles an
    // unrelated topic, which is what makes a retrieved citation checkable.
    if (text.length <= MAX_CHARS) {
      chunks.push({ section, text });
      return;
    }
    let part = [];
    let size = 0;
    for (const para of text.split(/\n{2,}/)) {
      if (size + para.length > MAX_CHARS && part.length) {
        chunks.push({ section, text: part.join('\n\n') });
        part = [];
        size = 0;
      }
      part.push(para);
      size += para.length;
    }
    if (part.join('\n\n').trim().length >= MIN_CHARS) {
      chunks.push({ section, text: part.join('\n\n') });
    }
  };

  for (const line of lines) {
    const m2 = line.match(/^##\s+(.*)$/);
    const m3 = line.match(/^###\s+(.*)$/);
    const m1 = line.match(/^#\s+(.*)$/);
    if (m1) {
      flush();
      h2 = m1[1].trim();
      h3 = '';
    } else if (m2) {
      flush();
      h2 = m2[1].trim();
      h3 = '';
    } else if (m3) {
      flush();
      h3 = m3[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return chunks.map((c, i) => ({
    id: `${source}#${i}`,
    source,
    section: c.section,
    kind,
    href,
    ...stampPermission({ source, section: c.section, href }),
    text: c.text.replace(/\n{3,}/g, '\n\n').trim(),
  }));
}

/**
 * The assumptions register is the highest-value corpus in the project: every
 * row already carries its own provenance, which is exactly what a citation
 * needs. Rendered to prose so the embedding model sees natural language.
 */
async function assumptionChunks() {
  const src = await readFile(path.join(ROOT, 'src/lib/data/defaultAssumptions.ts'), 'utf8');
  const body = src.slice(src.indexOf('DEFAULT_ASSUMPTIONS_REGISTER'));
  const entries = [...body.matchAll(/\{\s*id:\s*'([^']+)',([\s\S]*?)\n\s*\},/g)];

  const field = (block, name) => {
    const m = block.match(new RegExp(`${name}:\\s*'([^']*)'`)) || block.match(new RegExp(`${name}:\\s*([0-9.]+)`));
    return m ? m[1] : '';
  };

  return entries.map(([, id, block]) => {
    const name = field(block, 'name');
    const value = field(block, 'value');
    const unit = field(block, 'unit');
    const category = field(block, 'category');
    const classification = field(block, 'dataClassification');
    const provenance = field(block, 'source');
    const notes = field(block, 'notes');
    const updated = field(block, 'lastUpdated');

    return {
      id: `assumption:${id}`,
      source: 'Assumptions Register',
      section: `${category} > ${name}`,
      kind: 'assumption',
      href: '/assumptions',
      ...stampPermission({
        source: 'Assumptions Register',
        section: `${category} > ${name}`,
        href: '/assumptions',
      }),
      text:
        `${name} (register id ${id}) is set to ${value} ${unit}. ` +
        `Category: ${category}. Data classification: ${classification}. ` +
        `Provenance: ${provenance}. Last updated ${updated}. ${notes}`,
    };
  });
}

/** Scenario multipliers, read from the engine so the corpus cannot drift. */
async function scenarioChunks() {
  const src = await readFile(path.join(ROOT, 'src/lib/finance/scenarios.ts'), 'utf8');
  const defs = [...src.matchAll(
    /(Optimistic|Base|Pessimistic):\s*\{\s*type:[\s\S]*?description:\s*'([^']*)',\s*investmentMultiplier:\s*([\d.]+),\s*operatingBenefitMultiplier:\s*([\d.]+),\s*operatingCostMultiplier:\s*([\d.]+),\s*discountRate:\s*([\d.]+),/g
  )];

  return defs.map(([, name, description, inv, ben, cost, rate]) => ({
    id: `scenario:${name}`,
    source: 'Scenario Engine',
    section: `Scenario definitions > ${name}`,
    kind: 'scenario',
    href: '/scenarios',
    ...stampPermission({
      source: 'Scenario Engine',
      section: `Scenario definitions > ${name}`,
      href: '/scenarios',
    }),
    text:
      `The ${name} scenario applies a capital expenditure multiplier of ${inv}x, an operating ` +
      `benefit multiplier of ${ben}x, an operating cost multiplier of ${cost}x, and a discount ` +
      `rate (hurdle rate / WACC) of ${(Number(rate) * 100).toFixed(1)}%. ${description} ` +
      `Multipliers scale automation equipment, installation, software and training capex; ` +
      `operating savings and contribution margin; and additional operating expenditure respectively.`,
  }));
}

const KIND_BY_DOC = {
  'FINANCIAL_METHODOLOGY.md': 'methodology',
  'MODEL_RECONCILIATION.md': 'methodology',
  'ASSUMPTIONS.md': 'assumption',
  'MODEL_LIMITATIONS.md': 'limitation',
  'DATA_SOURCES.md': 'data-source',
  'AI_GOVERNANCE.md': 'governance',
  'SECURITY.md': 'governance',
  'ACCESSIBILITY.md': 'governance',
  'RUBRIC_MAPPING.md': 'guide',
  'USER_GUIDE.md': 'guide',
  'DEMO_SCRIPT.md': 'guide',
  'ARCHITECTURE.md': 'guide',
  'TESTING.md': 'governance',
  'DEPLOYMENT.md': 'guide',
  'CAPITAL_PORTFOLIO.md': 'methodology',
};

/** Design-system and audit-log docs describe the UI, not the investment case. */
const SKIP_DOCS = new Set(['FRONTEND_DESIGN_SYSTEM.md', 'AUDIT_FINDINGS.md']);

async function collectMarkdown() {
  const out = [];

  const docsDir = path.join(ROOT, 'docs');
  for (const file of await readdir(docsDir)) {
    if (!file.endsWith('.md') || SKIP_DOCS.has(file)) continue;
    const text = await readFile(path.join(docsDir, file), 'utf8');
    out.push(...chunkMarkdown(text, `docs/${file}`, KIND_BY_DOC[file] ?? 'guide'));
  }

  const delDir = path.join(ROOT, 'deliverables');
  if (existsSync(delDir)) {
    for (const file of await readdir(delDir)) {
      if (!file.endsWith('.md')) continue;
      const text = await readFile(path.join(delDir, file), 'utf8');
      out.push(...chunkMarkdown(text, `deliverables/${file}`, 'guide'));
    }
  }

  return out;
}

// ---------------------------------------------------------------- embedding

function l2normalize(values) {
  let sum = 0;
  for (const v of values) sum += v * v;
  const mag = Math.sqrt(sum);
  return mag === 0 ? values : values.map((v) => v / mag);
}

function encodeVector(values) {
  const f32 = Float32Array.from(values);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength).toString('base64');
}

async function embedBatch(texts) {
  const baseURL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const res = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, input_type: 'passage' }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const ordered = new Array(texts.length);
  for (const row of json.data) ordered[row.index] = l2normalize(row.embedding);
  return ordered;
}

// ---------------------------------------------------------------- main

async function main() {
  await loadEnv();

  const chunks = [
    ...(await assumptionChunks()),
    ...(await scenarioChunks()),
    ...(await collectMarkdown()),
  ];

  console.log(`Collected ${chunks.length} chunks from docs, deliverables, assumptions and scenarios.`);

  const key = process.env.OPENAI_API_KEY;
  const canEmbed = Boolean(key && !key.includes('your-openai-api-key') && !key.includes('here'));

  let dimensions = 0;
  if (canEmbed) {
    const BATCH = 32;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      // The heading is prepended so the vector reflects what the passage is
      // *about*, not only the prose inside it.
      const inputs = slice.map((c) => `${c.section}. ${c.text}`.slice(0, MAX_EMBED_CHARS));
      const vectors = await embedBatch(inputs);
      slice.forEach((c, j) => {
        c.vector = encodeVector(vectors[j]);
        dimensions = vectors[j].length;
      });
      console.log(`  embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
    }
  } else {
    console.warn('No API key configured — writing corpus without vectors (BM25-only retrieval).');
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { model: canEmbed ? EMBEDDING_MODEL : 'none', dimensions, builtAt: new Date().toISOString(), chunks },
      null,
      0
    )
  );

  const bytes = (await readFile(OUT)).byteLength;
  console.log(`Wrote ${OUT} — ${chunks.length} chunks, ${dimensions}d, ${(bytes / 1024).toFixed(0)} KB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
