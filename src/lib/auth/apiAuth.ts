import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession, type SessionPayload } from '@/lib/auth/session';
import { can, type Permission } from '@/lib/auth/permissions';

/**
 * Server-side authorisation for route handlers.
 *
 * WHY THIS EXISTS
 *
 * `src/middleware.ts` authenticates every `/api/*` request but deliberately
 * does not authorise it, on the stated assumption that "the handlers that
 * expose privileged figures check their own permission". No handler did. The
 * result was that the entire RBAC matrix in `permissions.ts` was enforced
 * only on page navigation: an Analyst — explicitly denied `board.materials` —
 * could still POST `/api/ai/board-memo` with their own valid cookie and get
 * the board memo back. Same for `vendor.negotiate`, `scenario.author` and
 * every other capability. Route-level gating without API-level gating is a
 * padlock on a door with no wall attached.
 *
 * WHY IT RE-VERIFIES THE COOKIE
 *
 * Middleware forwards the verified role as `x-capexiq-role`, and reading that
 * would be cheaper. It is not read here, for two reasons. First, a request
 * header is attacker-controlled on any path that reaches a handler without
 * traversing middleware — and trusting it would convert a header spoof into
 * full role assumption. Second, the middleware matcher is an exclusion regex;
 * anything it stops matching silently loses its check. Re-verifying the signed
 * cookie costs one HMAC and depends on nothing upstream being correct.
 *
 * FAILURE MODES
 *
 * 401 when there is no valid session, 403 when there is one that lacks the
 * permission. They are distinguished because the client must tell "sign in
 * again" from "your role cannot do this" — the first is fixable by the user,
 * the second is not, and collapsing them produces a login loop for a user
 * who is already correctly signed in.
 */

export type AuthDecision =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: 401 | 403; error: string };

export type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

/**
 * Pure authorisation decision over a raw token.
 *
 * Split from `requirePermission` so the policy can be unit-tested directly,
 * without standing up a request context to satisfy `next/headers`. The route
 * wrapper below holds no logic of its own beyond I/O.
 *
 * `permission` of `null` means "any authenticated role" — used by endpoints
 * that expose no privileged figure but still must not be open to the public.
 */
export async function authorizeToken(
  token: string | undefined,
  permission: Permission | null
): Promise<AuthDecision> {
  const session = await verifySession(token);
  if (!session) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }

  if (permission && !can(session.role, permission)) {
    return {
      ok: false,
      status: 403,
      // Naming the missing permission is deliberate. The role model is
      // published in the UI and documented, so this leaks nothing an
      // authenticated user cannot already read — and without it a refusal is
      // indistinguishable from a bug, which is how governance controls get
      // reported as outages and then removed.
      error: `The ${session.role} role does not hold the "${permission}" permission required for this endpoint.`,
    };
  }

  return { ok: true, session };
}

/**
 * Guard a route handler. Call as the first statement:
 *
 *   const auth = await requirePermission('board.materials');
 *   if (!auth.ok) return auth.response;
 *
 * Returning early on `!auth.ok` is what enforces the check — a handler that
 * ignores the result compiles fine, so `tests/apiAuth.test.ts` asserts every
 * AI route both imports this module and returns on denial.
 */
export async function requirePermission(permission: Permission | null): Promise<AuthResult> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const decision = await authorizeToken(token, permission);

  if (decision.ok) return { ok: true, session: decision.session };

  return {
    ok: false,
    response: NextResponse.json(
      { error: decision.error },
      { status: decision.status, headers: { 'Cache-Control': 'no-store' } }
    ),
  };
}

/** Authenticated, no specific capability required. */
export function requireSession(): Promise<AuthResult> {
  return requirePermission(null);
}
