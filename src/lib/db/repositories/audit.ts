import { getDb } from '../client';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * The durable audit trail.
 *
 * Append-only at the database level (see the triggers in migration 1), so
 * nothing in the application can rewrite history — including this module.
 * There is deliberately no `update` or `delete` export.
 */

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'assumption.changed'
  | 'approval.signed'
  | 'ai.query'
  | 'ai.refused';

export interface AuditEvent {
  id: number;
  occurredAt: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  summary: string;
  beforeValue: string | null;
  afterValue: string | null;
  scenario: string | null;
  ip: string | null;
}

export interface RecordAuditInput {
  actorUserId?: string | null;
  actorRole?: ExecutiveRole | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  scenario?: string | null;
  ip?: string | null;
}

function serialise(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Write one event.
 *
 * Deliberately never throws into the caller's path. An audit write failing
 * must not take down a sign-in or an assumption edit — the correct behaviour
 * is to complete the user's action and make the logging failure loud in the
 * server log, not to refuse the action. That is a judgement call: in a
 * regulated setting the opposite (refuse the action if it cannot be recorded)
 * is often required, and this is the line to change if that applies.
 */
export function recordAudit(input: RecordAuditInput): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_events
           (occurred_at, actor_user_id, actor_role, action, entity, entity_id,
            summary, before_value, after_value, scenario, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        new Date().toISOString(),
        input.actorUserId ?? null,
        input.actorRole ?? null,
        input.action,
        input.entity,
        input.entityId ?? null,
        input.summary,
        serialise(input.beforeValue),
        serialise(input.afterValue),
        input.scenario ?? null,
        input.ip ?? null
      );
  } catch (err) {
    console.error('[audit] failed to record event', input.action, (err as Error).message);
  }
}

export interface AuditQuery {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  actorUserId?: string;
}

interface AuditRow {
  id: number;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  before_value: string | null;
  after_value: string | null;
  scenario: string | null;
  ip: string | null;
}

function toEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action as AuditAction,
    entity: row.entity,
    entityId: row.entity_id,
    summary: row.summary,
    beforeValue: row.before_value,
    afterValue: row.after_value,
    scenario: row.scenario,
    ip: row.ip,
  };
}

/** Most recent first. Paginated — the table only grows. */
export function listAudit(query: AuditQuery = {}): { events: AuditEvent[]; total: number } {
  const db = getDb();
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);

  const filters: string[] = [];
  const params: Array<string> = [];
  if (query.action) {
    filters.push('action = ?');
    params.push(query.action);
  }
  if (query.actorUserId) {
    filters.push('actor_user_id = ?');
    params.push(query.actorUserId);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM audit_events ${where}`).all(...params) as Array<{
    n: number;
  }>;

  const rows = db
    .prepare(
      `SELECT * FROM audit_events ${where} ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as unknown as AuditRow[];

  return { events: rows.map(toEvent), total: total[0]?.n ?? 0 };
}

export function countAudit(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM audit_events').get() as { n: number };
  return row.n;
}
