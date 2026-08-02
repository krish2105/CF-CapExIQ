#!/usr/bin/env node
/**
 * Database backup CLI.
 *
 *   node scripts/db-backup.mjs                 take a verified snapshot, rotate
 *   node scripts/db-backup.mjs --keep 30       retain 30 instead of 7
 *   node scripts/db-backup.mjs --label pre-migration
 *   node scripts/db-backup.mjs --list
 *   node scripts/db-backup.mjs --verify <file>
 *   node scripts/db-backup.mjs --restore <file>
 *
 * Runs against a live application — `VACUUM INTO` does not block writers — so
 * this is safe to schedule without a maintenance window. Restore is the
 * exception and requires the app to be stopped.
 *
 * Exit codes matter here: this is meant to be driven by a scheduler, and a
 * backup job that fails silently is indistinguishable from one that never ran.
 * Non-zero on any failure, so cron/Task Scheduler surfaces it.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);

// The backup module is TypeScript, so the logic is duplicated here rather than
// imported — adding a TS pipeline to a maintenance script that must run when
// the application will not is a bad trade. `tests/backup.test.ts` exercises
// the TypeScript implementation, and this script is a thin wrapper over the
// same three SQLite operations.
const { DatabaseSync } = require_('node:sqlite');
const fs = require_('node:fs');

const DB = process.env.CAPEXIQ_DB_PATH ?? path.join(ROOT, '.data', 'capexiq.db');
const DIR = process.env.CAPEXIQ_BACKUP_DIR ?? path.join(ROOT, '.data', 'backups');
const TABLES = ['users', 'sessions', 'audit_events', 'approvals'];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1] ?? true;
};

function counts(db) {
  const out = {};
  for (const t of TABLES) {
    try {
      out[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    } catch {
      out[t] = -1;
    }
  }
  return out;
}

function verify(file) {
  if (!fs.existsSync(file)) return { ok: false, reason: 'File does not exist.' };
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
    if (integrity !== 'ok') return { ok: false, reason: `integrity_check: ${integrity}` };
    const rows = counts(db);
    const missing = TABLES.filter((t) => rows[t] === -1);
    if (missing.length) return { ok: false, reason: `missing tables: ${missing.join(', ')}` };
    return { ok: true, rows };
  } catch (err) {
    return { ok: false, reason: err.message };
  } finally {
    db?.close();
  }
}

function list() {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(DIR, f);
      return { file: full, stat: fs.statSync(full) };
    })
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
}

function human(bytes) {
  return bytes > 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

/**
 * Copy a verified snapshot to the configured off-box destination.
 *
 * Only `file:` is handled in this script. The network backends live in
 * `src/lib/db/remote/` and need TypeScript, which a maintenance script that
 * must run when the application will not should not depend on. For s3: and
 * https: this prints the command to run instead of pretending to have shipped
 * — a backup tool that reports success it did not achieve is worse than one
 * that refuses.
 */
function shipOffBox(localFile, remote) {
  const url = new URL(remote);

  if (url.protocol !== 'file:') {
    throw new Error(
      `${url.protocol} uploads run inside the application (src/lib/db/remote), not this ` +
        `script — it is plain ESM so that it works when the app does not, and the ` +
        `S3/Azure backends are TypeScript. Either point CAPEXIQ_BACKUP_REMOTE at a ` +
        `file: destination on a mounted volume, or drive the upload from the app. ` +
        `See docs/BACKUP_AND_RECOVERY.md.`
    );
  }

  const dir = fileURLToPath(url);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, path.basename(localFile));

  if (fs.existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
  fs.copyFileSync(localFile, target);

  // Verified at the destination, not just copied. A truncated write across a
  // network mount produces a file of the right name and the wrong contents.
  const check = verify(target);
  if (!check.ok) {
    fs.unlinkSync(target);
    throw new Error(`copy landed but failed verification (${check.reason}); removed`);
  }

  return `${target}  (verified)`;
}

