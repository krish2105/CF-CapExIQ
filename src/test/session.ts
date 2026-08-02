import { randomUUID } from 'node:crypto';
import { signSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/client';
import { createSession } from '@/lib/db/repositories/sessions';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Mint a token together with the `sessions` row it refers to.
 *
 * Both are required now that authorisation checks revocation: a signed token
 * with no row is, correctly, not a usable session. Tests that only signed a
 * token would be asserting against a path no real caller takes.
 */
export async function issueTestSession(
  role: ExecutiveRole,
  options: { userId?: string; revoked?: boolean } = {}
): Promise<{ token: string; sessionId: string; userId: string }> {
  const userId = options.userId ?? `u-${role.toLowerCase().replace(/\s+/g, '-')}`;
  const sessionId = randomUUID();
  const db = getDb();

  // The FK on sessions.user_id is real, so the user has to exist first.
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, name, title, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    `${userId}@test.example`,
    `Test ${role}`,
    `Test ${role}`,
    role,
    'pbkdf2$210000$dGVzdA$__SEED__',
    new Date().toISOString()
  );

  const { token, iat, exp } = await signSession({
    sub: userId,
    name: `Test ${role}`,
    role,
    jti: sessionId,
  });

  createSession({
    id: sessionId,
    userId,
    issuedAt: new Date(iat * 1000).toISOString(),
    expiresAt: new Date(exp * 1000).toISOString(),
  });

  if (options.revoked) {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      sessionId
    );
  }

  return { token, sessionId, userId };
}
