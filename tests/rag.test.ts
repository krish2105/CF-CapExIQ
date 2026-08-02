import { describe, it, expect } from 'vitest';
import { Bm25Index, tokenize, expandQuery } from '@/lib/rag/bm25';
import { encodeVector, decodeVector, normalize, dot } from '@/lib/rag/vectors';
import type { KnowledgeChunk } from '@/lib/rag/types';

const CHUNKS: KnowledgeChunk[] = [
  {
    id: 'a',
    source: 'docs/FINANCIAL_METHODOLOGY.md',
    section: 'Discounting > MIRR',
    kind: 'methodology',
    text: 'Modified internal rate of return assumes interim cash flows are reinvested at the company WACC rather than at the project IRR.',
  },
  {
    id: 'b',
    source: 'Assumptions Register',
    section: 'Tax > UAE corporate tax',
    kind: 'assumption',
    text: 'Simplified UAE corporate tax rate is 0.09. Provenance: UAE Ministry of Finance. Applies above the AED 375,000 threshold.',
  },
  {
    id: 'c',
    source: 'docs/MODEL_LIMITATIONS.md',
    section: 'Limitations',
    kind: 'limitation',
    text: 'The model excludes financing cash flows and treats the discount rate as constant across all six years.',
  },
];

describe('bm25 lexical retrieval', () => {
  const index = new Bm25Index(CHUNKS);

  it('drops stop words but keeps figures', () => {
    const t = tokenize('What is the AED 375,000 threshold?');
    expect(t).toContain('aed');
    expect(t).toContain('375');
    expect(t).not.toContain('the');
    expect(t).not.toContain('what');
  });

  it('expands domain acronyms so a query matches spelled-out prose', () => {
    const expanded = expandQuery(tokenize('mirr'));
    expect(expanded).toEqual(expect.arrayContaining(['modified', 'internal', 'rate', 'return']));
  });

  it('ranks the MIRR methodology chunk first for an acronym-only query', () => {
    const hits = index.search('mirr', 3);
    expect(hits[0].id).toBe('a');
  });

  it('finds the tax assumption by its provenance, not just its value', () => {
    const hits = index.search('where does the corporate tax rate come from', 3);
    expect(hits[0].id).toBe('b');
  });

  it('returns nothing for a query with no overlapping terms', () => {
    expect(index.search('zzz', 3)).toHaveLength(0);
  });
});

describe('vector codec', () => {
  it('round-trips a float32 vector through base64', () => {
    const values = normalize([0.5, -0.25, 0.125, 2]);
    const decoded = decodeVector(encodeVector(values));
    expect(decoded).toHaveLength(4);
    values.forEach((v, i) => expect(decoded[i]).toBeCloseTo(v, 6));
  });

  it('normalises to unit length so cosine reduces to a dot product', () => {
    const v = normalize([3, 4]);
    expect(Math.hypot(v[0], v[1])).toBeCloseTo(1, 9);
  });

  it('scores an identical vector at 1 and an orthogonal one at 0', () => {
    const a = decodeVector(encodeVector(normalize([1, 0])));
    const b = decodeVector(encodeVector(normalize([0, 1])));
    expect(dot(a, a)).toBeCloseTo(1, 5);
    expect(dot(a, b)).toBeCloseTo(0, 5);
  });

  it('survives a non-aligned Buffer offset from the pool', () => {
    // Buffer.from(base64) frequently lands on an unaligned pool offset; the
    // decoder must copy rather than create a view, or this throws.
    const values = normalize(Array.from({ length: 1024 }, (_, i) => Math.sin(i)));
    const decoded = decodeVector(encodeVector(values));
    expect(decoded).toHaveLength(1024);
    expect(dot(decoded, decoded)).toBeCloseTo(1, 4);
  });
});