function backup() {
  if (!fs.existsSync(DB)) {
    console.error(`No database at ${DB}. Nothing to back up.`);
    process.exit(1);
  }

  fs.mkdirSync(DIR, { recursive: true });

  const label = typeof flag('--label') === 'string' ? `-${flag('--label').replace(/[^a-z0-9-]/gi, '')}` : '';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(DIR, `capexiq-${stamp}${label}.db`);

  const source = new DatabaseSync(DB);
  const expected = counts(source);
  source.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  source.close();

  const check = verify(target);
  const complete = check.ok && TABLES.every((t) => check.rows[t] === expected[t]);

  if (!complete) {
    // Discard rather than leave a snapshot that looks like a restore point.
    fs.unlinkSync(target);
    console.error(`Backup verification FAILED (${check.reason ?? 'row counts differ'}); discarded.`);
    process.exit(1);
  }

  console.log(`Backup written  ${target}`);
  console.log(`Size            ${human(fs.statSync(target).size)}`);
  console.log(`Verified        integrity ok, row counts match source`);
  console.log(
    `Contents        ${TABLES.map((t) => `${t}=${expected[t]}`).join('  ')}`
  );

  // Ship off-box before rotating. A snapshot that exists only on this disk is
  // a rollback point, not a backup, and rotation is what eventually removes
  // it — so the copy has to leave first.
  const remote = process.env.CAPEXIQ_BACKUP_REMOTE?.trim();
  if (!remote) {
    console.warn(
      'Off-box        NOT CONFIGURED — snapshots exist only on this disk.\n' +
        '               Set CAPEXIQ_BACKUP_REMOTE (see docs/BACKUP_AND_RECOVERY.md).'
    );
  } else {
    try {
      const shipped = shipOffBox(target, remote);
      console.log(`Off-box        ${shipped}`);
    } catch (err) {
      // Non-fatal for the local snapshot, which is already written and
      // verified — but a non-zero exit, because a backup that never left the
      // box is precisely the failure this step exists to prevent and must not
      // be reported as success to a scheduler.
      console.error(`Off-box        FAILED: ${err.message}`);
      process.exitCode = 1;
    }
  }

  // Rotate only after a good snapshot exists.
  const keep = Number(flag('--keep') ?? 7);
  if (!Number.isFinite(keep) || keep < 1) {
    console.error('--keep must be a positive integer.');
    process.exit(1);
  }
  const stale = list().slice(keep);
  for (const s of stale) fs.unlinkSync(s.file);
  if (stale.length) console.log(`Rotated         removed ${stale.length} older snapshot(s), kept ${keep}`);
}

function restore(file) {
  const check = verify(file);
  if (!check.ok) {
    console.error(`Refusing to restore from ${file}: ${check.reason}`);
    process.exit(1);
  }

  const safety = `${DB}.pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (fs.existsSync(DB)) {
    // VACUUM INTO, not a file copy: the live database is in WAL mode, so
    // copying the .db alone produces a snapshot missing everything not yet
    // checkpointed — in a real drill that meant missing entire tables.
    const live = new DatabaseSync(DB);
    try {
      live.exec(`VACUUM INTO '${safety.replace(/'/g, "''")}'`);
    } finally {
      live.close();
    }

    const safetyCheck = verify(safety);
    if (!safetyCheck.ok) {
      console.error(`Refusing to restore: could not take a usable safety copy (${safetyCheck.reason}).`);
      process.exit(1);
    }
  }
  fs.copyFileSync(file, DB);
  for (const sidecar of [`${DB}-wal`, `${DB}-shm`]) {
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }

  console.log(`Restored from   ${file}`);
  console.log(`Previous DB     ${safety}`);
  console.log(`Contents        ${TABLES.map((t) => `${t}=${check.rows[t]}`).join('  ')}`);
  console.log('\nThe application must be restarted, and must have been stopped for this.');
}

// ------------------------------------------------------------------ dispatch

if (flag('--list') !== undefined) {
  const all = list();
  if (!all.length) {
    console.log(`No backups in ${DIR}`);
  } else {
    console.log(`${all.length} backup(s) in ${DIR}\n`);
    for (const b of all) {
      console.log(
        `  ${b.stat.mtime.toISOString()}  ${human(b.stat.size).padStart(8)}  ${path.basename(b.file)}`
      );
    }
  }
} else if (typeof flag('--verify') === 'string') {
  const file = flag('--verify');
  const result = verify(file);
  if (result.ok) {
    console.log(`OK  ${file}`);
    console.log(`    ${TABLES.map((t) => `${t}=${result.rows[t]}`).join('  ')}`);
  } else {
    console.error(`FAILED  ${file}: ${result.reason}`);
    process.exit(1);
  }
} else if (typeof flag('--restore') === 'string') {
  restore(flag('--restore'));
} else {
  backup();
}
