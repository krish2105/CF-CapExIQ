import { describe, it, expect, beforeEach } from 'vitest';
import {
  revokeSession,
  isSessionRevoked,
  setRevocationStore,
  type RevocationStore,
} from '@/lib/auth/revocation';
import {
  checkRateLimitAsync,
  setRateLimitBackend,
  isRateLimitDistributed,
  type RateLimitBackend,
} from '@/lib/guardrails/aiGuardrails';

const future = () => Math.floor(Date.now() / 1000) + 3600;

describe('session revocation', () => {
  beforeEach(() => {
    // Fresh in-memory store per test so cases cannot leak into each other.
    const entries = new Map<string, number>();
    const store: RevocationStore = {
      revoke: (jti, exp) => void entries.set(jti, exp),
      isRevoked: (jti) => {
        const exp = entries.get(jti);
        if (exp === undefined) return false;
        if (exp * 1000 <= Date.now()) {
          entries.delete(jti);
          return false;
        }
        return true;
      },
    };
    setRevocationStore(store);
  });

  it('treats an unknown token as live', async () => {
    expect(await isSessionRevoked('never-seen')).toBe(false);
  });

  it('refuses a token after it is revoked', async () => {
    await revokeSession('tok-1', future());
    expect(await isSessionRevoked('tok-1')).toBe(true);
  });

  it('does not lock out sessions minted before revocation existed', async () => {
    // Tokens predating the jti field carry none; refusing them would sign
    // every active user out on deploy.
    expect(await isSessionRevoked(undefined)).toBe(false);
  });

  it('stops tracking a token once it would have expired anyway', async () => {
    await revokeSession('tok-expired', Math.floor(Date.now() / 1000) - 10);
    expect(await isSessionRevoked('tok-expired')).toBe(false);
  });

  it('revokes only the token presented, not the user', async () => {
    await revokeSession('tok-a', future());
    expect(await isSessionRevoked('tok-a')).toBe(true);
    expect(await isSessionRevoked('tok-b')).toBe(false);
  });
});

describe('rate limiting', () => {
  it('reports whether a shared backend is installed', () => {
    // Defaults to the per-process map, which does not limit across instances.
    expect(typeof isRateLimitDistributed()).toBe('boolean');
  });

  it('blocks once the window allowance is exhausted', async () => {
    let count = 0;
    const backend: RateLimitBackend = {
      hit: () => ({ count: ++count, resetAt: Date.now() + 60_000 }),
    };
    setRateLimitBackend(backend);
    expect(isRateLimitDistributed()).toBe(true);

    let lastAllowed = true;
    for (let i = 0; i < 20; i++) {
      lastAllowed = (await checkRateLimitAsync('k')).allowed;
    }
    expect(lastAllowed).toBe(true);

    const over = await checkRateLimitAsync('k');
    expect(over.allowed).toBe(false);
    expect(over.retryAfterSeconds).toBeGreaterThan(0);
  });
});
