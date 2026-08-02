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

## Off-box copies

A snapshot on the same disk as the database protects against a bad migration
or an accidental delete, and against nothing else. Set a destination:

```bash
# A mounted volume, NAS or UNC share — no credentials needed
CAPEXIQ_BACKUP_REMOTE="file:///mnt/backup-volume"

# S3 (or any S3-compatible endpoint via CAPEXIQ_S3_ENDPOINT)
CAPEXIQ_BACKUP_REMOTE="s3://my-bucket/capexiq/nightly?region=eu-west-1"
CAPEXIQ_S3_ACCESS_KEY_ID="..."
CAPEXIQ_S3_SECRET_ACCESS_KEY="..."

# Azure Blob, or any presigned PUT endpoint
CAPEXIQ_BACKUP_REMOTE="https://acct.blob.core.windows.net/container?<sas-token>"
```

The copy is shipped **before** rotation — rotation is what eventually deletes
the local snapshot, so it must not run first — and is **verified at the
destination**, because a truncated write across a network mount produces a
file with the right name and the wrong contents.

If no destination is set, the backup still succeeds and prints a warning. If
one is set and the upload fails, the command **exits non-zero** even though the
local snapshot is fine: a backup that never left the box is exactly the failure
this step exists to prevent, and must not be reported to a scheduler as success.

`file:` destinations are handled by the backup script itself. `s3:` and
`https:` uploads run inside the application (`src/lib/db/remote/`) — the script
is deliberately plain ESM so it works when the app does not.

### Egress

Uploads go through the same allowlist as the model provider. The backup host is
allowed because it is first-party storage under your control, but it still has
to be named — an unnamed host is refused.

Every other allowlist entry is *derived* from the variable that names it, so a
poisoned `OPENAI_BASE_URL` or `CAPEXIQ_BACKUP_REMOTE` would authorise itself.
Pin the outer bound to close that:

```bash
CAPEXIQ_EGRESS_ALLOWLIST="backups.corp.internal,integrate.api.nvidia.com"
```

This is an **intersection**, not a grant: a host must be both derived *and*
pinned. Unset, behaviour is unchanged, so it is opt-in.

## What this still does NOT cover

**Untested against real S3.** The SigV4 signer is verified against AWS's own
published test vectors (`tests/sigv4.test.ts`) and the upload path against a
local HTTP server, but no request has been made to a real bucket. **Smoke-test
against a throwaway bucket before relying on it.**

**No scheduled restore rehearsal.** The restore path is covered by
`tests/backup.test.ts` and has been exercised manually end to end, but an
untested restore drifts toward being untrue. A quarterly drill against a copy
of production data is the standard practice this project has not yet adopted.

**No remote retention for object stores.** `list`/`prune` are implemented for
`file:` only. On S3 or Azure, retention belongs in a bucket lifecycle rule,
which survives this application being down and cannot delete the wrong thing
because of a bug here.

**Encryption in transit only, plus requested SSE.** S3 uploads ask for
`AES256` server-side encryption; the snapshots are not encrypted by this
application before they leave. For anything beyond an internal pilot, encrypt
client-side so the storage provider never holds readable password hashes.

## Handling

Snapshots contain **PBKDF2 password hashes, session records and the complete
audit trail**. They are exactly as sensitive as the database itself.

- `.data/backups/` and `*.pre-restore-*` are gitignored.
- Restrict filesystem permissions to the service account.
- Encrypt at rest once shipped off-box.
- Retention deletes old snapshots but does not shred them; on a shared or
  cloud volume, assume deleted blocks are recoverable.
