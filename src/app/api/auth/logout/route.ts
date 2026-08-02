import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { revokeSession } from '@/lib/db/repositories/sessions';
import { recordAudit } from '@/lib/db/repositories/audit';
import { clientKey } from '@/lib/guardrails/aiGuardrails';

export const runtime = 'nodejs';

/**
 * Sign out. POST-only: a GET logout is triggerable by any third-party image
 * tag, which is a nuisance rather than a vulnerability but trivially avoided.
 *
 * Now actually revokes. Clearing the cookie only ever removed the browser's
 * copy of the token — a copy taken from a shared machine, a proxy log or a
 * backup stayed valid for the remainder of its eight-hour life, because the
 * token is self-contained and nothing was consulted to check it. Marking the
 * `sessions` row revoked is what makes signing out mean something.
 */
export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (session?.jti) {
    const revoked = revokeSession(session.jti);
    if (revoked) {
      recordAudit({
        actorUserId: session.sub,
        actorRole: session.role,
        action: 'auth.logout',
        entity: 'session',
        entityId: session.jti,
        summary: `${session.name} signed out`,
        ip: clientKey(req),
      });
    }
  }

  // The cookie is cleared regardless of whether a row was found. A caller with
  // an expired, forged or pre-revocation token still needs to end up without
  // one, and refusing to clear it would strand them on the login page.
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
