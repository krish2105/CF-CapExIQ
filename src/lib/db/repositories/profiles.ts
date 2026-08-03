import { getDb, transaction } from '../client';
import { recordAudit } from './audit';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Project profiles and the shared working model.
 *
 * The assumptions are stored as a JSON document rather than a column per
 * field. `FinancialAssumptions` has roughly thirty numeric members and gains
 * one whenever the model grows a driver; a column-per-field schema would mean
 * a migration for every product change, and nothing here ever queries an
 * individual assumption — the finance engine always loads the whole set.
 *
 * The cost of that choice is that the database cannot constrain individual
 * values, so validation lives in the Zod schema at the API boundary instead.
 * That is the right place for it anyway: a bad discount rate is a request
 * error, and returning 400 with the offending field is more useful than a
 * CHECK constraint violation surfacing as a 500.
 */

export interface StoredProfile {
  id: string;
  name: string;
  description: string;
  assumptions: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
}

interface ProfileRow {
  id: string;
  name: string;
  description: string;
  assumptions_json: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  version: number;
  archived_at: string | null;
}

function toProfile(row: ProfileRow): StoredProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    assumptions: JSON.parse(row.assumptions_json),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    version: row.version,
  };
}

/** Seed the shipped defaults once, on an empty table. */
export function seedProfiles(
  seeds: Array<{ id: string; name: string; description: string; assumptions: unknown }>
): { inserted: number } {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS n FROM project_profiles').get() as { n: number };
  if (existing.n > 0) return { inserted: 0 };

  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO project_profiles (id, name, description, assumptions_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    for (const s of seeds) {
      insert.run(s.id, s.name, s.description, JSON.stringify(s.assumptions), now, now);
    }
    db.prepare(
      `INSERT OR IGNORE INTO workspace_state (id, active_profile_id, selected_scenario, updated_at)
       VALUES (1, ?, 'Base', ?)`
    ).run(seeds[0]?.id ?? null, now);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { inserted: seeds.length };
}

export function listProfiles(): StoredProfile[] {
  const rows = getDb()
    .prepare('SELECT * FROM project_profiles WHERE archived_at IS NULL ORDER BY created_at ASC')
    .all() as unknown as ProfileRow[];
  return rows.map(toProfile);
}

export function getProfile(id: string): StoredProfile | undefined {
  const row = getDb().prepare('SELECT * FROM project_profiles WHERE id = ?').get(id) as
    | ProfileRow
    | undefined;
  return row ? toProfile(row) : undefined;
}

export interface WorkspaceState {
  activeProfileId: string | null;
  selectedScenario: string;
  updatedAt: string;
}

export function getWorkspace(): WorkspaceState {
  const row = getDb()
    .prepare('SELECT active_profile_id, selected_scenario, updated_at FROM workspace_state WHERE id = 1')
    .get() as
    | { active_profile_id: string | null; selected_scenario: string; updated_at: string }
    | undefined;

  return {
    activeProfileId: row?.active_profile_id ?? null,
    selectedScenario: row?.selected_scenario ?? 'Base',
    updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

export function setWorkspace(
  input: { activeProfileId?: string; selectedScenario?: string },
  actor: { userId: string; role: ExecutiveRole }
): WorkspaceState {
  const current = getWorkspace();
  const next = {
    activeProfileId: input.activeProfileId ?? current.activeProfileId,
    selectedScenario: input.selectedScenario ?? current.selectedScenario,
  };

  getDb()
    .prepare(
      `INSERT INTO workspace_state (id, active_profile_id, selected_scenario, updated_at, updated_by)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         active_profile_id = excluded.active_profile_id,
         selected_scenario = excluded.selected_scenario,
         updated_at        = excluded.updated_at,
         updated_by        = excluded.updated_by`
    )
    .run(next.activeProfileId, next.selectedScenario, new Date().toISOString(), actor.userId);

  return getWorkspace();
}

export class ProfileConflictError extends Error {
  constructor(
    readonly expected: number,
    readonly actual: number
  ) {
    super(
      `This profile was changed by someone else (you had version ${expected}, it is now ${actual}). ` +
        `Reload to see their changes before saving yours.`
    );
    this.name = 'ProfileConflictError';
  }
}

export interface UpdateProfileInput {
  id: string;
  assumptions: Record<string, unknown>;
  /** Version the caller last read. Omit only for a first write. */
  expectedVersion?: number;
  actor: { userId: string; role: ExecutiveRole };
  ip?: string | null;
}

/**
 * Update a profile's assumptions.
 *
 * Every changed field becomes its own audit row, so the trail reads as
 * "Rashid Kamal changed discountRate from 0.115 to 0.095" rather than
 * "assumptions updated". A diff nobody can read is not an audit trail — that
 * was the substance of the finding this table exists to close.
 *
 * The whole thing is one transaction: the write and its audit rows cannot
 * diverge, and a rejected version check leaves nothing behind.
 */
export function updateProfileAssumptions(input: UpdateProfileInput): StoredProfile {
  return transaction((db) => {
    const row = db.prepare('SELECT * FROM project_profiles WHERE id = ?').get(input.id) as
      | ProfileRow
      | undefined;

    if (!row) throw new Error(`No such profile: ${input.id}`);

    if (input.expectedVersion !== undefined && input.expectedVersion !== row.version) {
      throw new ProfileConflictError(input.expectedVersion, row.version);
    }

    const before = JSON.parse(row.assumptions_json) as Record<string, unknown>;
    const after = { ...before, ...input.assumptions };
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE project_profiles
          SET assumptions_json = ?, updated_at = ?, updated_by = ?, version = version + 1
        WHERE id = ?`
    ).run(JSON.stringify(after), now, input.actor.userId, input.id);

    for (const [field, newValue] of Object.entries(input.assumptions)) {
      const oldValue = before[field];
      // Unchanged fields are not events. A client that PATCHes the whole
      // object every keystroke would otherwise bury the real changes.
      if (oldValue === newValue) continue;

      recordAudit({
        actorUserId: input.actor.userId,
        actorRole: input.actor.role,
        action: 'assumption.changed',
        entity: 'profile',
        entityId: input.id,
        summary: `${field}: ${String(oldValue ?? '—')} → ${String(newValue)}`,
        beforeValue: oldValue,
        afterValue: newValue,
        ip: input.ip ?? null,
      });
    }

    return toProfile(
      db.prepare('SELECT * FROM project_profiles WHERE id = ?').get(input.id) as unknown as ProfileRow
    );
  });
}

export function createProfile(input: {
  id: string;
  name: string;
  description?: string;
  assumptions: Record<string, unknown>;
  actor: { userId: string; role: ExecutiveRole };
}): StoredProfile {
  const now = new Date().toISOString();

  return transaction((db) => {
    db.prepare(
      `INSERT INTO project_profiles
         (id, name, description, assumptions_json, created_by, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.id,
      input.name,
      input.description ?? '',
      JSON.stringify(input.assumptions),
      input.actor.userId,
      now,
      now,
      input.actor.userId
    );

    recordAudit({
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
      action: 'assumption.changed',
      entity: 'profile',
      entityId: input.id,
      summary: `Created project profile "${input.name}"`,
      afterValue: { name: input.name },
    });

    return toProfile(
      db.prepare('SELECT * FROM project_profiles WHERE id = ?').get(input.id) as unknown as ProfileRow
    );
  });
}
