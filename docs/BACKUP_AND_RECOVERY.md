# CapExIQ — Backup & Recovery

The database holds the audit trail, the approval records, the account
directory and every live session. It is the only part of this application
whose loss is not recoverable by redeploying.

## Taking a backup

```bash
pnpm db:backup
```

Runs against a **live application** — no maintenance window is needed. Output:

```
Backup written  .data/backups/capexiq-2026-08-02T14-47-15-528Z.db
Size            76 KB
Verified        integrity ok, row counts match source
Contents        users=6  sessions=7  audit_events=13  approvals=2
```

Options:

| Flag | Effect |
| --- | --- |
| `--keep N` | Retain N snapshots instead of 7 |
| `--label text` | Tag the filename, e.g. `--label pre-migration` |
| `--list` | Show existing snapshots |
| `--verify <file>` | Check a snapshot independently |
| `--restore <file>` | Replace the live database (see below) |

Exit code is non-zero on any failure, so a scheduler surfaces it. **A backup
job that fails silently is indistinguishable from one that never ran.**

## Why not `cp capexiq.db backup.db`

The database runs in **WAL mode**. Recent commits live in `capexiq.db-wal` and
have not necessarily been folded into the main file. Copying the `.db` alone
produces a file that opens cleanly, passes an integrity check, and is silently
missing the most recent writes.

This is not theoretical. Measured on this schema, **2 MB of committed rows sat
in the WAL** while the main file still read as nearly empty — a naive copy
would have lost not just recent rows but entire tables.

`VACUUM INTO` is SQLite's supported answer: consistent, includes the WAL, does
not block writers, and refuses to overwrite an existing file.

## Restoring

**Stop the application first.** The script cannot close another process's
handle to the database.

```bash
pnpm db:restore .data/backups/capexiq-2026-08-02T14-47-15-528Z.db
```

The restore is deliberately awkward in two ways:

1. **The source is verified before anything is touched.** Restoring a corrupt
   snapshot over a working database converts a recoverable problem into an
   unrecoverable one.
2. **The current database is copied aside first**, to
   `capexiq.db.pre-restore-<timestamp>`, itself via `VACUUM INTO` so the
   safety copy is complete. A restore is a destructive act usually performed
   under pressure and often against the wrong file.

Restart the application afterwards. Every session issued before the snapshot
will be rejected, and users sign in again — the `sessions` table is restored
along with everything else.

## Scheduling

Not scheduled automatically. Wire `pnpm db:backup` to whatever runs periodic
jobs in your environment:

**Linux / macOS** — daily at 02:00, retaining 30:

```bash
0 2 * * * cd /srv/capexiq && pnpm db:backup --keep 30 >> /var/log/capexiq-backup.log 2>&1
```

**Windows Task Scheduler**:

```powershell
schtasks /create /tn "CapExIQ backup" /tr "cmd /c cd /d C:\path\to\capexiq && pnpm db:backup --keep 30" /sc daily /st 02:00
```

Always take one before a migration or a deploy:

```bash
pnpm db:backup --label pre-deploy
```

## What this does NOT cover

**These snapshots sit on the same disk as the database.** They protect against
a bad migration, an accidental delete, or a corrupted write. They do **not**
protect against losing the disk, the host, or the region.

Until snapshots are shipped off-box, this is a **rollback mechanism, not
disaster recovery**, and should not be described as the latter in any
governance document.

Getting there needs one of:

- an object-store upload (S3/Azure Blob) after each successful backup, with
  lifecycle rules and its own retention;
- a managed Postgres with point-in-time recovery — the direction already
  planned, at which point this script is replaced by the provider's tooling
  rather than adapted.

There is also **no restore rehearsal on a schedule**. The restore path is
covered by `tests/backup.test.ts` and has been exercised manually, but an
untested restore drifts toward being untrue. A quarterly drill against a copy
of production data is the standard practice this project has not yet adopted.

## Handling

Snapshots contain **PBKDF2 password hashes, session records and the complete
audit trail**. They are exactly as sensitive as the database itself.

- `.data/backups/` and `*.pre-restore-*` are gitignored.
- Restrict filesystem permissions to the service account.
- Encrypt at rest once shipped off-box.
- Retention deletes old snapshots but does not shred them; on a shared or
  cloud volume, assume deleted blocks are recoverable.
