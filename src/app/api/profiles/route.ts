import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, rateLimited } from '@/lib/auth/apiAuth';
import {
  listProfiles,
  getWorkspace,
  setWorkspace,
  createProfile,
} from '@/lib/db/repositories/profiles';
import { findById } from '@/lib/db/repositories/users';
import { ensureProfilesSeeded } from '@/lib/db/seed';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Project profiles — the shared capital model.
 *
 * `assumptions.view` to read, `assumptions.edit` to write, matching the
 * permission matrix. A COO can see the model they are being asked to approve
 * and cannot change it, which is the distinction the matrix draws and the
 * localStorage version could not enforce at all.
 */

export async function GET() {
  const auth = await requirePermission('assumptions.view');
  if (!auth.ok) return auth.response;

  ensureProfilesSeeded();

  const profiles = listProfiles();
  const names = new Map<string, string>();
  for (const p of profiles) {
    for (const id of [p.createdBy, p.updatedBy]) {
      if (id && !names.has(id)) names.set(id, findById(id)?.name ?? 'Unknown user');
    }
  }

  return NextResponse.json(
    {
      workspace: getWorkspace(),
      profiles: profiles.map((p) => ({
        ...p,
        createdByName: p.createdBy ? names.get(p.createdBy) ?? null : null,
        updatedByName: p.updatedBy ? names.get(p.updatedBy) ?? null : null,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

const CreateRequest = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  assumptions: z.record(z.union([z.number().finite(), z.string().max(200), z.boolean()])),
});

const WorkspaceRequest = z.object({
  activeProfileId: z.string().min(1).max(120).optional(),
  selectedScenario: z.enum(['Base', 'Optimistic', 'Pessimistic', 'Custom']).optional(),
});

/** Save a new profile, or switch which one the workspace is on. */
export async function POST(req: Request) {
  const auth = await requirePermission('assumptions.edit');
  if (!auth.ok) return auth.response;

  const limited = await rateLimited('profiles', auth.session);
  if (limited) return limited;

  ensureProfilesSeeded();
  const body = await req.json().catch(() => ({}));

  // Switching the active profile is a workspace change, not a model edit, and
  // is distinguished by shape rather than by a separate endpoint.
  const asWorkspace = WorkspaceRequest.safeParse(body);
  if (asWorkspace.success && !('name' in (body ?? {}))) {
    const state = setWorkspace(asWorkspace.data, {
      userId: auth.session.sub,
      role: auth.session.role,
    });
    return NextResponse.json({ workspace: state }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const parsed = CreateRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const profile = createProfile({
    id: `proj-${randomUUID().slice(0, 8)}`,
    name: parsed.data.name,
    description: parsed.data.description,
    assumptions: parsed.data.assumptions,
    actor: { userId: auth.session.sub, role: auth.session.role },
  });

  return NextResponse.json({ profile }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
