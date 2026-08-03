import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time passwords, RFC 6238.
 *
 * WHY TOTP AND NOT SMS
 *
 * SMS codes are delivered over a channel the user does not control: a SIM swap
 * or an SS7 intercept defeats them entirely, and they cost money per message
 * for a system whose whole user base is six executives. TOTP is a shared
 * secret and a clock — no delivery channel to attack, no per-use cost, and it
 * works with any authenticator the operator already has.
 *
 * WHY NO LIBRARY
 *
 * The algorithm is an HMAC, a truncation and a modulo. `otplib` and `speakeasy`
 * are each several thousand lines carrying URI builders, QR renderers and
 * multiple hash suites. What is needed here is one function — and the
 * correctness of that function is checkable against RFC 6238's own published
 * vectors, which `tests/totp.test.ts` does. A hand-rolled implementation
 * nobody verified would be indefensible; one checked against the standard's
 * test data is not.
 */

/** RFC 6238 default. Authenticator apps assume it and cannot be told otherwise. */
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * Windows of tolerance either side of now.
 *
 * One step (±30s) covers ordinary clock drift between a phone and a server.
 * Wider is tempting and wrong: every extra window multiplies the codes valid
 * at any instant, which is a direct weakening of a six-digit secret.
 */
export const TOTP_WINDOW = 1;

// ------------------------------------------------------------------ base32

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32, unpadded — the encoding every authenticator app expects. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  // Padding and casing vary between apps; whitespace is common in printed
  // secrets. Normalising here means a user retyping a secret does not fail
  // for a reason they cannot see.
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of clean) {
    const index = B32.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// -------------------------------------------------------------------- totp

/** 160 bits — the RFC's recommendation for SHA-1 HMAC. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * The counter for a moment in time.
 *
 * Exported so tests can pin it to the RFC's vectors rather than the wall
 * clock, and so replay protection can store which counter a code came from.
 */
export function counterFor(epochSeconds: number, period = TOTP_PERIOD_SECONDS): number {
  return Math.floor(epochSeconds / period);
}

/** HOTP (RFC 4226) over a counter, which is what TOTP truncates to. */
export function generateCode(
  secretBase32: string,
  counter: number,
  digits = TOTP_DIGITS
): string {
  const key = base32Decode(secretBase32);

  // 8-byte big-endian counter. Written as two 32-bit halves because
  // writeBigUInt64BE would force every caller to deal in BigInt for a value
  // that is comfortably inside Number's safe range until the year 275760.
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac('sha1', key).update(buf).digest();

  // Dynamic truncation, RFC 4226 §5.4: the low nibble of the last byte picks
  // the offset, and the high bit is masked off so the result is positive on
  // platforms that treat it as signed.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

export function generateTotp(
  secretBase32: string,
  epochSeconds = Math.floor(Date.now() / 1000),
  digits = TOTP_DIGITS
): string {
  return generateCode(secretBase32, counterFor(epochSeconds), digits);
}

export interface TotpVerification {
  valid: boolean;
  /** Counter the code matched. Stored to stop the same code being replayed. */
  counter?: number;
}

/**
 * Verify a submitted code.
 *
 * Compared in constant time. A fast-exit compare leaks which prefix was right,
 * and against a six-digit space that is a meaningful head start.
 */
export function verifyTotp(
  secretBase32: string,
  submitted: string,
  options: {
    epochSeconds?: number;
    window?: number;
    digits?: number;
    /** Reject any counter at or below this — replay protection. */
    lastUsedCounter?: number | null;
  } = {}
): TotpVerification {
  const code = submitted.replace(/\s+/g, '');
  const digits = options.digits ?? TOTP_DIGITS;
  if (!/^\d+$/.test(code) || code.length !== digits) return { valid: false };

  const now = options.epochSeconds ?? Math.floor(Date.now() / 1000);
  const window = options.window ?? TOTP_WINDOW;
  const current = counterFor(now);

  for (let drift = -window; drift <= window; drift++) {
    const counter = current + drift;
    if (counter < 0) continue;

    // A code from a counter already used cannot be presented again, even
    // while it is still inside its validity window. Without this, a code
    // observed over the shoulder or captured in a proxy log is reusable for
    // up to 90 seconds.
    if (options.lastUsedCounter != null && counter <= options.lastUsedCounter) continue;

    const expected = generateCode(secretBase32, counter, digits);
    const a = Buffer.from(expected);
    const b = Buffer.from(code);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { valid: true, counter };
    }
  }

  return { valid: false };
}

/**
 * The `otpauth://` URI an authenticator app scans.
 *
 * The issuer appears twice by convention — once as a label prefix and once as
 * a parameter — because apps disagree about which they read, and getting it
 * wrong produces an entry labelled only with an email address.
 */
export function otpauthUri(options: {
  secret: string;
  account: string;
  issuer?: string;
}): string {
  const issuer = options.issuer ?? 'CapExIQ';
  const label = encodeURIComponent(`${issuer}:${options.account}`);
  const params = new URLSearchParams({
    secret: options.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// -------------------------------------------------------- recovery codes

/**
 * Recovery codes.
 *
 * Not optional. A second factor without a recovery path converts a lost or
 * wiped phone into a permanently locked account, and the usual remedy — an
 * administrator who can disable MFA on request — is a social-engineering
 * bypass of the whole control.
 *
 * Grouped with a dash purely so they can be read aloud and typed without
 * error; the dash is stripped on verification.
 */
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normaliseRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}
