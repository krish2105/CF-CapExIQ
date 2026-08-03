import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateCode,
  generateTotp,
  verifyTotp,
  counterFor,
  otpauthUri,
  generateSecret,
  generateRecoveryCodes,
  normaliseRecoveryCode,
  TOTP_PERIOD_SECONDS,
} from '@/lib/auth/totp';

/**
 * RFC 6238 Appendix B.
 *
 * Hand-rolling a one-time-password implementation is only defensible if it is
 * checked against the standard's own vectors. An implementation that merely
 * produces six plausible digits is indistinguishable from a correct one until
 * a real authenticator app disagrees with it — at which point the failure
 * looks like a user error and gets "fixed" by widening the window.
 *
 * The RFC's shared secret is the ASCII string "12345678901234567890".
 */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));

/** [unix time, expected 8-digit SHA-1 TOTP] */
const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('RFC 6238 published vectors', () => {
  it.each(RFC_VECTORS)('t=%i produces %s', (time, expected) => {
    expect(generateCode(RFC_SECRET, counterFor(time), 8)).toBe(expected);
  });

  it('produces the six-digit form authenticator apps display', () => {
    // Apps show six digits; the RFC tabulates eight. Six is the low-order
    // truncation of the same value, not a different computation.
    for (const [time, expected] of RFC_VECTORS) {
      expect(generateTotp(RFC_SECRET, time)).toBe(expected.slice(-6));
    }
  });
});

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = Buffer.from([0x00, 0xff, 0x10, 0x7a, 0x9c, 0x01]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('matches the RFC 4648 encoding of a known string', () => {
    expect(base32Encode(Buffer.from('foobar', 'ascii'))).toBe('MZXW6YTBOI');
  });

  it('tolerates padding, lower case and spacing', () => {
    // Printed secrets are grouped for readability and apps pad differently;
    // failing on either is a defect the user cannot diagnose.
    const canonical = base32Decode('MZXW6YTBOI');
    expect(base32Decode('mzxw6ytboi')).toEqual(canonical);
    expect(base32Decode('MZXW 6YTB OI')).toEqual(canonical);
    expect(base32Decode('MZXW6YTBOI======')).toEqual(canonical);
  });

  it('rejects a character outside the alphabet', () => {
    expect(() => base32Decode('MZXW6YTB01')).toThrow(/Invalid base32/);
  });
});

describe('verification', () => {
  const secret = generateSecret();
  const now = 1_700_000_000;

  it('accepts the current code', () => {
    expect(verifyTotp(secret, generateTotp(secret, now), { epochSeconds: now }).valid).toBe(true);
  });

  it('tolerates one step of clock drift in each direction', () => {
    const early = generateTotp(secret, now - TOTP_PERIOD_SECONDS);
    const late = generateTotp(secret, now + TOTP_PERIOD_SECONDS);
    expect(verifyTotp(secret, early, { epochSeconds: now }).valid).toBe(true);
    expect(verifyTotp(secret, late, { epochSeconds: now }).valid).toBe(true);
  });

  it('rejects a code two steps out', () => {
    // Every extra window multiplies the codes valid at any instant, which
    // directly weakens a six-digit secret.
    const stale = generateTotp(secret, now - TOTP_PERIOD_SECONDS * 2);
    expect(verifyTotp(secret, stale, { epochSeconds: now }).valid).toBe(false);
  });

  it('rejects malformed input without touching the secret', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56 78']) {
      expect(verifyTotp(secret, bad, { epochSeconds: now }).valid).toBe(false);
    }
  });

  it('rejects a code from a different secret', () => {
    const other = generateSecret();
    expect(verifyTotp(secret, generateTotp(other, now), { epochSeconds: now }).valid).toBe(false);
  });

  it('reports the counter it matched, for replay protection', () => {
    const result = verifyTotp(secret, generateTotp(secret, now), { epochSeconds: now });
    expect(result.counter).toBe(counterFor(now));
  });

  it('refuses a code already used, even inside its window', () => {
    // Without this a code seen over a shoulder, or captured in a proxy log,
    // stays usable for up to 90 seconds.
    const code = generateTotp(secret, now);
    const first = verifyTotp(secret, code, { epochSeconds: now });
    expect(first.valid).toBe(true);

    const replay = verifyTotp(secret, code, {
      epochSeconds: now,
      lastUsedCounter: first.counter,
    });
    expect(replay.valid).toBe(false);
  });

  it('still accepts the next window after a code is used', () => {
    const used = counterFor(now);
    const next = generateTotp(secret, now + TOTP_PERIOD_SECONDS);
    expect(
      verifyTotp(secret, next, { epochSeconds: now + TOTP_PERIOD_SECONDS, lastUsedCounter: used })
        .valid
    ).toBe(true);
  });
});

describe('enrolment URI', () => {
  it('carries the parameters an authenticator needs', () => {
    const uri = otpauthUri({ secret: 'JBSWY3DPEHPK3PXP', account: 'cfo@novaretail.example' });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });

  it('names the issuer in both places apps read it from', () => {
    // Apps disagree about which they use; getting it wrong produces an entry
    // labelled only with an email address.
    const uri = otpauthUri({ secret: 'A'.repeat(16), account: 'a@b.example', issuer: 'CapExIQ' });
    expect(uri).toContain('CapExIQ%3Aa%40b.example');
    expect(uri).toContain('issuer=CapExIQ');
  });
});

describe('secrets and recovery codes', () => {
  it('generates a 160-bit secret', () => {
    expect(base32Decode(generateSecret())).toHaveLength(20);
  });

  it('generates distinct secrets', () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateSecret()));
    expect(secrets.size).toBe(50);
  });

  it('generates unique recovery codes in a readable shape', () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
  });

  it('normalises a recovery code the way a user would type it', () => {
    expect(normaliseRecoveryCode('a1b2c-3d4e5')).toBe('A1B2C3D4E5');
    expect(normaliseRecoveryCode(' A1B2C 3D4E5 ')).toBe('A1B2C3D4E5');
  });
});
