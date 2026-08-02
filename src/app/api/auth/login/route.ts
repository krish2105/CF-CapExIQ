import { NextResponse } from 'next/server';
import { findByEmail, verifyPassword } from '@/lib/auth/users';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { checkRateLimit, clientKey } from '@/lib/guardrails/aiGuardrails';
import { roleLabel } from '@/lib/auth/permissions';

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
  const limit = checkRateLimit(`login:${clientKey(req)}`);
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
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, name: user.name, role: user.role });

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
