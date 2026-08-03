import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '@/test/db';
import { getDb } from '@/lib/db/client';
import {
  beginEnrolment,
  confirmEnrolment,
  isMfaEnabled,
  getMfaState,
  getSecret,
  recordCounter,
  consumeRecoveryCode,
  disableMfa,
  __testing,
} from '@/lib/db/repositories/mfa';
import { generateTotp, counterFor, verifyTotp } from '@/lib/auth/totp';
import { signMfaChallenge, verifyMfaChallenge, verifySession, signSession } from '@/lib/auth/session';
import { listAudit } from '@/lib/db/repositories/audit';

const USER = 'u-cfo-mfa';

function seedUser() {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users (id, email, name, title, role, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(USER, 'mfa@test.example', 'MFA User', 'CFO', 'CFO', 'pbkdf2$1$x$__SEED__', new Date().toISOString());
}

beforeEach(() => {
  resetDatabase();
  seedUser();
});

describe('secret storage', () => {
  it('encrypts the secret at rest', () => {
    const { secret } = beginEnrolment(USER);
    const stored = getDb()
      .prepare('SELECT secret_encrypted FROM user_mfa WHERE user_id = ?')
      .get(USER) as { secret_encrypted: string };

    // A plaintext secret in the database is a working second factor for
    // anyone holding a backup snapshot — which this application now ships
    // off-box on a schedule.
    expect(stored.secret_encrypted).not.toContain(secret);
    expect(stored.secret_encrypted).toMatch(/^v1\./);
    expect(getSecret(USER)).toBe(secret);
  });

  it('detects a tampered ciphertext instead of decrypting to garbage', () => {
    const encrypted = __testing.encryptSecret('JBSWY3DPEHPK3PXP');
    const [v, iv, tag, data] = encrypted.split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;

    // GCM's tag is why this fails loudly rather than producing a secret that
    // generates wrong codes nobody can explain.
    expect(() => __testing.decryptSecret(`${v}.${iv}.${tag}.${flipped.toString('base64')}`)).toThrow();
  });
});

describe('enrolment', () => {
  it('is not enabled until a code is confirmed', () => {
    beginEnrolment(USER);
    // Enabling before confirming locks the user out if the secret never
    // reached their phone.
    expect(isMfaEnabled(USER)).toBe(false);
    expect(getMfaState(USER)?.confirmed).toBe(false);
  });

  it('enables and issues recovery codes on confirmation', () => {
    const { secret } = beginEnrolment(USER);
    const result = verifyTotp(secret, generateTotp(secret));
    const { recoveryCodes } = confirmEnrolment(USER, 'CFO', result.counter!);

    expect(isMfaEnabled(USER)).toBe(true);
    expect(recoveryCodes).toHaveLength(8);
    expect(getMfaState(USER)?.unusedRecoveryCodes).toBe(8);
  });

  it('stores recovery codes hashed, never readable', () => {
    const { secret } = beginEnrolment(USER);
    const { recoveryCodes } = confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));

    const rows = getDb()
      .prepare('SELECT code_hash FROM mfa_recovery_codes WHERE user_id = ?')
      .all(USER) as unknown as Array<{ code_hash: string }>;

    for (const code of recoveryCodes) {
      expect(rows.some((r) => r.code_hash === code)).toBe(false);
    }
    expect(secret).toBeTruthy();
  });

  it('lets an abandoned enrolment be restarted', () => {
    const first = beginEnrolment(USER).secret;
    const second = beginEnrolment(USER).secret;
    // A user whose phone never received the first secret must not be stuck.
    expect(second).not.toBe(first);
    expect(getSecret(USER)).toBe(second);
  });

  it('refuses to silently replace a confirmed enrolment', () => {
    const { secret } = beginEnrolment(USER);
    confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));
    // Otherwise this is a way to reset someone else's second factor.
    expect(() => beginEnrolment(USER)).toThrow(/already enabled/i);
    expect(getSecret(USER)).toBe(secret);
  });

  it('records enabling in the audit trail', () => {
    beginEnrolment(USER);
    confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));
    const events = listAudit();
    expect(events.events.some((e) => /Multi-factor authentication enabled/.test(e.summary))).toBe(true);
  });
});

