import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { permissionForChunk } from '@/lib/rag/chunkPermissions';
import { retrieve } from '@/lib/rag/retrieve';
import { can, ALL_ROLES } from '@/lib/auth/permissions';
import type { Permission } from '@/lib/auth/permissions';
import type { ExecutiveRole } from '@/lib/types/finance';
import kb from '@/lib/rag/knowledge-base.json';

const chunks = (kb as any).chunks as Array<{
  id: string;
  source: string;
  section: string;
  href?: string;
  permission?: string;
}>;

describe('chunk classification', () => {
  it('restricts analyst-grade metric definitions', () => {
    expect(
      permissionForChunk({
        source: 'docs/FINANCIAL_METHODOLOGY.md',
        section: '3. Internal Rate of Return (IRR) & MIRR',
      })
    ).toBe('metrics.advanced');
  });

  it('restricts the cash-flow schedule', () => {
    expect(
      permissionForChunk({
        source: 'deliverables/04_financial_model_reconciliation.md',
        section: '2. Year 1 Free Cash Flow Reconciliation',
      })
    ).toBe('financials.schedule');
  });

  it('restricts by gated href even when the heading is neutral', () => {
    expect(
      permissionForChunk({ source: 'docs/X.md', section: 'Overview', href: '/funding' })
    ).toBe('funding.view');
  });

  /**
   * The reason body text is not classified: an architecture overview
   * name-drops half the domain in one paragraph, and restricting on that
   * refuses "how is this app built?" to nearly everyone.
   */
  it('does not restrict a general document that merely mentions a topic', () => {
    expect(
      permissionForChunk({ source: 'docs/ARCHITECTURE.md', section: 'Architecture Overview' })
    ).toBeNull();
  });
});

describe('shipped corpus is stamped consistently', () => {
  /**
   * The build script duplicates these rules in plain ESM. This re-derives
   * every stamp from the TypeScript module and fails if the two drift.
   */
  it('matches what chunkPermissions.ts would assign', () => {
    const mismatches = chunks
      .map((c) => ({ id: c.id, stamped: c.permission ?? null, expected: permissionForChunk(c) }))
      .filter((r) => r.stamped !== r.expected);

    expect(mismatches).toEqual([]);
  });

  it('stamps only permissions that exist in the matrix', () => {
    const unknown = chunks
      .filter((c) => c.permission)
      .filter((c) => !ALL_ROLES.some((r) => can(r, c.permission as Permission)))
      .map((c) => c.permission);

    expect(unknown).toEqual([]);
  });

  it('keeps the build script and the module in sync', () => {
    const script = readFileSync(
      path.resolve(__dirname, '../scripts/build-knowledge-base.mjs'),
      'utf8'
    );
    const module = readFileSync(
      path.resolve(__dirname, '../src/lib/rag/chunkPermissions.ts'),
      'utf8'
    );

    // Every permission the module can assign must be reachable in the script.
    for (const permission of [
      'metrics.advanced',
      'financials.schedule',
      'funding.view',
      'vendor.negotiate',
    ]) {
      expect(module).toContain(permission);
      expect(script).toContain(permission);
    }
  });
});

describe('retrieval is permission-aware', () => {
  const restricted = chunks.filter((c) => c.permission);

  it('the corpus actually contains restricted material to test against', () => {
    expect(restricted.length).toBeGreaterThan(0);
  });

  it.each(ALL_ROLES)('returns nothing %s may not read', async (role) => {
    // A query aimed squarely at the restricted material.
    const result = await retrieve(
      'explain MIRR profitability index and the year 1 free cash flow reconciliation',
      role as ExecutiveRole
    );

    const leaked = result.chunks
      .map((r) => r.chunk as { id: string; permission?: string })
      .filter((c) => c.permission && !can(role as ExecutiveRole, c.permission as Permission));

    expect(leaked.map((c) => c.id)).toEqual([]);
  });

  it('still surfaces restricted material to a role that holds the permission', async () => {
    const result = await retrieve('what is MIRR and how does it differ from IRR', 'Analyst');
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('withholds it from a role that does not', async () => {
    // CEO holds ai.advisory but not metrics.advanced.
    const result = await retrieve('what is MIRR and how does it differ from IRR', 'CEO');
    const ids = result.chunks.map((r) => (r.chunk as { id: string }).id);
    const advanced = restricted
      .filter((c) => c.permission === 'metrics.advanced')
      .map((c) => c.id);

    for (const id of advanced) expect(ids).not.toContain(id);
  });

  it('fails closed when no role is supplied', async () => {
    const result = await retrieve('MIRR profitability index');
    const leaked = result.chunks.filter((r) => (r.chunk as { permission?: string }).permission);
    expect(leaked).toEqual([]);
  });

  it('still returns a usable answer set to a restricted role', async () => {
    // The filter must not starve the reader: dropping chunks should pull more
    // permitted ones in, not leave holes.
    const ceo = await retrieve('explain the project financial viability', 'CEO');
    expect(ceo.chunks.length).toBeGreaterThan(0);
  });
});
