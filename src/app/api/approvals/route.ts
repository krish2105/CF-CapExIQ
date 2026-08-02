import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import { listApprovals, signApproval } from '@/lib/db/repositories/approvals';
import { findById } from '@/lib/db/repositories/users';
import { clientKey } from '@/lib/guardrails/aiGuardrails';
import { MetricsSchema, AssumptionsSchema } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Capital approval records.
 *
 * Signing was a boolean in `localStorage`: no signer, no timestamp, no record
 * of which figures were approved, and the figures themselves editable
 * afterwards. This writes an immutable row carrying the full model snapshot
 * and a hash over it.
 */

const SignRequest = z.object({
  decision: z.enum([
    'APPROVED',
    'APPROVED WITH CONDITIONS',
    'DEFERRED',
    'REJECTED',
  ]),
  scenario: z.string().min(1).max(60),
  metrics: MetricsSchema,
  assumptions: AssumptionsSchema,
  note: z.string().max(2000).optional(),
});

/** List — `audit.view`, the governance read permission. */
export async function GET() {
  const auth = await requirePermission('audit.view');
  if (!auth.ok) return auth.response;

  const approvals = listApprovals();

  return NextResponse.json(
    {
      approvals: approvals.map((a) => ({
        ...a,
        decidedByName: findById(a.decidedByUserId)?.name ?? 'Unknown user',
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * Sign — `approval.sign`, which only CEO, CFO and the Capital Committee hold.
 *
 * The signer is taken from the verified session, never from the body. Letting
 * a client name the approver would make the entire record worthless: the one
 * field the row exists to establish would be self-asserted.
 */
export async function POST(req: Request) {
  const auth = await requirePermission('approval.sign');
  if (!auth.ok) return auth.response;

  const limited = rateLimited('approvals', auth.session);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const parsed = SignRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        message: 'A decision, scenario and model snapshot are required to sign.',
        issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const record = signApproval({
    userId: auth.session.sub,
    role: auth.session.role,
    decision: parsed.data.decision,
    scenario: parsed.data.scenario,
    metrics: parsed.data.metrics ?? {},
    assumptions: parsed.data.assumptions ?? {},
    note: parsed.data.note ?? null,
    ip: clientKey(req),
  });

  return NextResponse.json(
    { approval: { ...record, decidedByName: auth.session.name } },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
}
