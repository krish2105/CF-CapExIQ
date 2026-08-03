import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session';
import { PUBLIC_ROUTES, permissionsForRoute } from '@/lib/auth/routePermissions';
import { canAny } from '@/lib/auth/permissions';

/**
 * Authentication and route authorisation at the edge.
 *
 * The Executive Lens used to be a dropdown: any visitor could select "CFO"
 * and read the funding structure, because the only thing standing between
 * them and it was a value in client-side state. Authorisation is now decided
 * here, from a signed httpOnly cookie the browser cannot read or forge,
 * before the requested page is rendered at all.
 *
 * Unknown routes are treated as "signed-in users only" rather than "public".
 * Failing open on an unmapped path would mean every new page ships
 * unprotected until someone remembers to add it to the table.
 */

/** Roles cannot reach these, but they must stay reachable to fix that. */
const ALWAYS_ALLOWED = new Set(['/login', '/forbidden']);

/**
 * Content-Security-Policy, built per request so `script-src` can carry a nonce.
 *
 * WHY IT MOVED HERE FROM next.config.mjs
 *
 * A nonce has to be unique per response, and `headers()` in the Next config is
 * evaluated once at build time — it can only emit a constant. That is why the
 * previous policy shipped `script-src 'unsafe-inline'` in production, which
 * leaves the single highest-value client-side control switched off: any
 * injected `<script>` executes, and CSP contributes nothing against XSS.
 *
 * The blocker recorded in that file was that nonces would force the whole tree
 * into dynamic rendering. That already happened when the executive lens moved
 * server-side — every page is `ƒ (Dynamic)` now — so the cost has been paid
 * and the reason not to do this has expired.
 *
 * 'strict-dynamic' is what makes this workable with Next's chunk loading: the
 * framework's bootstrap script injects further script tags, and enumerating
 * those by hash is unmaintainable. Under 'strict-dynamic' a script trusted by
 * nonce may load others, while an injected tag — which has no nonce and no
 * trusted parent — cannot. Modern browsers ignore 'self' when
 * 'strict-dynamic' is present; it is kept for older ones that ignore
 * 'strict-dynamic' instead, so neither is left without a rule.
 *
 * `style-src` keeps 'unsafe-inline' and that is not an oversight. A nonce
 * applies to `<style>` elements, not to inline `style=""` attributes, and the
 * design system sets CSS custom properties per element (--reveal-delay, chart
 * geometry) across the component library. Inline styles cannot execute
 * script, so this is a materially smaller exposure than the script-src hole
 * it sat next to — but it is still a gap, not a clean bill of health.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is the webpack HMR runtime and must never reach production.
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** 128 bits, base64. Regenerated per response — a reused nonce is no nonce. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');

  /**
   * Stamp the policy on every response.
   *
   * Applied through one helper rather than at each `return` because middleware
   * has six exit paths — next, json, two redirects, a rewrite, and the
   * authenticated pass-through. A policy attached at five of them is a policy
   * with a hole, and the missing one is invariably the error path an attacker
   * is most interested in.
   */
  const stamp = (res: NextResponse) => {
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  /**
   * Request headers carrying the nonce.
   *
   * Server components read it via `headers()`; Next also reads the CSP from
   * the request to nonce its own bootstrap and chunk-loading scripts, which is
   * what makes 'strict-dynamic' viable without hashing framework internals.
   */
  const requestHeaders = (extra?: Record<string, string>) => {
    const headers = new Headers(req.headers);
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    for (const [k, v] of Object.entries(extra ?? {})) headers.set(k, v);
    return headers;
  };

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // ---- Unauthenticated ------------------------------------------------
  if (!session) {
    if (PUBLIC_ROUTES.has(pathname) || ALWAYS_ALLOWED.has(pathname)) {
      return stamp(NextResponse.next({ request: { headers: requestHeaders() } }));
    }
    if (pathname.startsWith('/api/')) {
      return stamp(NextResponse.json({ error: 'Authentication required.' }, { status: 401 }));
    }
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    // Preserve the destination so sign-in lands where the user was headed.
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
    return stamp(NextResponse.redirect(login));
  }

  // ---- Authenticated --------------------------------------------------
  // Signing out while signed in must not bounce to the dashboard.
  if (pathname === '/api/auth/logout') {
    return stamp(NextResponse.next({ request: { headers: requestHeaders() } }));
  }

  if (pathname === '/login') {
    const home = req.nextUrl.clone();
    home.pathname = '/dashboard';
    home.search = '';
    return stamp(NextResponse.redirect(home));
  }

  // API routes are authenticated but not permission-mapped here; the handlers
  // that expose privileged figures check their own permission.
  if (pathname.startsWith('/api/') || ALWAYS_ALLOWED.has(pathname)) {
    return stamp(withUser(requestHeaders(), session.role, session.name));
  }

  const required = permissionsForRoute(pathname);
  if (required && required.length > 0 && !canAny(session.role, required)) {
    const forbidden = req.nextUrl.clone();
    forbidden.pathname = '/forbidden';
    // The role travels in the URL so /forbidden can render entirely on the
    // server. Reading it from client state instead forced the page behind a
    // Suspense boundary, which server-rendered as an empty document — a
    // refusal that looks like a broken page teaches the wrong lesson.
    forbidden.search =
      `?from=${encodeURIComponent(pathname)}&role=${encodeURIComponent(session.role)}`;
    return stamp(
      NextResponse.rewrite(forbidden, { request: { headers: requestHeaders() } })
    );
  }

  return stamp(withUser(requestHeaders(), session.role, session.name));
}

/**
 * Forward the verified identity to server components as request headers, so
 * nothing downstream has to re-parse the cookie or trust a client value.
 */
function withUser(headers: Headers, role: string, name: string) {
  headers.set('x-capexiq-role', role);
  headers.set('x-capexiq-user', name);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own assets and the public file surface.
     * `_next/static` and `_next/image` are build output with no session
     * relevance, and running HMAC verification per asset request would add
     * latency to every image on the page.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
};
