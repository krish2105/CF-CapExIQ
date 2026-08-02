import { normalize } from './vectors';

/**
 * Query embedding against the provider's OpenAI-compatible /embeddings route.
 *
 * Measured round trip on this deployment is ~430ms. That is affordable next to
 * a ~2s time-to-first-token, but only if it can never become the reason an
 * answer stalls — so every call is bounded by `timeoutMs` and the caller is
 * expected to degrade to lexical-only retrieval rather than wait.
 */

export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5';

/**
 * Query-embedding cache. The sample prompts and the handful of questions a
 * reviewer actually asks repeat constantly during a demo, and a hit removes
 * the 430ms round trip entirely. Bounded so a long session cannot grow it
 * without limit.
 */
const CACHE_LIMIT = 256;
const queryCache = new Map<string, Float32Array>();

function cacheGet(key: string): Float32Array | undefined {
  const hit = queryCache.get(key);
  if (hit) {
    // Refresh recency for the LRU eviction below.
    queryCache.delete(key);
    queryCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: Float32Array) {
  if (queryCache.size >= CACHE_LIMIT) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) queryCache.delete(oldest);
  }
  queryCache.set(key, value);
}

export function isEmbeddingConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && !key.includes('your-openai-api-key') && !key.includes('here'));
}

/**
 * Embed a batch of texts. `inputType` matters for asymmetric retrieval models
 * such as nv-embedqa: passages and queries are projected differently, and
 * mixing them up measurably degrades ranking.
 */
export async function embedTexts(
  texts: string[],
  inputType: 'query' | 'passage',
  timeoutMs = 20000
): Promise<number[][] | null> {
  if (!isEmbeddingConfigured()) return null;

  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseURL.replace(/\/+$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts, input_type: inputType }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: Array<{ index: number; embedding: number[] }> };
    if (!Array.isArray(json.data)) return null;

    // The API does not guarantee response order matches request order.
    const ordered: number[][] = new Array(texts.length);
    for (const row of json.data) ordered[row.index] = normalize(row.embedding);
    return ordered.every(Boolean) ? ordered : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embed one query, with cache. Returns null on any failure or timeout so the
 * retriever can fall through to BM25 instead of surfacing an error.
 */
export async function embedQuery(text: string, timeoutMs = 900): Promise<Float32Array | null> {
  const key = text.trim().toLowerCase();
  const cached = cacheGet(key);
  if (cached) return cached;

  const vectors = await embedTexts([text], 'query', timeoutMs);
  if (!vectors || !vectors[0]) return null;

  const vec = Float32Array.from(vectors[0]);
  cacheSet(key, vec);
  return vec;
}
