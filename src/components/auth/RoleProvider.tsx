'use client';

import React, { createContext, useContext } from 'react';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * The signed-in role, supplied by the server.
 *
 * WHY THIS REPLACED THE STORE VALUE
 *
 * `selectedRole` lived in the Zustand store, persisted to localStorage and
 * seeded at sign-in by `LoginForm`. Every `RoleGate` in the tree read it. That
 * made the entire in-page authorisation surface editable from devtools: set
 * one localStorage key to "CFO" and every gated widget rendered, because the
 * figures behind them are computed client-side and were already in the bundle.
 *
 * The value now arrives from `verifySession` in the root layout — from the
 * signed httpOnly cookie the browser cannot read or forge — and is passed down
 * through context. There is no setter. A client that wants a different lens
 * has to obtain a different session.
 *
 * WHAT THIS DOES AND DOES NOT BUY
 *
 * It makes the UI honest, and it removes the trivial self-promotion path. It
 * does NOT make client-side gating a security boundary: the finance engine
 * still runs in the browser, so a determined user can read withheld figures
 * out of memory or recompute them from the assumptions they can see. The
 * control that actually holds is server-side — `requirePermission` on the API
 * and permission-aware retrieval — and this layer is need-to-know presentation
 * on top of it. Anything genuinely privileged must never be shipped to a
 * client that may not see it, which today means keeping it out of the store.
 */

const RoleContext = createContext<ExecutiveRole | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  role: ExecutiveRole | null;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/**
 * The active role, or null when there is no session.
 *
 * Null is returned rather than a default so that an unauthenticated tree
 * fails closed. Defaulting to any role — the store defaulted to CFO — grants
 * the whole lens to a request that proved nothing.
 */
export function useRole(): ExecutiveRole | null {
  return useContext(RoleContext);
}
