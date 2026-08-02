import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MIGRATIONS } from './migrations';

/**
 * `node:sqlite` is resolved at runtime rather than imported statically.
 *
 * It is newer than the Node-builtin lists baked into both Vite 5 and the
 * webpack config Next 14 ships, so a static `import ... from 'node:sqlite'`
 * gets its prefix stripped and then fails resolving a package named
 * "sqlite" — at test collection under Vitest, and again at build under Next.
 * Going through `createRequire` makes the specifier opaque to both bundlers
 * and hands it to Node, which does have the module.
 *
 * Revisit once the toolchain catches up; this is a workaround for their
 * builtin lists, not for anything about SQLite.
 */
const nodeRequire = createRequire(import.meta.url);
type DatabaseSyncType = InstanceType<typeof import('node:sqlite').DatabaseSync>;
const { DatabaseSync } = nodeRequire('node:sqlite') as typeof import('node:sqlite');

/**
 * Database connection.
 *
 * WHY SQLITE, AND WHAT IT IS AND IS NOT
 *
 * The application had no datastore at all. Assumptions, the change log and the
 * approval record lived in `localStorage`, which meant they were per-browser,
 * erased on sign-out, attributable to nobody, and impossible to query. That is
 * the single reason this project could not be called production ready: an
 * investment platform whose audit trail a user can clear from devtools does
 * not have an audit trail.
 *
 * `node:sqlite` is Node's built-in binding — no dependency to install, no
 * native build step, no daemon. It is a real database: ACID transactions,
 * foreign keys, constraints, indexes, and durability across restarts. For a
 * single-instance deployment it is genuinely appropriate.
 *
 * It is NOT appropriate for more than one instance. SQLite is a file, so two
 * app servers cannot share it safely over a network filesystem, and the
 * writer lock is process-local. The moment this runs on more than one node,
 * this file is what changes — which is why every query lives behind the
 * repositories in `src/lib/db/repositories/` and no route handler builds SQL.
 * Swapping the driver should not touch a single caller.
 *
 * WHY NOT AN ORM
 *
 * Five tables, hand-written SQL, no lazy loading and no dialect abstraction to
 * leak. An ORM here would add a build step and a migration DSL to save perhaps
 * two hundred lines of SQL that is already the clearest description of the
 * schema.
 */

let instance: DatabaseSyncType | null = null;

/** Default location. Overridden by CAPEXIQ_DB_PATH, and by ':memory:' in tests. */
function databasePath(): string {
  return process.env.CAPEXIQ_DB_PATH ?? path.join(process.cwd(), '.data', 'capexiq.db');
}

function configure(db: DatabaseSyncType) {
  // Foreign keys are OFF by default in SQLite — every REFERENCES clause in the
  // schema is decorative until this runs, per connection.
  db.exec('PRAGMA foreign_keys = ON');

  // WAL: readers do not block the writer. The dashboard issues several reads
  // per page render while a sign-in may be writing a session row.
  db.exec('PRAGMA journal_mode = WAL');

  // NORMAL is the documented pairing with WAL: durable across process crashes,
  // and only at risk from an OS-level power loss, which is a backup question
  // rather than a transaction one.
  db.exec('PRAGMA synchronous = NORMAL');

  // Fail fast rather than hang if another process holds the write lock.
  db.exec('PRAGMA busy_timeout = 5000');
}

export function getDb(): DatabaseSyncType {
  if (instance) return instance;

  const file = databasePath();
  if (file !== ':memory:') {
    mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(file);
  configure(db);
  migrate(db);

  instance = db;
  return db;
}

/**
 * Apply pending migrations inside a transaction.
 *
 * Runs on first connection rather than as a separate deploy step: this is a
 * single-instance application, the migrations are small, and a deployment that
 * can start with a stale schema is a worse failure than a slower cold start.
 * A multi-instance deployment must move this to an explicit release step, or
 * two nodes will race to apply the same migration.
 */
export function migrate(db: DatabaseSyncType): { applied: number[]; alreadyAt: number } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at TEXT    NOT NULL
    ) STRICT
  `);

  const current = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations').get() as {
    v: number;
  };
  const applied: number[] = [];

  for (const migration of MIGRATIONS) {
    if (migration.version <= current.v) continue;

    db.exec('BEGIN');
    try {
      db.exec(migration.up);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString()
      );
      db.exec('COMMIT');
      applied.push(migration.version);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${(err as Error).message}`
      );
    }
  }

  return { applied, alreadyAt: current.v };
}

/**
 * Run a function inside a transaction, rolling back on any throw.
 *
 * Used wherever a write has to be all-or-nothing — signing an approval writes
 * both the approval row and its audit event, and an approval with no audit
 * record is exactly the gap the audit table exists to close.
 */
export function transaction<T>(fn: (db: DatabaseSyncType) => T): T {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Test helper — drops the cached connection so a fresh path can be opened. */
export function __resetDb() {
  try {
    instance?.close();
  } catch {
    /* already closed */
  }
  instance = null;
}
