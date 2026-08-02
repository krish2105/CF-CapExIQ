import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { revokeSession } from '@/lib/auth/revocation';

export const runtime = 'nodejs';

/**
 * Sign out.
 *
 * POST-only: a GET logout is triggerable by any third-party image tag, which
 * is a nuisance rather than a vulnerability but trivially avoided.
 *
 * Clearing the cookie only removes the browser's copy. A token captured before
 * sign-out would otherwise remain valid for the rest of its eight-hour life,
 * because the signature and expiry still check out. Recording the token id on
 * the denylist is what makes signing out mean something; the middleware
 * consults it before rendering any page.
 */
export async function POST(req: Request) {
  const raw = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  const session = await verifySession(raw);
  if (session?.jti) {
    // Retained only until the token would have expired anyway.
    await revokeSession(session.jti, session.exp);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
