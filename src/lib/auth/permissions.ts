import { ExecutiveRole } from '@/lib/types/finance';

/**
 * Role-based access control for the CapExIQ decision platform.
 *
 * The "Executive Lens" was previously cosmetic — `selectedRole` was read in
 * three places and only ever printed as a label, so a COO and a CFO saw byte
 * -identical output. This module turns it into a real authorisation boundary:
 * every capability in the app maps to a permission, and every permission maps
 * to the set of roles that hold it.
 *
 * SCOPE — read this before relying on it for anything real.
 * This is *presentation-layer* authorisation. It decides what a signed-in
 * executive is shown, which is a governance / need-to-know control, not a
 * security control: the store is client-side and a determined user can edit
 * it. Nothing here protects a secret. The moment real authentication exists,
 * these same PERMISSION keys must be re-checked server-side in the route
 * handlers before any privileged figure is returned. Treating this file as a
 * security boundary would be a mistake.
 */

export const PERMISSIONS = [
  'metrics.headline',      // NPV, initial outlay — the at-a-glance position
  'metrics.advanced',      // MIRR, PI, discounted payback — analyst-grade detail
  'financials.schedule',   // full year-by-year cash-flow schedule
  'assumptions.view',
  'assumptions.edit',      // mutates the model; write access
  'scenario.switch',
  'scenario.author',       // custom scenario sliders / generative studio
  'risk.view',
  'risk.mitigation',       // management responses to risk alerts
  'portfolio.view',
  'operations.view',       // capacity, delivery analytics, DEWA tariff
  'vendor.view',
  'vendor.negotiate',      // RFP negotiator — commercially sensitive
  'esg.view',
  'funding.view',          // funding structure, liquidity, green loan terms
  'approval.sign',         // sign & lock the decision snapshot
  'board.materials',       // board memo, debate swarm, presentation mode
  'ai.advisory',
  'audit.view',            // assumption audit log / data lineage
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

interface RoleDefinition {
  label: string;
  /** Shown in the role switcher so the lens change is self-explanatory. */
  summary: string;
  permissions: ReadonlySet<Permission>;
}

const define = (
  label: string,
  summary: string,
  permissions: readonly Permission[]
): RoleDefinition => ({ label, summary, permissions: new Set(permissions) });

/**
 * The matrix. Deliberately explicit rather than derived from a hierarchy —
 * these roles are not a strict ladder (a CTO sees operational depth a CEO
 * does not; a CEO signs approvals a CTO cannot), so an inheritance chain
 * would encode a seniority order that does not actually exist.
 */
export const ROLE_DEFINITIONS: Record<ExecutiveRole, RoleDefinition> = {
  CEO: define(
    'CEO — Chief Executive',
    'Headline position, board materials and final approval authority. Analyst-grade detail is summarised, not itemised.',
    [
      'metrics.headline',
      'scenario.switch',
      'risk.view',
      'portfolio.view',
      'esg.view',
      'approval.sign',
      'board.materials',
      'ai.advisory',
      'assumptions.view',
    ]
  ),

  CFO: define(
    'CFO — Chief Financial',
    'Full financial depth: advanced metrics, cash-flow schedule, funding structure, and write access to the assumption register.',
    [
      'metrics.headline',
      'metrics.advanced',
      'financials.schedule',
      'assumptions.view',
      'assumptions.edit',
      'scenario.switch',
      'scenario.author',
      'risk.view',
      'risk.mitigation',
      'portfolio.view',
      'vendor.view',
      'esg.view',
      'funding.view',
      'approval.sign',
      'board.materials',
      'ai.advisory',
      'audit.view',
      'settings.manage',
    ]
  ),

  COO: define(
    'COO — Chief Operations',
    'Operational delivery, capacity and vendor performance. Funding structure and approval authority are out of lens.',
    [
      'metrics.headline',
      'assumptions.view',
      'scenario.switch',
      'risk.view',
      'risk.mitigation',
      'operations.view',
      'vendor.view',
      'vendor.negotiate',
      'esg.view',
      'ai.advisory',
    ]
  ),

  CTO: define(
    'CTO — Chief Technology',
    'Automation capacity, technology vendor fit and the facility digital twin. Financial schedule is out of lens.',
    [
      'metrics.headline',
      'assumptions.view',
      'scenario.switch',
      'risk.view',
      'operations.view',
      'vendor.view',
      'esg.view',
      'ai.advisory',
    ]
  ),

  'Capital Committee': define(
    'Capital Committee',
    'Governance view: full metrics and risk posture for the approval decision, without write access to the underlying model.',
    [
      'metrics.headline',
      'metrics.advanced',
      'financials.schedule',
      'assumptions.view',
      'scenario.switch',
      'risk.view',
      'risk.mitigation',
      'portfolio.view',
      'vendor.view',
      'esg.view',
      'funding.view',
      'approval.sign',
      'board.materials',
      'ai.advisory',
      'audit.view',
    ]
  ),

  Analyst: define(
    'Analyst — Detailed',
    'Deepest modelling access — every figure, schedule and audit trail — but no signing authority and no board-facing materials.',
    [
      'metrics.headline',
      'metrics.advanced',
      'financials.schedule',
      'assumptions.view',
      'assumptions.edit',
      'scenario.switch',
      'scenario.author',
      'risk.view',
      'risk.mitigation',
      'portfolio.view',
      'operations.view',
      'vendor.view',
      'vendor.negotiate',
      'esg.view',
      'funding.view',
      'ai.advisory',
      'audit.view',
    ]
  ),
};

export const ALL_ROLES = Object.keys(ROLE_DEFINITIONS) as ExecutiveRole[];

/**
 * A null role means "no session".
 *
 * These accept it explicitly and hold nothing, rather than forcing every call
 * site to invent a placeholder. The lens now comes from the verified session
 * (see `RoleProvider`), which is genuinely absent before sign-in — and the
 * previous arrangement defaulted to CFO, so an unauthenticated tree rendered
 * the fullest lens in the matrix.
 */
export type MaybeRole = ExecutiveRole | null | undefined;

/** Does `role` hold `permission`? */
export function can(role: MaybeRole, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_DEFINITIONS[role]?.permissions.has(permission) ?? false;
}

/** Does `role` hold every one of `permissions`? Empty list = unrestricted. */
export function canAll(role: MaybeRole, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

/**
 * Does `role` hold at least one of `permissions`?
 *
 * An empty list stays unrestricted even for a null role: those are the routes
 * that require only a session, and authentication is enforced by middleware
 * rather than here.
 */
export function canAny(role: MaybeRole, permissions: readonly Permission[]): boolean {
  return permissions.length === 0 || permissions.some((p) => can(role, p));
}

export function roleSummary(role: MaybeRole): string {
  return role ? ROLE_DEFINITIONS[role]?.summary ?? '' : '';
}

export function roleLabel(role: MaybeRole): string {
  if (!role) return 'Signed out';
  return ROLE_DEFINITIONS[role]?.label ?? role;
}

export function permissionCount(role: MaybeRole): number {
  if (!role) return 0;
  return ROLE_DEFINITIONS[role]?.permissions.size ?? 0;
}
