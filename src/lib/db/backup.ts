import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { getDb } from './client';

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite') as typeof import('node:sqlite');

/**
 * Backup and restore.
 *
 * WHY NOT `cp capexiq.db backup.db`
 *
 * The database runs in WAL mode, so recent commits live in `capexiq.db-wal`
 * and have not necessarily been folded into the main file yet. Copying the
 * `.db` alone produces a file that opens cleanly, passes an integrity check,
 * and is silently missing the most recent writes — the worst possible failure
 * mode for a backup, because nothing about it looks wrong until you need it.
 * Measured on this schema: 2 MB of committed rows sat in the WAL while the
 * main file still read as nearly empty.
 *
 * `VACUUM INTO` is SQLite's supported answer. It runs against a live database
 * without blocking writers, produces a single consistent snapshot that
 * includes everything in the WAL, and compacts free pages on the way out. It
 * also refuses to overwrite an existing file, which removes a whole class of
 * "the backup script clobbered last night's backup" incident.
 *
 * WHAT IS AND IS NOT COVERED
 *
 * This produces a verified local snapshot with rotation. It does NOT ship it
 * anywhere. A backup on the same disk as the database survives a bad
 * migration or an accidental delete; it does not survive the disk, the host,
 * or the region. Getting these off-box is a deployment concern — see
 * `docs/DEPLOYMENT.md` — and until that exists, this is a rollback mechanism
 * rather than disaster recovery. Saying otherwise would be the same category
 * of error as an audit trail nobody can read.
 *
 * These files contain password hashes, session records and the full audit
 * trail. They are as sensitive as the database and must be treated that way.
 */

/** Tables whose row counts are compared against the source after a backup. */
const VERIFIED_TABLES = ['users', 'sessions', 'audit_events', 'approvals'] as const;

export function backupDir(): string {
  return process.env.CAPEXIQ_BACKUP_DIR ?? path.join(process.cwd(), '.data', 'backups');
}

function databasePath(): string {
  return process.env.CAPEXIQ_DB_PATH ?? path.join(process.cwd(), '.data', 'capexiq.db');
}

export interface BackupResult {
  file: string;
  bytes: number;
  createdAt: string;
  rowCounts: Record<string, number>;
  verified: boolean;
}

function countRows(db: InstanceType<typeof DatabaseSync>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of VERIFIED_TABLES) {
    try {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
      counts[table] = row.n;
    } catch {
      // A table absent from an older snapshot is information, not an error.
      counts[table] = -1;
    }
  }
  return counts;
}

/**
 * Take a verified snapshot.
 *
 * Verification is not optional and not a separate command. An unverified
 * backup is a guess, and the moment anyone discovers it was a bad guess is
 * precisely the moment they cannot afford to.
 */
export function createBackup(label?: string): BackupResult {
  const dir = backupDir();
  mkdirSync(dir, { recursive: true });

  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[:.]/g, '-');
  const suffix = label ? `-${label.replace(/[^a-z0-9-]/gi, '')}` : '';
  const file = path.join(dir, `capexiq-${stamp}${suffix}.db`);

  const source = getDb();
  // Single quotes are SQL string syntax and VACUUM INTO takes no bind
  // parameter, so the path is escaped by doubling any quote it contains.
  source.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);

  const expected = countRows(source);

  // Reopen the snapshot and prove it is readable, intact, and complete before
  // reporting success.
  const copy = new DatabaseSync(file, { readOnly: true });
  let verified = false;
  try {
    const integrity = copy.prepare('PRAGMA integrity_check').get() as {
      integrity_check: string;
    };
    const actual = countRows(copy);
    verified =
      integrity.integrity_check === 'ok' &&
      VERIFIED_TABLES.every((t) => actual[t] === expected[t]);
  } finally {
    copy.close();
  }

  if (!verified) {
    // A snapshot that fails its own check is worse than none, because it
    // would sit in the directory looking like a valid restore point.
    unlinkSync(file);
    throw new Error(`Backup verification failed for ${file}; the snapshot was discarded.`);
  }

  return { file, bytes: statSync(file).size, createdAt, rowCounts: expected, verified };
}

