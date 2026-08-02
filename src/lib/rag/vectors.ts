/**
 * Embeddings are persisted as base64-encoded Float32Arrays rather than JSON
 * number arrays: the corpus is ~1024 dimensions per chunk, and the textual
 * form costs roughly 8x the bytes and has to be re-parsed on every cold start.
 */

export function encodeVector(values: number[]): string {
  const f32 = Float32Array.from(values);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength).toString('base64');
}

export function decodeVector(b64: string): Float32Array {
  const buf = Buffer.from(b64, 'base64');
  // Copy rather than view: Buffer instances come from a shared pool whose
  // byteOffset is rarely 4-byte aligned, which Float32Array rejects.
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(buf);
  return new Float32Array(copy);
}

/** L2-normalise in place so cosine similarity reduces to a dot product. */
export function normalize(values: number[]): number[] {
  let sum = 0;
  for (const v of values) sum += v * v;
  const mag = Math.sqrt(sum);
  if (mag === 0) return values;
  return values.map((v) => v / mag);
}

/** Dot product of two already-normalised vectors. */
export function dot(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}
