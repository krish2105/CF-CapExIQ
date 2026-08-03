import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession, rateLimited } from '@/lib/auth/apiAuth';
import {
  beginEnrolment,
  confirmEnrolment,
  getMfaState,
  getSecret,
  disableMfa,
} from '@/lib/db/repositories/mfa';
import { otpauthUri, verifyTotp } from '@/lib/auth/totp';
import { findById } from '@/lib/db/repositories/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Enrolment, confirmation and removal of a second factor.
 *
 * Authenticated: a user enrols their own account and nobody else's. There is
 * deliberately no administrator endpoint to enrol or reset MFA for another
 * user — that would be a social-engineering bypass of the control, and
 * recovery codes exist so it is not needed.
 */

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const state = getMfaState(auth.session.sub);
  return NextResponse.json(
    {
      enabled: Boolean(state?.confirmed),
      pending: Boolean(state && !state.confirmed),
      recoveryCodesRemaining: state?.unusedRecoveryCodes ?? 0,
      confirmedAt: state?.confirmedAt ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Begin enrolment: mint a secret and return the URI an app can scan. */
export async function POST() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const user = findById(auth.session.sub);
  if (!user) return NextResponse.json({ error: 'Unknown account.' }, { status: 401 });

  try {
    const { secret } = beginEnrolment(auth.session.sub);
    return NextResponse.json(
      {
        secret,
        otpauthUri: otpauthUri({ secret, account: user.email }),
        // Not enabled yet. Nothing changes about signing in until a code is
        // confirmed, so a user who never finishes is not locked out.
        pending: true,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}

const Confirm = z.object({ code: z.string().min(6).max(10) });

/** Confirm enrolment with a live code, and hand back the recovery codes once. */
export async function PUT(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('mfa-enroll', auth.session);
  if (limited) return limited;

  const parsed = Confirm.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'A code is required.' }, { status: 400 });

  const state = getMfaState(auth.session.sub);
  if (!state) {
    return NextResponse.json({ error: 'Start enrolment first.' }, { status: 409 });
  }
  if (state.confirmed) {
    return NextResponse.json({ error: 'MFA is already enabled.' }, { status: 409 });
  }

  const secret = getSecret(auth.session.sub);
  if (!secret) return NextResponse.json({ error: 'Start enrolment first.' }, { status: 409 });

  // Proving the secret reached the authenticator is the entire purpose of this
  // step: enabling MFA without it locks the user out of their own account.
  const result = verifyTotp(secret, parsed.data.code);
  if (!result.valid || result.counter === undefined) {
    return NextResponse.json({ error: 'That code is not valid.' }, { status: 400 });
  }

  const { recoveryCodes } = confirmEnrolment(auth.session.sub, auth.session.role, result.counter);

  return NextResponse.json(
    {
      enabled: true,
      // Returned exactly once. Stored hashed, so this response is the only
      // time they exist in readable form anywhere.
      recoveryCodes,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

const Disable = z.object({ code: z.string().min(6).max(20) });

/**
 * Turn MFA off.
 *
 * Requires a current code, not just a session. A signed-in browser left open
 * is the most likely way an attacker reaches this endpoint, and removing the
 * second factor with the first alone would make it trivially strippable.
 */
export async function DELETE(req: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('mfa-disable', auth.session);
  if (limited) return limited;

  const parsed = Disable.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A current code is required.' }, { status: 400 });
  }

  const state = getMfaState(auth.session.sub);
  if (!state?.confirmed) {
    return NextResponse.json({ error: 'MFA is not enabled.' }, { status: 409 });
  }

  const secret = getSecret(auth.session.sub);
  if (!secret || !verifyTotp(secret, parsed.data.code).valid) {
    return NextResponse.json({ error: 'That code is not valid.' }, { status: 400 });
  }

  disableMfa(auth.session.sub, auth.session.role);
  return NextResponse.json({ enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
}
