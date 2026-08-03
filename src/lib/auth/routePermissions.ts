import type { Permission } from './permissions';

/**
 * Route → required permissions, for edge middleware.
 *
 * Duplicated from NAV_SECTIONS rather than imported because that module pulls
 * in lucide-react for its icons, and dragging an icon library into the Edge
 * middleware bundle to read four string fields is not a trade worth making.
 *
 * The duplication is held honest by `tests/auth.test.ts`, which fails if any
 * navigable route is missing here or if the permission lists diverge — so the
 * two cannot silently drift.
 */

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/': [],
  '/dashboard': ['metrics.headline'],
  '/approvals': ['approval.sign'],
  '/board-memo': ['board.materials'],
  '/board-debate': ['board.materials'],
  '/presentation': ['board.materials'],

  '/financial-model': ['financials.schedule'],
  '/assumptions': ['assumptions.view'],
  '/capacity-model': ['operations.view'],
  '/electricity-estimator': ['operations.view'],
  '/funding': ['funding.view'],
  '/external-data': ['assumptions.view'],

  '/scenarios': ['scenario.switch'],
  '/sensitivity': ['metrics.advanced'],
  '/monte-carlo': ['metrics.advanced'],
  '/ai-scenario-studio': ['scenario.author'],
  '/ai-threat-radar': ['risk.view'],
  '/real-options': ['metrics.advanced'],

  '/portfolio': ['portfolio.view'],
  '/strategic-scorecard': ['portfolio.view'],
  '/operational-analytics': ['operations.view'],
  '/vendor-analysis': ['vendor.view'],
  '/rfp-negotiator': ['vendor.negotiate'],
  '/benefits-tracker': ['portfolio.view'],
  '/implementation-plan': ['operations.view'],
  '/esg-sustainability': ['esg.view'],

  '/ai-assistant': ['ai.advisory'],
  '/3d-digital-twin': ['operations.view'],
  '/data-sources': [],
  '/csv-management': ['audit.view'],
  '/settings': ['settings.manage'],

  '/printable-report': ['board.materials'],
};

/**
 * Routes reachable without a session.
 *
 * The auth endpoints must be here or the system deadlocks: middleware 401s
 * every unauthenticated `/api/*` request, which includes the very endpoint
 * that issues the session, so signing in would require already being signed
 * in. Logout is public too — a caller with an expired cookie still needs to
 * be able to clear it.
 */
export const PUBLIC_ROUTES = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  // The second-factor step runs between password and session, so by
  // definition the caller has no session yet. It is not unauthenticated: it
  // requires the signed challenge that only a correct password produces.
  '/api/auth/mfa',
]);

/**
 * Permissions required for a pathname.
 *
 * Returns `undefined` for an unknown route. Callers must treat that as
 * "authenticated users only, no extra permission" rather than as "open" — a
 * new page added without a matching entry should be reachable by signed-in
 * users, not by the public.
 */
export function permissionsForRoute(pathname: string): Permission[] | undefined {
  return ROUTE_PERMISSIONS[pathname];
}
