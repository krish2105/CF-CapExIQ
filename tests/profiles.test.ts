import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '@/lib/db/client';
import { resetDatabase } from '@/test/db';
import {
  seedProfiles,
  listProfiles,
  getProfile,
  createProfile,
  updateProfileAssumptions,
  getWorkspace,
  setWorkspace,
  ProfileConflictError,
} from '@/lib/db/repositories/profiles';
import { listAudit } from '@/lib/db/repositories/audit';
import { issueTestSession } from '@/test/session';

const SEEDS = [
  {
    id: 'proj-a',
    name: 'Dubai MFC',
    description: 'Base case',
    assumptions: { automationEquipment: 18_000_000, discountRate: 0.115 },
  },
  {
    id: 'proj-b',
    name: 'Abu Dhabi Darkstore',
    description: 'Expansion',
    assumptions: { automationEquipment: 12_000_000, discountRate: 0.12 },
  },
];

let actor: { userId: string; role: 'CFO' };

beforeEach(async () => {
  resetDatabase();

  const session = await issueTestSession('CFO');
  actor = { userId: session.userId, role: 'CFO' };
  seedProfiles(SEEDS);
});

describe('seeding', () => {
  it('populates an empty table and sets an active profile', () => {
    expect(listProfiles()).toHaveLength(2);
    expect(getWorkspace().activeProfileId).toBe('proj-a');
  });

  it('never overwrites existing profiles', () => {
    // Someone's edited model must not be reverted by the next deploy.
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.09 }, actor });
    expect(seedProfiles(SEEDS).inserted).toBe(0);
    expect(getProfile('proj-a')?.assumptions.discountRate).toBe(0.09);
  });
});

describe('the model is shared, not per-browser', () => {
  it('one user\'s change is visible to the next reader', () => {
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.095 }, actor });
    // A second reader — a different session entirely — sees the same figure.
    expect(getProfile('proj-a')?.assumptions.discountRate).toBe(0.095);
  });

  it('survives a reconnect', () => {
    updateProfileAssumptions({ id: 'proj-a', assumptions: { automationEquipment: 19_500_000 }, actor });
    expect(listProfiles().find((p) => p.id === 'proj-a')?.assumptions.automationEquipment).toBe(
      19_500_000
    );
  });
});

describe('audit', () => {
  it('records one event per changed field, with before and after', () => {
    updateProfileAssumptions({
      id: 'proj-a',
      assumptions: { discountRate: 0.095, automationEquipment: 20_000_000 },
      actor,
    });

    const events = listAudit({ action: 'assumption.changed' });
    expect(events.total).toBe(2);
    const summaries = events.events.map((e) => e.summary).join(' | ');
    expect(summaries).toMatch(/discountRate: 0\.115 → 0\.095/);
    expect(summaries).toMatch(/automationEquipment/);
  });

  it('does not record fields that did not change', () => {
    // A client PATCHing the whole object on every keystroke would otherwise
    // bury the real changes under identical no-op rows.
    updateProfileAssumptions({
      id: 'proj-a',
      assumptions: { discountRate: 0.115, automationEquipment: 20_000_000 },
      actor,
    });
    expect(listAudit({ action: 'assumption.changed' }).total).toBe(1);
  });

  it('attributes the change to the signed-in user', () => {
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.1 }, actor });
    const event = listAudit({ action: 'assumption.changed' }).events[0];
    expect(event.actorUserId).toBe(actor.userId);
    expect(event.actorRole).toBe('CFO');
  });

  it('records profile creation', () => {
    createProfile({
      id: 'proj-c',
      name: 'Sharjah Hub',
      assumptions: { discountRate: 0.13 },
      actor,
    });
    expect(listAudit({ action: 'assumption.changed' }).events[0].summary).toMatch(/Created/);
  });
});

describe('concurrent edits', () => {
  it('increments the version on every write', () => {
    expect(getProfile('proj-a')?.version).toBe(1);
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.1 }, actor });
    expect(getProfile('proj-a')?.version).toBe(2);
  });

  it('rejects a write based on a stale version', () => {
    // Two analysts open the same profile at version 1. The first saves.
    const stale = getProfile('proj-a')!.version;
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.1 }, actor });

    // The second saves against the version they read — and must be told,
    // rather than silently overwriting work they never saw.
    expect(() =>
      updateProfileAssumptions({
        id: 'proj-a',
        assumptions: { discountRate: 0.2 },
        expectedVersion: stale,
        actor,
      })
    ).toThrow(ProfileConflictError);

    expect(getProfile('proj-a')?.assumptions.discountRate).toBe(0.1);
  });

  it('leaves no audit rows behind when a write is rejected', () => {
    const stale = getProfile('proj-a')!.version;
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.1 }, actor });
    const before = listAudit({ action: 'assumption.changed' }).total;

    try {
      updateProfileAssumptions({
        id: 'proj-a',
        assumptions: { discountRate: 0.2 },
        expectedVersion: stale,
        actor,
      });
    } catch {
      /* expected */
    }

    // The rollback has to take the audit rows with it.
    expect(listAudit({ action: 'assumption.changed' }).total).toBe(before);
  });

  it('allows a write that opts out of version checking', () => {
    updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.1 }, actor });
    expect(() =>
      updateProfileAssumptions({ id: 'proj-a', assumptions: { discountRate: 0.2 }, actor })
    ).not.toThrow();
  });
});

describe('workspace', () => {
  it('switches the active profile for everyone', () => {
    setWorkspace({ activeProfileId: 'proj-b' }, actor);
    expect(getWorkspace().activeProfileId).toBe('proj-b');
  });

  it('holds exactly one row no matter how often it is set', () => {
    setWorkspace({ activeProfileId: 'proj-b' }, actor);
    setWorkspace({ selectedScenario: 'Pessimistic' }, actor);
    const rows = getDb().prepare('SELECT COUNT(*) AS n FROM workspace_state').get() as { n: number };
    expect(rows.n).toBe(1);
  });

  it('keeps unspecified fields unchanged', () => {
    setWorkspace({ activeProfileId: 'proj-b' }, actor);
    setWorkspace({ selectedScenario: 'Optimistic' }, actor);
    const state = getWorkspace();
    expect(state.activeProfileId).toBe('proj-b');
    expect(state.selectedScenario).toBe('Optimistic');
  });

  it('cannot point at a profile that does not exist', () => {
    // The FK is real; a dangling active profile would break every page load.
    expect(() => setWorkspace({ activeProfileId: 'proj-nope' }, actor)).toThrow();
  });
});

describe('unknown profiles', () => {
  it('reports rather than creating one implicitly', () => {
    expect(() =>
      updateProfileAssumptions({ id: 'proj-missing', assumptions: { discountRate: 0.1 }, actor })
    ).toThrow(/No such profile/);
  });
});
