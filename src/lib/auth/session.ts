import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Session tokens — HMAC-SHA256 over a compact JSON payload.
 *
 * Built on Web Crypto rather than node:crypto because the same verify path
 * runs in Next's Edge middleware, where the node builtin is unavailable.
 * Deliberately not a JWT library: the payload is four fields and the only
 * algorithm we accept is HS256, so a dependency would add the `alg: none`
 * and algorithm-confusion families of bug without adding capability.
 *
 * WHAT THIS IS AND ISN'T
 * The cookie is httpOnly, signed, and verified at the edge before any page
 * renders, so a user cannot promote themselves to CFO by editing client state
 * — which the previous free-choice role switcher allowed outright. It is
 * still an academic deployment: accounts live in a static directory, there is
 * no password reset, no MFA, no revocation list, and a leaked AUTH_SECRET
 * forges any role. Treat it as a governance boundary that is now actually
 * enforced, not as production identity infrastructure.
 */

export const SESSION_COOKIE = 'capexiq_session';
/** Eight hours — a working day, after which a shared demo machine re-auths. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionPayload {
  /** User id. */
  sub: string;
  /**
   * Token id. Optional so a cookie minted before revocation existed still
   * verifies rather than logging everyone out on deploy; such tokens simply
   * cannot be revoked and age out within the TTL.
   */
  jti?: string;
  name: string;
  role: ExecutiveRole;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
}

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    // Refuse to sign with a guessable key in production rather than degrade
    // silently to a forgeable session.
    throw new Error('AUTH_SECRET must be set (>=16 chars) in production.');
  }
  return 'capexiq-development-only-secret-do-not-ship';
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Constant-time comparison — a fast-exit compare leaks the signature. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSession(
  payload: Omit<SessionPayload, 'iat' | 'exp' | 'jti'>
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  // Random id so this specific token can be revoked on sign-out. crypto.randomUUID
  // is available in both the Node and Edge runtimes this module targets.
  const jti = crypto.randomUUID();
  const full: SessionPayload = { ...payload, jti, iat, exp: iat + SESSION_TTL_SECONDS };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign('HMAC', await key(), encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(sig))}`;
}

/** Verify signature and expiry. Returns null on any failure — never throws. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  try {
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', await key(), encoder.encode(body))
    );
    if (!timingSafeEqual(expected, base64UrlDecode(providedSig))) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    if (!payload.sub || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}