export interface BackupFile {
  file: string;
  bytes: number;
  modifiedAt: string;
}

export function listBackups(): BackupFile[] {
  const dir = backupDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(dir, f);
      const stat = statSync(full);
      return { file: full, bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

/**
 * Delete all but the newest `keep` snapshots.
 *
 * Rotation runs after a successful backup, never before. Pruning first would
 * mean a run that fails at the snapshot step has already thrown away a good
 * restore point to make room for one that never arrived.
 */
export function pruneBackups(keep = 7): string[] {
  if (keep < 1) throw new Error('Refusing to prune to fewer than one backup.');

  const removed: string[] = [];
  for (const backup of listBackups().slice(keep)) {
    unlinkSync(backup.file);
    removed.push(backup.file);
  }
  return removed;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  rowCounts?: Record<string, number>;
}

/** Open a snapshot and check it independently of when it was written. */
export function verifyBackup(file: string): VerifyResult {
  if (!existsSync(file)) return { ok: false, reason: 'File does not exist.' };

  let db: InstanceType<typeof DatabaseSync> | null = null;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const integrity = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    if (integrity.integrity_check !== 'ok') {
      return { ok: false, reason: `Integrity check returned: ${integrity.integrity_check}` };
    }

    const rowCounts = countRows(db);
    const missing = VERIFIED_TABLES.filter((t) => rowCounts[t] === -1);
    if (missing.length) {
      return { ok: false, reason: `Snapshot is missing table(s): ${missing.join(', ')}`, rowCounts };
    }

    return { ok: true, rowCounts };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  } finally {
    db?.close();
  }
}

export interface RestoreResult {
  restoredFrom: string;
  safetyCopy: string;
  rowCounts: Record<string, number>;
}

/**
 * Replace the live database with a snapshot.
 *
 * Deliberately awkward in two ways, both on purpose:
 *
 *  - The source is verified BEFORE anything is touched. Restoring a corrupt
 *    snapshot over a working database converts a recoverable problem into an
 *    unrecoverable one.
 *  - The current database is copied aside first. A restore is itself a
 *    destructive act, usually performed under pressure and often against the
 *    wrong file; the safety copy is what makes that survivable.
 *
 * The application must not be running. This closes the process's own handle,
 * but it cannot close another server's, and SQLite will happily let two
 * processes disagree about a file that changed underneath one of them.
 */
export function restoreBackup(file: string): RestoreResult {
  const check = verifyBackup(file);
  if (!check.ok) {
    throw new Error(`Refusing to restore from ${file}: ${check.reason}`);
  }

  const target = databasePath();
  if (target === ':memory:') throw new Error('Cannot restore over an in-memory database.');

  const safetyCopy = `${target}.pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (existsSync(target)) {
    // VACUUM INTO, not copyFileSync — the same WAL rule this module opens by
    // stating. A file copy of the live database omits everything still in the
    // -wal, which was caught by an actual restore drill: the safety copy came
    // back missing not just recent rows but entire tables, because the schema
    // itself had not been checkpointed. A rollback that silently loses the
    // data it exists to protect is worse than having none, since it is only
    // ever opened at the point where nothing else is left.
    const live = new DatabaseSync(target);
    try {
      live.exec(`VACUUM INTO '${safetyCopy.replace(/'/g, "''")}'`);
    } finally {
      live.close();
    }
  }

  copyFileSync(file, target);

  // The old WAL and shared-memory files describe the database being replaced.
  // Left in place they are, at best, ignored and at worst applied on top of
  // the restored file.
  for (const sidecar of [`${target}-wal`, `${target}-shm`]) {
    if (existsSync(sidecar)) unlinkSync(sidecar);
  }

  return { restoredFrom: file, safetyCopy, rowCounts: check.rowCounts ?? {} };
}
