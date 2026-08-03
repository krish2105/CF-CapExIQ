import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyMfaChallenge } from '@/lib/auth/session';
import { issueSessionResponse } from '@/lib/auth/issueSession';
import { findById } from '@/lib/db/repositories/users';
import { getSecret, getMfaState, recordCounter, consumeRecoveryCode } from '@/lib/db/repositories/mfa';
import { verifyTotp } from '@/lib/auth/totp';
import { checkRateLimit, clientKey } from '@/lib/guardrails/aiGuardrails';
import { recordAudit } from '@/lib/db/repositories/audit';

export const runtime = 'nodejs';

/**
 * Second factor — the step between a correct password and a session.
 *
 * Reached with the short-lived challenge issued by `/api/auth/login`, never
 * with a session cookie: there is no session yet, which is the whole point.
 */

const Body = z.object({
  challenge: z.string().min(10).max(2000),
  // A TOTP code or a recovery code. Length alone distinguishes them, so the
  // caller does not have to declare which they are using and cannot be
  // probed by the difference in handling.
  code: z.string().min(6).max(20),
});

export async function POST(req: Request) {
  /**
   * Rate limited on the challenge subject, hard.
   *
   * Six digits is a million possibilities, and with a ±1 window three codes
   * are live at any instant — an unthrottled endpoint is brute-forceable in
   * hours. Keyed by the account rather than the IP so an attacker cannot
   * simply rotate addresses.
   */
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const challenge = await verifyMfaChallenge(parsed.data.challenge);
  if (!challenge) {
    // Expired or forged. The user re-enters their password, which is the
    // correct outcome: nothing here should extend a half-finished sign-in.
    return NextResponse.json(
      { error: 'This sign-in attempt expired. Please enter your password again.' },
      { status: 401 }
    );
  }

  const limit = await checkRateLimit(`mfa:${challenge.sub}`);
  if (!limit.allowed) {
    recordAudit({
      actorUserId: challenge.sub,
      actorRole: challenge.role,
      action: 'auth.login_failed',
      entity: 'mfa',
      summary: 'Second-factor attempts rate limited',
      ip: clientKey(req),
    });
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const user = findById(challenge.sub);
  const secret = getSecret(challenge.sub);
  if (!user || !secret) {
    return NextResponse.json({ error: 'Invalid or expired sign-in attempt.' }, { status: 401 });
  }

  const submitted = parsed.data.code.trim();
  const state = getMfaState(challenge.sub);

  // ---- authenticator code ----------------------------------------------
  const totp = verifyTotp(secret, submitted, { lastUsedCounter: state?.lastUsedCounter ?? null });
  if (totp.valid && totp.counter !== undefined) {
    recordCounter(challenge.sub, totp.counter);
    return issueSessionResponse(req, user, { mfaUsed: 'totp' });
  }

  // ---- recovery code ----------------------------------------------------
  // Tried second so a valid authenticator code never consumes one.
  const recovery = consumeRecoveryCode(challenge.sub, submitted);
  if (recovery.ok) {
    const res = await issueSessionResponse(req, user, { mfaUsed: 'recovery' });
    // Surfaced so a user burning through codes learns before the last one is
    // gone and they are locked out of their own account.
    res.headers.set('X-Recovery-Codes-Remaining', String(recovery.remaining));
    return res;
  }

  recordAudit({
    actorUserId: challenge.sub,
    actorRole: challenge.role,
    action: 'auth.login_failed',
    entity: 'mfa',
    summary: 'Incorrect second factor',
    ip: clientKey(req),
  });

  // One message for both failures: distinguishing "wrong code" from "wrong
  // recovery code" tells an attacker which space they are searching.
  return NextResponse.json({ error: 'That code is not valid.' }, { status: 401 });
}
