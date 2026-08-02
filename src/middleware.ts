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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // ---- Unauthenticated ------------------------------------------------
  if (!session) {
    if (PUBLIC_ROUTES.has(pathname) || ALWAYS_ALLOWED.has(pathname)) {
      return NextResponse.next();
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    // Preserve the destination so sign-in lands where the user was headed.
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // ---- Authenticated --------------------------------------------------
  // Signing out while signed in must not bounce to the dashboard.
  if (pathname === '/api/auth/logout') return NextResponse.next();

  if (pathname === '/login') {
    const home = req.nextUrl.clone();
    home.pathname = '/dashboard';
    home.search = '';
    return NextResponse.redirect(home);
  }

  // API routes are authenticated but not permission-mapped here; the handlers
  // that expose privileged figures check their own permission.
  if (pathname.startsWith('/api/') || ALWAYS_ALLOWED.has(pathname)) {
    return withUser(req, session.role, session.name);
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
    return NextResponse.rewrite(forbidden);
  }

  return withUser(req, session.role, session.name);
}

/**
 * Forward the verified identity to server components as request headers, so
 * nothing downstream has to re-parse the cookie or trust a client value.
 */
function withUser(req: NextRequest, role: string, name: string) {
  const headers = new Headers(req.headers);
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
