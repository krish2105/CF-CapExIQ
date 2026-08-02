import { createHash, randomUUID } from 'node:crypto';
import { getDb, transaction } from '../client';
import { recordAudit } from './audit';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * The capital decision record.
 *
 * Signing was previously a button that set a boolean in `localStorage`. There
 * was no record of who signed, when, or against which numbers — and the
 * numbers themselves were editable afterwards, so even the boolean did not
 * describe a decision anyone could later defend.
 *
 * Rows are immutable at the database level (triggers in migration 1) and
 * carry the full model snapshot rather than a reference to live assumptions,
 * because an approval that points at mutable state stops meaning anything the
 * moment someone moves a slider.
 */

export interface ApprovalRecord {
  id: string;
  decidedAt: string;
  decidedByUserId: string;
  decidedByRole: string;
  decision: string;
  scenario: string;
  snapshotHash: string;
  metrics: unknown;
  assumptions: unknown;
  note: string | null;
}

interface ApprovalRow {
  id: string;
  decided_at: string;
  decided_by_user_id: string;
  decided_by_role: string;
  decision: string;
  scenario: string;
  snapshot_hash: string;
  metrics_json: string;
  assumptions_json: string;
  note: string | null;
}

/**
 * Stable hash over the signed snapshot.
 *
 * Keys are sorted before hashing: `JSON.stringify` preserves insertion order,
 * so two objects with identical content but different key order would
 * otherwise hash differently and make an untampered record look altered.
 */
export function snapshotHash(input: { metrics: unknown; assumptions: unknown; scenario: string }): string {
  const canonical = JSON.stringify(input, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (value as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return value;
  });

  return createHash('sha256').update(canonical).digest('hex');
}

function toRecord(row: ApprovalRow): ApprovalRecord {
  return {
    id: row.id,
    decidedAt: row.decided_at,
    decidedByUserId: row.decided_by_user_id,
    decidedByRole: row.decided_by_role,
    decision: row.decision,
    scenario: row.scenario,
    snapshotHash: row.snapshot_hash,
    metrics: JSON.parse(row.metrics_json),
    assumptions: JSON.parse(row.assumptions_json),
    note: row.note,
  };
}

export interface SignApprovalInput {
  userId: string;
  role: ExecutiveRole;
  decision: string;
  scenario: string;
  metrics: unknown;
  assumptions: unknown;
  note?: string | null;
  ip?: string | null;
}

/**
 * Sign and lock a decision.
 *
 * The approval row and its audit event are written in one transaction: an
 * approval with no corresponding audit entry is precisely the gap the audit
 * table exists to close, so the two must not be able to diverge.
 */
export function signApproval(input: SignApprovalInput): ApprovalRecord {
  const id = randomUUID();
  const decidedAt = new Date().toISOString();
  const hash = snapshotHash({
    metrics: input.metrics,
    assumptions: input.assumptions,
    scenario: input.scenario,
  });

  return transaction((db) => {
    db.prepare(
      `INSERT INTO approvals
         (id, decided_at, decided_by_user_id, decided_by_role, decision,
          scenario, snapshot_hash, metrics_json, assumptions_json, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      decidedAt,
      input.userId,
      input.role,
      input.decision,
      input.scenario,
      hash,
      JSON.stringify(input.metrics ?? {}),
      JSON.stringify(input.assumptions ?? {}),
      input.note ?? null
    );

    recordAudit({
      actorUserId: input.userId,
      actorRole: input.role,
      action: 'approval.signed',
      entity: 'approval',
      entityId: id,
      summary: `${input.decision} signed under the ${input.scenario} scenario`,
      afterValue: { snapshotHash: hash, decision: input.decision },
      scenario: input.scenario,
      ip: input.ip ?? null,
    });

    return {
      id,
      decidedAt,
      decidedByUserId: input.userId,
      decidedByRole: input.role,
      decision: input.decision,
      scenario: input.scenario,
      snapshotHash: hash,
      metrics: input.metrics,
      assumptions: input.assumptions,
      note: input.note ?? null,
    };
  });
}

export function listApprovals(limit = 50): ApprovalRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM approvals ORDER BY decided_at DESC LIMIT ?')
    .all(Math.min(Math.max(limit, 1), 200)) as unknown as ApprovalRow[];
  return rows.map(toRecord);
}

export function getApproval(id: string): ApprovalRecord | undefined {
  const row = getDb().prepare('SELECT * FROM approvals WHERE id = ?').get(id) as
    | ApprovalRow
    | undefined;
  return row ? toRecord(row) : undefined;
}

/** Recompute the hash and compare — detects tampering at the storage layer. */
export function verifyApproval(id: string): { ok: boolean; reason?: string } {
  const record = getApproval(id);
  if (!record) return { ok: false, reason: 'No such approval.' };

  const recomputed = snapshotHash({
    metrics: record.metrics,
    assumptions: record.assumptions,
    scenario: record.scenario,
  });

  return recomputed === record.snapshotHash
    ? { ok: true }
    : { ok: false, reason: 'Snapshot hash does not match the stored model.' };
}
