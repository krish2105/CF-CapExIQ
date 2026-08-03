import { seedProfiles } from './repositories/profiles';
import { DEFAULT_PROJECT_PROFILES } from '@/lib/store/useFinancialStore';

/**
 * Ensure the shipped project profiles exist.
 *
 * Lives here rather than in a route because it was originally called only
 * from `GET /api/profiles`, which made first-request order significant: a
 * `PATCH` issued before anything had listed the profiles got a 404 for a
 * profile the application considers to exist. That is the kind of bug that
 * never appears in a browser — the UI always lists before it edits — and
 * fails immediately for an API client or a test.
 *
 * Idempotent: `seedProfiles` is a no-op on a non-empty table, so an operator's
 * edits are never reverted by a later call.
 */
export function ensureProfilesSeeded(): void {
  seedProfiles(
    DEFAULT_PROJECT_PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      assumptions: p.assumptions,
    }))
  );
}
