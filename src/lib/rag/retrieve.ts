import { Bm25Index } from './bm25';
import { embedQuery } from './embed';
import { decodeVector, dot } from './vectors';
import type { Citation, EmbeddedChunk, KnowledgeBaseFile, RetrievedChunk } from './types';
import knowledgeBaseJson from './knowledge-base.json';

/**
 * Hybrid retrieval: BM25 ∪ dense vectors, fused by Reciprocal Rank Fusion.
 *
 * RRF rather than a weighted score blend because the two stages produce scores
 * on incomparable scales (unbounded BM25 vs. cosine in [-1,1]); normalising
 * them against each other needs per-corpus tuning that would silently rot.
 * RRF only consumes rank order, so it stays correct as the corpus grows.
 */

const RRF_K = 60;
/** Chunks handed to the model. Six ≈ 3k tokens of context on this corpus. */
const DEFAULT_TOP_K = 6;
/** Candidates pulled from each stage before fusion. */
const CANDIDATE_DEPTH = 20;

const kb = knowledgeBaseJson as unknown as KnowledgeBaseFile;

const chunkById = new Map<string, EmbeddedChunk>(kb.chunks.map((c) => [c.id, c]));

// Built once per server process — the index is pure derived data over a static
// corpus, so rebuilding it per request would be wasted work on every question.
const bm25 = new Bm25Index(kb.chunks);

const vectorCache = new Map<string, Float32Array>();
function vectorFor(chunk: EmbeddedChunk): Float32Array | null {
  if (!chunk.vector) return null;
  let v = vectorCache.get(chunk.id);
  if (!v) {
    v = decodeVector(chunk.vector);
    vectorCache.set(chunk.id, v);
  }
  return v;
}

export function knowledgeBaseStats() {
  return {
    chunks: kb.chunks.length,
    embedded: kb.chunks.filter((c) => c.vector).length,
    model: kb.model,
    builtAt: kb.builtAt,
  };
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** False when the dense stage was skipped or timed out. */
  semanticUsed: boolean;
  tookMs: number;
}

export async function retrieve(query: string, topK = DEFAULT_TOP_K): Promise<RetrievalResult> {
  const started = Date.now();

  // Lexical first and unconditionally — it is sub-millisecond and guarantees a
  // non-empty result even if the provider is unreachable.
  const lexical = bm25.search(query, CANDIDATE_DEPTH);
  const lexicalRank = new Map<string, number>();
  lexical.forEach((r, i) => lexicalRank.set(r.id, i + 1));

  const queryVector = await embedQuery(query);
  const semanticRank = new Map<string, number>();

  if (queryVector) {
    const sims: Array<{ id: string; sim: number }> = [];
    for (const chunk of kb.chunks) {
      const v = vectorFor(chunk);
      if (!v) continue;
      sims.push({ id: chunk.id, sim: dot(queryVector, v) });
    }
    sims.sort((a, b) => b.sim - a.sim);
    sims.slice(0, CANDIDATE_DEPTH).forEach((r, i) => semanticRank.set(r.id, i + 1));
  }

  const ids = new Set([...lexicalRank.keys(), ...semanticRank.keys()]);
  const fused: RetrievedChunk[] = [];

  for (const id of ids) {
    const chunk = chunkById.get(id);
    if (!chunk) continue;
    const lr = lexicalRank.get(id) ?? null;
    const sr = semanticRank.get(id) ?? null;
    const score = (lr ? 1 / (RRF_K + lr) : 0) + (sr ? 1 / (RRF_K + sr) : 0);
    fused.push({ chunk, score, lexicalRank: lr, semanticRank: sr });
  }

  fused.sort((a, b) => b.score - a.score);

  return {
    chunks: fused.slice(0, topK),
    semanticUsed: semanticRank.size > 0,
    tookMs: Date.now() - started,
  };
}

/** Numbered context block the model is instructed to cite as [n]. */
export function buildContextBlock(retrieved: RetrievedChunk[]): string {
  return retrieved
    .map((r, i) => `[${i + 1}] ${r.chunk.source} — ${r.chunk.section}\n${r.chunk.text}`)
    .join('\n\n');
}

export function toCitations(retrieved: RetrievedChunk[]): Citation[] {
  return retrieved.map((r, i) => ({
    n: i + 1,
    source: r.chunk.source,
    section: r.chunk.section,
    kind: r.chunk.kind,
    href: r.chunk.href,
    snippet: r.chunk.text.length > 220 ? `${r.chunk.text.slice(0, 217)}…` : r.chunk.text,
  }));
}
