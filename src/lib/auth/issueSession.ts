import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from './session';
import { roleLabel } from './permissions';
import { createSession } from '@/lib/db/repositories/sessions';
import { recordAudit } from '@/lib/db/repositories/audit';
import { clientKey } from '@/lib/guardrails/aiGuardrails';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Issue a session and set the cookie.
 *
 * Extracted because there are now two ways to finish signing in — password
 * alone, or password followed by a second factor — and both must produce
 * exactly the same session, row and audit entry. Two copies of this would
 * drift, and the copy that drifted would be the one that forgot to write the
 * `sessions` row, which is what makes sign-out enforceable.
 */
export interface IssuedUser {
  id: string;
  name: string;
  title: string;
  email: string;
  role: ExecutiveRole;
}

export async function issueSessionResponse(
  req: Request,
  user: IssuedUser,
  options: { mfaUsed?: 'totp' | 'recovery' | null } = {}
): Promise<NextResponse> {
  const sessionId = randomUUID();
  const { token, iat, exp } = await signSession({
    sub: user.id,
    name: user.name,
    role: user.role,
    jti: sessionId,
    typ: 'session',
  });

  // Written before the cookie is handed out, so a token can never exist
  // without a record that can revoke it.
  createSession({
    id: sessionId,
    userId: user.id,
    issuedAt: new Date(iat * 1000).toISOString(),
    expiresAt: new Date(exp * 1000).toISOString(),
    ip: clientKey(req),
    userAgent: req.headers.get('user-agent')?.slice(0, 400) ?? null,
  });

  recordAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'auth.login',
    entity: 'session',
    entityId: sessionId,
    // Which factor completed the sign-in is exactly what an incident review
    // asks about, and it cannot be reconstructed after the fact.
    summary:
      `${user.name} signed in as ${user.role}` +
      (options.mfaUsed === 'totp'
        ? ' with a second factor'
        : options.mfaUsed === 'recovery'
          ? ' using a recovery code'
          : ''),
    ip: clientKey(req),
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      title: user.title,
      email: user.email,
      role: user.role,
      roleLabel: roleLabel(user.role),
    },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  return res;
}
