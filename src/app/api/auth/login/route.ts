import { NextResponse } from 'next/server';
import { findByEmail, verifyPassword } from '@/lib/auth/users';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { checkRateLimitAsync, clientKey } from '@/lib/guardrails/aiGuardrails';
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
  // Backend-aware: honours a shared store once one is installed, so the
  // limit still means something behind more than one instance.
  const limit = await checkRateLimitAsync(`login:${clientKey(req)}`);
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

  /*
   * signSession() throws when NODE_ENV is production and AUTH_SECRET is unset
   * or too short, which is deliberate: signing with a guessable key would hand
   * out forgeable sessions. Uncaught, that surfaced as a 500 carrying an HTML
   * error page, and the browser then failed to parse it as JSON and reported
   * "Could not reach the sign-in service" — which points the reader at the
   * network when the real cause is a missing environment variable. Catch it
   * here so the response says what is actually wrong.
   */
  let token: string;
  try {
    token = await signSession({ sub: user.id, name: user.name, role: user.role });
  } catch (err) {
    console.error('Session signing failed:', err);
    return NextResponse.json(
      {
        error:
          'The server cannot issue sessions because its signing key is missing. ' +
          'Set AUTH_SECRET (at least 16 characters) in the environment and restart.',
      },
      { status: 503 }
    );
  }

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
