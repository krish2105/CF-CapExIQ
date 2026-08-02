import { getDb } from '../client';

/**
 * Session records — the point of which is revocation.
 *
 * The cookie is a signed HMAC carrying `sub`, `role` and `exp`. That is
 * self-contained by design, which is why it verifies at the edge with no
 * lookup — and also why, before this table, "sign out" could not actually
 * invalidate anything. Clearing the cookie removes the browser's copy; a
 * token already captured stayed valid for the remainder of its eight hours.
 *
 * Each session now has a row keyed by the token's `jti`, and revoking sets
 * `revoked_at`. The cost is a database read on the paths that check it.
 *
 * WHERE THE CHECK CAN AND CANNOT RUN
 *
 * Not in middleware. `src/middleware.ts` runs on the Edge runtime, where
 * `node:sqlite` does not exist, so middleware necessarily stays
 * signature-and-expiry only. Revocation is enforced at the Node boundary —
 * `requirePermission` for every API route, and the root layout for pages.
 *
 * The residual gap is honest and worth stating: a revoked cookie still
 * satisfies middleware, so it can still cause a page shell to be routed. It
 * cannot load data, reach any API, or resolve a role, because those all run in
 * Node and consult this table. Closing the gap entirely means either an
 * edge-readable store or accepting a lookup at the edge.
 */

export interface SessionRecord {
  id: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface SessionRow {
  id: string;
  user_id: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export function createSession(input: {
  id: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  ip?: string | null;
  userAgent?: string | null;
}): void {
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, issued_at, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.userId,
      input.issuedAt,
      input.expiresAt,
      input.ip ?? null,
      input.userAgent ?? null
    );
}

/**
 * Is this session still usable?
 *
 * Fails closed on an unknown id. A token whose row is missing is either
 * forged, or issued by a deployment whose database has since been replaced —
 * neither is a session this process should honour.
 *
 * Sessions issued before this table existed will therefore be rejected once,
 * and the user signs in again. That is the correct trade for making revocation
 * real, and it is a one-time cost at deploy.
 */
export function isSessionActive(id: string | undefined, now = new Date()): boolean {
  if (!id) return false;

  const row = getDb()
    .prepare('SELECT revoked_at, expires_at FROM sessions WHERE id = ?')
    .get(id) as { revoked_at: string | null; expires_at: string } | undefined;

  if (!row) return false;
  if (row.revoked_at) return false;
  return new Date(row.expires_at) > now;
}

export function revokeSession(id: string): boolean {
  const result = getDb()
    .prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), id);
  return Number(result.changes) > 0;
}

/** Revoke every live session for a user — password change, offboarding. */
export function revokeAllForUser(userId: string): number {
  const result = getDb()
    .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), userId);
  return Number(result.changes);
}

export function listActiveSessions(userId: string): SessionRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, issued_at, expires_at, revoked_at
         FROM sessions
        WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?
        ORDER BY issued_at DESC`
    )
    .all(userId, new Date().toISOString()) as unknown as SessionRow[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    issuedAt: r.issued_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
  }));
}

/**
 * Delete rows that expired more than `days` ago.
 *
 * Expired sessions are already unusable, so retaining them buys nothing
 * operationally — but they are retained briefly rather than immediately so a
 * post-incident question ("what was live at 14:00 on Tuesday?") is still
 * answerable. Not scheduled anywhere yet; wire to a cron when one exists.
 */
export function pruneExpiredSessions(days = 30): number {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const result = getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(cutoff);
  return Number(result.changes);
}
