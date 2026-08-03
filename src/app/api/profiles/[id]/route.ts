import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import {
  getProfile,
  updateProfileAssumptions,
  ProfileConflictError,
} from '@/lib/db/repositories/profiles';
import { clientKey } from '@/lib/guardrails/aiGuardrails';
import { ensureProfilesSeeded } from '@/lib/db/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Bounds on the assumption values a client may write.
 *
 * The database stores assumptions as a JSON document, so it cannot constrain
 * individual fields — validation has to happen here. These are domain limits,
 * not formatting: a discount rate of 45 is 4500%, and a model that silently
 * accepts it produces an NPV that looks like a catastrophe and is really a
 * typo. Rejected rather than clamped, because clamping writes a number the
 * user never entered into a record someone may later sign.
 */
const AssumptionValue = z.union([
  z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  z.string().max(200),
  z.boolean(),
]);

const RATE_FIELDS = new Set([
  'discountRate',
  'corporateTaxRate',
  'operatingCostInflation',
  'benefitGrowthRate',
]);

const UpdateRequest = z.object({
  assumptions: z.record(AssumptionValue).refine(
    (obj) =>
      Object.entries(obj).every(([k, v]) =>
        RATE_FIELDS.has(k) ? typeof v === 'number' && v >= 0 && v <= 1 : true
      ),
    { message: 'Rates must be decimals between 0 and 1 (0.115 for 11.5%, not 11.5).' }
  ),
  /** Version last read. Omitting it opts out of conflict detection. */
  expectedVersion: z.number().int().min(1).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('assumptions.view');
  if (!auth.ok) return auth.response;

  ensureProfilesSeeded();
  const profile = getProfile(params.id);
  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requirePermission('assumptions.edit');
  if (!auth.ok) return auth.response;

  const limited = rateLimited('profile-update', auth.session);
  if (limited) return limited;

  ensureProfilesSeeded();

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const profile = updateProfileAssumptions({
      id: params.id,
      assumptions: parsed.data.assumptions,
      expectedVersion: parsed.data.expectedVersion,
      actor: { userId: auth.session.sub, role: auth.session.role },
      ip: clientKey(req),
    });

    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof ProfileConflictError) {
      // 409, not 400: the request was well-formed and would have been valid a
      // moment ago. The client needs to reload and decide, not correct itself.
      return NextResponse.json(
        { error: 'conflict', message: err.message, actualVersion: err.actual },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if ((err as Error).message?.startsWith('No such profile')) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    throw err;
  }
}
