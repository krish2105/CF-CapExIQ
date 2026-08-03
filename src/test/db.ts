import { getDb, migrate } from '@/lib/db/client';

/**
 * Return the database to a freshly-migrated, empty state.
 *
 * Discovers tables and triggers from `sqlite_master` rather than naming them.
 * A hand-maintained drop list silently rots: adding migration 2 left the
 * previous list dropping only migration 1's tables, so `migrate()` saw an
 * empty `schema_migrations`, replayed everything, and collided with the
 * tables that were still there — 26 failures in a suite that had nothing to
 * do with the change.
 *
 * `DELETE` is not an option here: the audit and approval tables are
 * append-only by trigger, which is the property under test elsewhere. Dropping
 * and re-migrating is also a standing check that the migrations actually run
 * from nothing.
 */
export function resetDatabase(): void {
  const db = getDb();

  db.exec('PRAGMA foreign_keys = OFF');

  const triggers = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'")
    .all() as unknown as Array<{ name: string }>;
  for (const t of triggers) db.exec(`DROP TRIGGER IF EXISTS ${t.name}`);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as unknown as Array<{ name: string }>;
  for (const t of tables) db.exec(`DROP TABLE IF EXISTS ${t.name}`);

  db.exec('PRAGMA foreign_keys = ON');

  migrate(db);
}
