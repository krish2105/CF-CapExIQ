import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Backups need a real file on disk — an in-memory database cannot be
 * VACUUMed INTO anything meaningful, and the whole point is durability. Each
 * run gets its own temp directory, and the module is imported dynamically
 * after the environment is pointed at it, because `getDb()` resolves the path
 * once on first connection.
 */
const root = mkdtempSync(path.join(tmpdir(), 'capexiq-backup-'));

process.env.CAPEXIQ_DB_PATH = path.join(root, 'capexiq.db');
process.env.CAPEXIQ_BACKUP_DIR = path.join(root, 'backups');

const { getDb, __resetDb } = await import('@/lib/db/client');
const { createBackup, listBackups, pruneBackups, verifyBackup, restoreBackup } = await import(
  '@/lib/db/backup'
);
const { recordAudit } = await import('@/lib/db/repositories/audit');

afterAll(() => {
  __resetDb();
  rmSync(root, { recursive: true, force: true });
});

function seedAudit(n: number) {
  for (let i = 0; i < n; i++) {
    recordAudit({ action: 'auth.login', entity: 'session', summary: `event ${i}` });
  }
}

beforeEach(() => {
  const db = getDb();
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('DROP TRIGGER IF EXISTS audit_events_no_delete');
  db.exec('DELETE FROM audit_events');
  db.exec(
    `CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
       BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END`
  );
  db.exec('PRAGMA foreign_keys = ON');

  // Created lazily by the first backup, so it may not exist on the first run.
  mkdirSync(process.env.CAPEXIQ_BACKUP_DIR!, { recursive: true });
  for (const f of readdirSync(process.env.CAPEXIQ_BACKUP_DIR!, { withFileTypes: true }).filter(
    (d) => d.isFile()
  )) {
    rmSync(path.join(process.env.CAPEXIQ_BACKUP_DIR!, f.name), { force: true });
  }
});

describe('creating backups', () => {
  it('captures rows still sitting in the WAL', () => {
    // The reason `VACUUM INTO` is used instead of copying the .db file: in
    // WAL mode recent commits are not in the main file yet, so a plain copy
    // produces a snapshot that opens cleanly and is quietly incomplete.
    seedAudit(200);

    const result = createBackup();
    expect(result.verified).toBe(true);
    expect(result.rowCounts.audit_events).toBe(200);

    const check = verifyBackup(result.file);
    expect(check.ok).toBe(true);
    expect(check.rowCounts?.audit_events).toBe(200);
  });

  it('can be taken while the database is open and being written', () => {
    seedAudit(10);
    const first = createBackup('during');
    seedAudit(10);
    expect(first.rowCounts.audit_events).toBe(10);
    expect(createBackup('after').rowCounts.audit_events).toBe(20);
  });

  it('never overwrites an existing snapshot', () => {
    const a = createBackup('same');
    // VACUUM INTO refuses an existing target, which removes the "the backup
    // job clobbered last night's backup" failure entirely.
    expect(() => {
      getDb().exec(`VACUUM INTO '${a.file.replace(/'/g, "''")}'`);
    }).toThrow();
  });
});

describe('verification', () => {
  it('rejects a file that is not a database', () => {
    const bogus = path.join(root, 'not-a-db.db');
    writeFileSync(bogus, 'this is not a sqlite file');
    expect(verifyBackup(bogus).ok).toBe(false);
  });

  it('rejects a missing file', () => {
    expect(verifyBackup(path.join(root, 'absent.db')).ok).toBe(false);
  });

  it('rejects a database that is missing the expected tables', () => {
    const partial = path.join(root, 'partial.db');
    __resetDb();
    process.env.CAPEXIQ_DB_PATH = partial;
    const other = getDb();
    other.exec('DROP TABLE approvals');
    __resetDb();
    process.env.CAPEXIQ_DB_PATH = path.join(root, 'capexiq.db');
    getDb();

    const result = verifyBackup(partial);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing table/i);
  });
});

describe('rotation', () => {
  it('keeps the newest and removes the rest', () => {
    for (let i = 0; i < 5; i++) createBackup(`r${i}`);
    expect(listBackups()).toHaveLength(5);

    const removed = pruneBackups(2);
    expect(removed).toHaveLength(3);
    expect(listBackups()).toHaveLength(2);
  });

  it('refuses to prune away every backup', () => {
    createBackup();
    // A retention of zero is always a mistake, and the moment it runs is the
    // moment there is nothing left to recover from.
    expect(() => pruneBackups(0)).toThrow(/fewer than one/i);
  });
});

describe('restore', () => {
  it('rolls the database back to the snapshot', () => {
    seedAudit(5);
    const snapshot = createBackup('restore-point');
    seedAudit(20);
    expect(getDb().prepare('SELECT COUNT(*) AS n FROM audit_events').get()).toMatchObject({ n: 25 });

    __resetDb();
    const result = restoreBackup(snapshot.file);
    expect(result.rowCounts.audit_events).toBe(5);

    expect(getDb().prepare('SELECT COUNT(*) AS n FROM audit_events').get()).toMatchObject({ n: 5 });
  });

  /**
   * The regression for a bug found by running an actual restore drill: the
   * safety copy was taken with a file copy, so it inherited the WAL problem
   * and came back missing entire tables. A rollback that loses the data it
   * exists to protect is worse than none — it is only ever opened when there
   * is nothing else left.
   */
  it('leaves a safety copy that is complete, not just present', () => {
    seedAudit(3);
    const snapshot = createBackup('sp');
    seedAudit(30);

    __resetDb();
    const result = restoreBackup(snapshot.file);

    expect(existsSync(result.safetyCopy)).toBe(true);
    const safety = verifyBackup(result.safetyCopy);
    expect(safety.ok).toBe(true);
    // 33, the state immediately before the restore — not 3, and not zero.
    expect(safety.rowCounts?.audit_events).toBe(33);
  });

  it('refuses to restore from an unverifiable file', () => {
    const bogus = path.join(root, 'corrupt.db');
    writeFileSync(bogus, 'garbage');
    // Restoring a corrupt snapshot over a working database turns a
    // recoverable problem into an unrecoverable one.
    expect(() => restoreBackup(bogus)).toThrow(/Refusing to restore/);
  });

  it('clears the stale WAL sidecars', () => {
    seedAudit(2);
    const snapshot = createBackup('sidecar');
    __resetDb();
    restoreBackup(snapshot.file);

    // A -wal describing the replaced database is at best ignored and at worst
    // applied on top of the restored file.
    expect(existsSync(`${process.env.CAPEXIQ_DB_PATH}-wal`)).toBe(false);
    expect(existsSync(`${process.env.CAPEXIQ_DB_PATH}-shm`)).toBe(false);
  });
});