describe('replay protection', () => {
  it('refuses a code already spent', () => {
    const { secret } = beginEnrolment(USER);
    const now = Math.floor(Date.now() / 1000);
    const code = generateTotp(secret, now);

    const first = verifyTotp(secret, code, { epochSeconds: now });
    expect(first.valid).toBe(true);
    recordCounter(USER, first.counter!);

    const state = getMfaState(USER);
    const replay = verifyTotp(secret, code, {
      epochSeconds: now,
      lastUsedCounter: state!.lastUsedCounter,
    });
    expect(replay.valid).toBe(false);
  });
});

describe('recovery codes', () => {
  function enrol() {
    beginEnrolment(USER);
    return confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000)).recoveryCodes;
  }

  it('accepts a code once and then never again', () => {
    const codes = enrol();
    expect(consumeRecoveryCode(USER, codes[0])).toEqual({ ok: true, remaining: 7 });
    expect(consumeRecoveryCode(USER, codes[0]).ok).toBe(false);
  });

  it('accepts the shape a user actually types', () => {
    const codes = enrol();
    // Lower case, spaces instead of the dash — all the same code.
    expect(consumeRecoveryCode(USER, codes[1].toLowerCase()).ok).toBe(true);
    expect(consumeRecoveryCode(USER, codes[2].replace('-', ' ')).ok).toBe(true);
  });

  it('rejects an unknown code', () => {
    enrol();
    expect(consumeRecoveryCode(USER, 'AAAAA-BBBBB').ok).toBe(false);
  });

  it('invalidates the old set when MFA is re-enrolled', () => {
    const first = enrol();
    disableMfa(USER, 'CFO');
    beginEnrolment(USER);
    confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));

    expect(consumeRecoveryCode(USER, first[0]).ok).toBe(false);
  });
});

describe('disabling', () => {
  it('stops requiring a factor and drops the codes', () => {
    beginEnrolment(USER);
    const { recoveryCodes } = confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));

    disableMfa(USER, 'CFO');
    expect(isMfaEnabled(USER)).toBe(false);
    expect(consumeRecoveryCode(USER, recoveryCodes[0]).ok).toBe(false);
  });

  it('leaves an audit record rather than deleting the row', () => {
    beginEnrolment(USER);
    confirmEnrolment(USER, 'CFO', counterFor(Date.now() / 1000));
    disableMfa(USER, 'CFO');

    // "When did this account stop requiring a second factor, and who did it"
    // is exactly what an incident review asks.
    expect(
      listAudit().events.some((e) => /Multi-factor authentication disabled/.test(e.summary))
    ).toBe(true);
  });
});

describe('the challenge token is not a session', () => {
  it('round-trips as a challenge', async () => {
    const token = await signMfaChallenge({ sub: USER, name: 'MFA User', role: 'CFO' });
    const challenge = await verifyMfaChallenge(token);
    expect(challenge?.sub).toBe(USER);
    expect(challenge?.typ).toBe('mfa');
  });

  /**
   * The attack this defends against: the challenge is signed with the same key
   * as a session, so without domain separation a caller could set it as their
   * session cookie and skip the second factor entirely — making the whole
   * feature decorative.
   */
  it('is rejected by verifySession', async () => {
    const token = await signMfaChallenge({ sub: USER, name: 'MFA User', role: 'CFO' });
    expect(await verifySession(token)).toBeNull();
  });

  it('does not accept a real session as a challenge', async () => {
    const { token } = await signSession({ sub: USER, name: 'MFA User', role: 'CFO', typ: 'session' });
    expect(await verifyMfaChallenge(token)).toBeNull();
  });

  it('rejects a forged challenge', async () => {
    expect(await verifyMfaChallenge('not.a.token')).toBeNull();
    expect(await verifyMfaChallenge(undefined)).toBeNull();
  });
});
