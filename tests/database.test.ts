import { describe, it, expect, beforeEach } from 'vitest';
import { getDb, transaction, migrate } from '@/lib/db/client';
import { resetDatabase } from '@/test/db';
import { MIGRATIONS } from '@/lib/db/migrations';
import { recordAudit, listAudit, countAudit } from '@/lib/db/repositories/audit';
import { signApproval, listApprovals, verifyApproval, snapshotHash } from '@/lib/db/repositories/approvals';
import { createSession, isSessionActive, revokeSession, revokeAllForUser } from '@/lib/db/repositories/sessions';
import { seedUsers, findByEmail, findById, countUsers } from '@/lib/db/repositories/users';
import { issueTestSession } from '@/test/session';

beforeEach(resetDatabase);

describe('migrations', () => {
  it('applies every migration and records the version', () => {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS n FROM schema_migrations')
      .get() as { n: number };
    expect(row.n).toBe(MIGRATIONS.length);
  });

  it('is idempotent — a second run applies nothing', () => {
    const result = migrate(getDb());
    expect(result.applied).toEqual([]);
  });

  it('enforces foreign keys', () => {
    expect(() =>
      getDb()
        .prepare('INSERT INTO sessions (id, user_id, issued_at, expires_at) VALUES (?, ?, ?, ?)')
        .run('s1', 'nonexistent-user', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')
    ).toThrow();
  });

  it('enforces STRICT column types', () => {
    // Without STRICT, SQLite stores "not-a-number" in an INTEGER column.
    expect(() =>
      getDb()
        .prepare('INSERT INTO audit_events (id, occurred_at, action, entity, summary) VALUES (?, ?, ?, ?, ?)')
        .run('not-a-number', '2026-01-01T00:00:00Z', 'auth.login', 'session', 'x')
    ).toThrow();
  });
});

describe('audit trail is append-only', () => {
  beforeEach(() => {
    recordAudit({ action: 'auth.login', entity: 'session', summary: 'signed in' });
  });

  it('records events', () => {
    expect(countAudit()).toBe(1);
    expect(listAudit().events[0].summary).toBe('signed in');
  });

  it('refuses UPDATE at the database level', () => {
    expect(() =>
      getDb().prepare('UPDATE audit_events SET summary = ? WHERE id = 1').run('rewritten')
    ).toThrow(/append-only/);
  });

  it('refuses DELETE at the database level', () => {
    expect(() => getDb().prepare('DELETE FROM audit_events WHERE id = 1').run()).toThrow(
      /append-only/
    );
  });

  it('never throws into the caller when a write fails', () => {
    // A logging failure must not take down the action being logged.
    expect(() =>
      recordAudit({ action: 'auth.login', entity: 'session', summary: 'x', actorUserId: 'ghost' })
    ).not.toThrow();
  });

  it('paginates and filters', () => {
    for (let i = 0; i < 10; i++) {
      recordAudit({ action: 'assumption.changed', entity: 'assumption', summary: `edit ${i}` });
    }
    const page = listAudit({ limit: 4 });
    expect(page.events).toHaveLength(4);
    expect(page.total).toBe(11);

    const filtered = listAudit({ action: 'assumption.changed' });
    expect(filtered.total).toBe(10);
  });
});

describe('sessions and revocation', () => {
  it('an issued session is active', async () => {
    const { sessionId } = await issueTestSession('CFO');
    expect(isSessionActive(sessionId)).toBe(true);
  });

  it('revocation takes effect immediately', async () => {
    const { sessionId } = await issueTestSession('CFO');
    expect(revokeSession(sessionId)).toBe(true);
    expect(isSessionActive(sessionId)).toBe(false);
  });

  it('fails closed on an unknown session id', () => {
    // A token whose row is missing is forged, or from a replaced database.
    expect(isSessionActive('no-such-session')).toBe(false);
    expect(isSessionActive(undefined)).toBe(false);
  });

  it('treats an expired session as inactive even if never revoked', async () => {
    const { userId } = await issueTestSession('CFO');
    createSession({
      id: 'expired-1',
      userId,
      issuedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-01-01T08:00:00.000Z',
    });
    expect(isSessionActive('expired-1')).toBe(false);
  });

  it('revokes every live session for a user', async () => {
    const first = await issueTestSession('CFO', { userId: 'u-shared' });
    const second = await issueTestSession('CFO', { userId: 'u-shared' });

    expect(revokeAllForUser('u-shared')).toBe(2);
    expect(isSessionActive(first.sessionId)).toBe(false);
    expect(isSessionActive(second.sessionId)).toBe(false);
  });

  it('revoking twice reports no further change', async () => {
    const { sessionId } = await issueTestSession('CFO');
    expect(revokeSession(sessionId)).toBe(true);
    expect(revokeSession(sessionId)).toBe(false);
  });
});

describe('approvals', () => {
  async function sign(note?: string) {
    const { userId } = await issueTestSession('CFO');
    return signApproval({
      userId,
      role: 'CFO',
      decision: 'APPROVED',
      scenario: 'Base',
      metrics: { npv: 12_080_000, irr: 0.263 },
      assumptions: { discountRate: 0.115 },
      note: note ?? null,
    });
  }

  it('records the signer, the decision and a snapshot hash', async () => {
    const record = await sign();
    expect(record.decidedByRole).toBe('CFO');
    expect(record.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(listApprovals()).toHaveLength(1);
  });

  it('writes the audit event in the same transaction', async () => {
    await sign();
    const events = listAudit({ action: 'approval.signed' });
    expect(events.total).toBe(1);
  });

  it('is immutable once signed', async () => {
    const record = await sign();
    expect(() =>
      getDb().prepare('UPDATE approvals SET decision = ? WHERE id = ?').run('REJECTED', record.id)
    ).toThrow(/immutable/);
    expect(() => getDb().prepare('DELETE FROM approvals WHERE id = ?').run(record.id)).toThrow(
      /immutable/
    );
  });

  it('verifies its own snapshot hash', async () => {
    const record = await sign();
    expect(verifyApproval(record.id)).toEqual({ ok: true });
  });

  it('hashes independently of key order', () => {
    const a = snapshotHash({ metrics: { npv: 1, irr: 2 }, assumptions: {}, scenario: 'Base' });
    const b = snapshotHash({ metrics: { irr: 2, npv: 1 }, assumptions: {}, scenario: 'Base' });
    // JSON.stringify preserves insertion order, so without canonicalisation
    // these would differ and an untampered record would look altered.
    expect(a).toBe(b);
  });

  it('produces a different hash for different figures', () => {
    const a = snapshotHash({ metrics: { npv: 1 }, assumptions: {}, scenario: 'Base' });
    const b = snapshotHash({ metrics: { npv: 2 }, assumptions: {}, scenario: 'Base' });
    expect(a).not.toBe(b);
  });
});

describe('user directory', () => {
  const seeds = [
    {
      id: 'u-test',
      email: 'Test@NovaRetail.example',
      name: 'Test User',
      title: 'Tester',
      role: 'CFO' as const,
      passwordHash: 'pbkdf2$210000$dGVzdA$__SEED__',
    },
  ];

  it('seeds an empty table', () => {
    expect(seedUsers(seeds).inserted).toBe(1);
    expect(countUsers()).toBe(1);
  });

  it('never overwrites a populated table', () => {
    seedUsers(seeds);
    // An operator who disabled an account or changed a role must not have it
    // silently restored by the next deploy.
    expect(seedUsers(seeds).inserted).toBe(0);
  });

  it('looks up case-insensitively', () => {
    seedUsers(seeds);
    expect(findByEmail('test@novaretail.example')?.id).toBe('u-test');
    expect(findByEmail('  TEST@NOVARETAIL.EXAMPLE  ')?.id).toBe('u-test');
  });

  it('hides disabled accounts from sign-in but keeps them resolvable', () => {
    seedUsers(seeds);
    getDb().prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      'u-test'
    );

    expect(findByEmail('test@novaretail.example')).toBeUndefined();
    // Still resolvable by id: a historical approval must remain attributable.
    expect(findById('u-test')?.name).toBe('Test User');
  });
});

describe('transactions', () => {
  it('rolls back every write on a throw', () => {
    const before = countAudit();
    expect(() =>
      transaction((db) => {
        db.prepare(
          'INSERT INTO audit_events (occurred_at, action, entity, summary) VALUES (?, ?, ?, ?)'
        ).run(new Date().toISOString(), 'auth.login', 'session', 'should not survive');
        throw new Error('boom');
      })
    ).toThrow('boom');

    expect(countAudit()).toBe(before);
  });
});
