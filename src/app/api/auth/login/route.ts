import { NextResponse } from 'next/server';
import { findByEmail, verifyPassword } from '@/lib/auth/users';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { checkRateLimit, clientKey } from '@/lib/guardrails/aiGuardrails';
import { roleLabel } from '@/lib/auth/permissions';
import { randomUUID } from 'node:crypto';
import { createSession } from '@/lib/db/repositories/sessions';
import { recordAudit } from '@/lib/db/repositories/audit';

export const runtime = 'nodejs';

/**
 * Sign in.
 *
 * Two deliberate choices worth stating:
 *
 *  - The failure response never distinguishes "no such account" from "wrong
 *    password". Distinguishing them turns the form into an account
 *    enumeration oracle for a directory of named executives.
 *
 *  - PBKDF2 runs even when the email is unknown, against a throwaway hash.
 *    Returning early on an unknown address makes the response measurably
 *    faster and reintroduces the same oracle through timing.
 */
export async function POST(req: Request) {
  const limit = await checkRateLimit(`login:${clientKey(req)}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    /* fall through to the generic failure below */
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const user = findByEmail(email);

  const decoy = {
    id: '',
    email: '',
    name: '',
    title: '',
    role: 'Analyst' as const,
    passwordHash: 'pbkdf2$210000$ZGVjb3ktc2FsdA$__SEED__',
  };
  const ok = await verifyPassword(user ?? decoy, password);

  if (!user || !ok) {
    // Recorded without an actor id: a failed attempt against an unknown
    // address has no user to attribute it to, and repeated failures are
    // exactly what an operator needs to see.
    recordAudit({
      action: 'auth.login_failed',
      entity: 'session',
      summary: `Failed sign-in for ${email.trim().toLowerCase().slice(0, 120)}`,
      actorUserId: user?.id ?? null,
      ip: clientKey(req),
    });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const sessionId = randomUUID();
  const { token, iat, exp } = await signSession({
    sub: user.id,
    name: user.name,
    role: user.role,
    jti: sessionId,
  });

  // The session row is what makes sign-out enforceable. Written before the
  // cookie is handed out, so a token can never exist without a record that
  // can revoke it.
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
    summary: `${user.name} signed in as ${user.role}`,
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
