import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/apiAuth';
import { listAudit, type AuditAction } from '@/lib/db/repositories/audit';
import { findById } from '@/lib/db/repositories/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The audit trail, for the roles that hold `audit.view`.
 *
 * Read-only by construction: there is no POST, PATCH or DELETE here, and the
 * table refuses writes other than inserts at the database level. An audit
 * endpoint that can modify the audit is not one.
 *
 * Actor names are resolved through `findById`, which deliberately includes
 * disabled accounts — a decision signed by someone who has since left must
 * still render their name, or the record stops being attributable at exactly
 * the point it matters.
 */
export async function GET(req: Request) {
  const auth = await requirePermission('audit.view');
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const action = url.searchParams.get('action') ?? undefined;

  const { events, total } = listAudit({
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
    action: (action as AuditAction) || undefined,
  });

  // Names are joined here rather than in SQL because the set of distinct
  // actors on a page of events is tiny, and keeping the repository free of
  // presentation concerns matters more than saving one query.
  const names = new Map<string, string>();
  for (const event of events) {
    if (event.actorUserId && !names.has(event.actorUserId)) {
      names.set(event.actorUserId, findById(event.actorUserId)?.name ?? 'Unknown user');
    }
  }

  return NextResponse.json(
    {
      total,
      events: events.map((e) => ({
        ...e,
        actorName: e.actorUserId ? names.get(e.actorUserId) ?? null : null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
