import React from 'react';
import Link from 'next/link';
import { ROLE_DEFINITIONS, roleLabel } from '@/lib/auth/permissions';
import { ROUTE_PERMISSIONS } from '@/lib/auth/routePermissions';
import type { ExecutiveRole } from '@/lib/types/finance';
import { Lock, ArrowRight } from 'lucide-react';

/**
 * Shown when middleware rewrites a request the signed-in role cannot open.
 *
 * A server component reading `searchParams`, deliberately: an earlier client
 * version used `useSearchParams`, which forced a Suspense boundary and
 * server-rendered as an empty document. A refusal that arrives as a blank
 * page is indistinguishable from a crash.
 *
 * It names the specific permission that was missing rather than returning a
 * bare 403 — on a governance surface the useful question is "who can see this,
 * and should I be one of them", which an opaque refusal cannot answer.
 */

export const dynamic = 'force-dynamic';

export default function ForbiddenPage({
  searchParams,
}: {
  searchParams: { from?: string; role?: string };
}) {
  const from = searchParams.from ?? '';
  const role = (searchParams.role as ExecutiveRole) ?? 'Analyst';
  const known = role in ROLE_DEFINITIONS;

  const required = ROUTE_PERMISSIONS[from] ?? [];
  const holders = (Object.keys(ROLE_DEFINITIONS) as ExecutiveRole[]).filter((r) =>
    required.some((p) => ROLE_DEFINITIONS[r].permissions.has(p))
  );

  return (
    <div className="max-w-xl mx-auto py-20 text-center space-y-6" data-no-reveal>
      <span className="icon-well h-12 w-12 mx-auto text-muted-foreground">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>

      <div className="space-y-2">
        <h1 className="font-display text-[clamp(26px,2.6vw,34px)] text-foreground">
          Outside your authority
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {from && required.length > 0 ? (
            <>
              <code className="font-mono text-foreground">{from}</code> requires{' '}
              {required.map((p, i) => (
                <React.Fragment key={p}>
                  {i > 0 && ' or '}
                  <code className="font-mono text-primary">{p}</code>
                </React.Fragment>
              ))}
              , which the{' '}
              <strong className="text-foreground font-medium">
                {known ? roleLabel(role) : role}
              </strong>{' '}
              role does not hold.
            </>
          ) : (
            <>
              The{' '}
              <strong className="text-foreground font-medium">
                {known ? roleLabel(role) : role}
              </strong>{' '}
              role does not hold the permission required for that module.
            </>
          )}
        </p>
      </div>

      {holders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Held by: {holders.map((r) => ROLE_DEFINITIONS[r].label).join(' · ')}
        </p>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
        This is a governance boundary, not an error. Requesting elevated access is a decision for
        the Capital Committee, not something the interface can grant.
      </p>

      <Link href="/dashboard" className="btn-primary inline-flex">
        Return to your dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
