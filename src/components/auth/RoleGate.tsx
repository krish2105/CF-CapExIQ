'use client';

import React from 'react';
import Link from 'next/link';
import { can, canAny, roleLabel, type Permission } from '@/lib/auth/permissions';
import { Lock } from 'lucide-react';

/**
 * The active Executive Lens, from the verified session.
 *
 * Re-exported here so the many existing `useRole()` call sites keep working;
 * the value now comes from `RoleProvider` (server-supplied) rather than from
 * the persisted store, where it was editable from devtools.
 */
import { useRole } from './RoleProvider';
export { useRole };

/**
 * `can(permission)` bound to the active lens.
 *
 * A null role — no session — holds nothing. Previously the store defaulted to
 * CFO, so a tree rendered without a session showed the fullest lens in the
 * matrix.
 */
export function usePermission(permission: Permission): boolean {
  const role = useRole();
  return role ? can(role, permission) : false;
}

export function usePermissions(permissions: readonly Permission[]): boolean {
  const role = useRole();
  if (!role) return false;
  return canAny(role, permissions);
}

interface RoleGateProps {
  children: React.ReactNode;
  /** Visible when the lens holds AT LEAST ONE of these. Empty = always. */
  require: Permission[];
  /**
   * What to render when the lens lacks the permission.
   *  - 'hide'    → render nothing (default; use inside grids where an empty
   *                slot would otherwise leave a hole in the layout)
   *  - 'notice'  → an explicit "out of lens" placeholder, so the omission is
   *                legible rather than looking like a loading failure
   */
  fallback?: 'hide' | 'notice';
  /** Names the withheld content in the notice, e.g. "Cash-flow schedule". */
  label?: string;
  className?: string;
}

/**
 * Gates a subtree behind the active Executive Lens.
 *
 * Prefer `fallback="notice"` for whole panels: silently vanishing a card
 * teaches users the app is broken. Prefer `"hide"` for inline chrome (a
 * single stat in a row) where a placeholder would be noisier than the gap.
 */
export function RoleGate({
  children,
  require,
  fallback = 'hide',
  label,
  className,
}: RoleGateProps) {
  const allowed = usePermissions(require);
  const role = useRole();

  if (allowed) return <>{children}</>;
  if (fallback === 'hide') return null;

  return (
    <div
      className={`glass-panel p-5 flex items-start gap-3 ${className ?? ''}`}
      data-no-reveal
    >
      <span className="icon-well h-8 w-8 shrink-0 text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">
          {label ?? 'This module'} is outside
          {role ? ` the ${roleLabel(role)} lens` : ' your access'}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {/* The lens is no longer switchable — it is the signed-in identity,
              not a dropdown — so the old "switch the Executive Lens" copy
              described a control that does not exist. */}
          Your signed-in role does not hold the permission this module requires.
          Ask the Capital Committee if you need it added.
        </p>
      </div>
    </div>
  );
}

/**
 * Full-page guard for a route the active lens cannot open. Rendered instead
 * of the page body, with a route back to a destination the role *can* reach.
 */
export function RouteGuard({
  require,
  title,
  children,
}: {
  require: Permission[];
  title: string;
  children: React.ReactNode;
}) {
  const allowed = usePermissions(require);
  const role = useRole();

  if (allowed) return <>{children}</>;

  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-5" data-no-reveal>
      <span className="icon-well h-12 w-12 mx-auto text-muted-foreground">
        <Lock className="h-5 w-5" />
      </span>
      <div className="space-y-2">
        <h2 className="font-display text-[clamp(24px,2.4vw,32px)] text-foreground">
          {title} is restricted
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {role ? (
            <>
              The <strong className="text-foreground font-medium">{roleLabel(role)}</strong> lens
              does not hold the permission required to view this module.
            </>
          ) : (
            <>This module requires a signed-in role that holds the relevant permission.</>
          )}{' '}
          This is a governance boundary, not an error.
        </p>
      </div>
      <Link href="/dashboard" className="btn-primary inline-flex">
        Return to Executive Dashboard
      </Link>
    </div>
  );
}
