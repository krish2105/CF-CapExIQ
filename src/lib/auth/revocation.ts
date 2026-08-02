/**
 * Session revocation.
 *
 * A signed session cookie is self-contained: the middleware verifies the
 * signature and expiry and admits the request without consulting any store.
 * That is what makes it fast and edge-verifiable, and it is also why signing
 * out could not previously mean anything. Clearing the cookie removes the
 * browser's copy; a token captured beforehand stayed valid for the remainder
 * of its eight-hour life, because nothing was ever asked whether it should
 * still be honoured.
 *
 * This adds the missing question. Every session carries a `jti`, and signing
 * out records that id here until the token would have expired anyway — there
 * is no point retaining an entry past the point the signature stops verifying.
 *
 * DEPLOYMENT BOUNDARY — READ BEFORE SHIPPING
 * The default store is per-process memory. On a single long-lived server that
 * is correct. On serverless or multi-instance hosting it is not: each instance
 * holds its own map, so a revocation recorded on one is invisible to the
 * others, and every cold start forgets everything. Provide a shared
 * implementation via `setRevocationStore` (Redis, Upstash, or a database
 * table) before running this anywhere with more than one instance. The
 * interface is deliberately three methods so that swap is small.
 */

export interface RevocationStore {
  revoke(jti: string, expiresAtEpochSeconds: number): Promise<void> | void;
  isRevoked(jti: string): Promise<boolean> | boolean;
}

/** Per-process fallback. Correct for a single instance, wrong for many. */
class MemoryRevocationStore implements RevocationStore {
  private readonly entries = new Map<string, number>();

  revoke(jti: string, expiresAt: number) {
    this.entries.set(jti, expiresAt);
    this.sweep();
  }

  isRevoked(jti: string): boolean {
    const expiresAt = this.entries.get(jti);
    if (expiresAt === undefined) return false;
    // A token past its own expiry is refused by signature verification anyway.
    if (expiresAt * 1000 <= Date.now()) {
      this.entries.delete(jti);
      return false;
    }
    return true;
  }

  /** Drop entries whose tokens have expired; they can no longer be presented. */
  private sweep() {
    if (this.entries.size < 1000) return;
    const now = Date.now();
    for (const [id, exp] of this.entries) {
      if (exp * 1000 <= now) this.entries.delete(id);
    }
  }
}

let store: RevocationStore = new MemoryRevocationStore();

/** Install a shared store. Call once at startup in any multi-instance deploy. */
export function setRevocationStore(next: RevocationStore) {
  store = next;
}

export async function revokeSession(jti: string, expiresAtEpochSeconds: number): Promise<void> {
  await store.revoke(jti, expiresAtEpochSeconds);
}

export async function isSessionRevoked(jti: string | undefined): Promise<boolean> {
  // A token minted before this field existed carries no id. Treat it as live
  // rather than locking out every current session on deploy; such tokens age
  // out within the session TTL.
  if (!jti) return false;
  return store.isRevoked(jti);
}
