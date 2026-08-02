/**
 * Retrieval-augmented generation over the CapExIQ corpus.
 *
 * The advisory assistant previously received nothing but the current metric
 * block, so any question about methodology, data provenance or model
 * limitations was answered from the model's own priors — confidently, and with
 * no way for a reader to check it. Every answer now cites the document it came
 * from.
 */

export type SourceKind =
  | 'methodology'
  | 'assumption'
  | 'governance'
  | 'limitation'
  | 'data-source'
  | 'guide'
  | 'scenario'
  | 'live-model';

export interface KnowledgeChunk {
  id: string;
  /** Human-readable citation label, e.g. "docs/FINANCIAL_METHODOLOGY.md". */
  source: string;
  /** Heading path within the source, e.g. "Discounting > MIRR". */
  section: string;
  kind: SourceKind;
  /** In-app route or file path a reader can open to verify the claim. */
  href?: string;
  /**
   * Permission a reader must hold to be shown this passage. Absent means any
   * authenticated user. Stamped at build time by
   * `src/lib/rag/chunkPermissions.ts` — retrieval filters on it so the
   * assistant cannot become a way around the RBAC matrix.
   */
  permission?: string;
  text: string;
}

export interface EmbeddedChunk extends KnowledgeChunk {
  /** L2-normalised embedding, base64-encoded Float32Array. */
  vector?: string;
}

export interface KnowledgeBaseFile {
  model: string;
  dimensions: number;
  builtAt: string;
  chunks: EmbeddedChunk[];
}

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  /** Fused rank score. Higher is better; not a probability. */
  score: number;
  lexicalRank: number | null;
  semanticRank: number | null;
}

/** Citation shipped to the client alongside the streamed answer. */
export interface Citation {
  /** 1-based index the model is told to cite as [n]. */
  n: number;
  source: string;
  section: string;
  kind: SourceKind;
  href?: string;
  /** Short extract, for the "why this source" disclosure. */
  snippet: string;
}
