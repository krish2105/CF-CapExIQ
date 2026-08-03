/**
 * Schema migrations, applied in version order and never edited once shipped.
 *
 * Every table is STRICT. SQLite's default is to accept a string into an
 * INTEGER column and store it as a string, which turns a type error into a
 * silent data-corruption bug discovered months later by a query that returns
 * nothing. STRICT makes the column types mean what they say.
 *
 * Timestamps are TEXT in ISO-8601 UTC rather than INTEGER epochs: they sort
 * correctly as strings, they are readable in a `sqlite3` shell during an
 * incident, and they survive a port to Postgres `timestamptz` unchanged.
 * Money and metrics are stored as JSON snapshots rather than decomposed
 * columns, because the approval record has to preserve exactly what was on
 * screen at the moment of signing, not a re-derivation of it.
 */

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: `
      -- ---------------------------------------------------------------- users
      -- Replaces the static in-source directory. The seeded personas are
      -- inserted on first boot (see repositories/users.ts) so a fresh clone
      -- still demonstrates the role model, but accounts are now rows that can
      -- be disabled, re-roled and audited.
      CREATE TABLE users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        title         TEXT NOT NULL,
        role          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        -- Soft delete: an account that signed an approval must remain
        -- resolvable forever, so rows are disabled rather than removed.
        disabled_at   TEXT
      ) STRICT;

      CREATE UNIQUE INDEX idx_users_email ON users (email);

      -- ------------------------------------------------------------- sessions
      -- Exists to make revocation possible. The session cookie is a signed
      -- HMAC with an expiry and nothing else, so before this table a "sign
      -- out" on a stolen cookie was unenforceable: the token stayed valid for
      -- its full eight hours no matter what the user did.
      CREATE TABLE sessions (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users (id),
        issued_at   TEXT NOT NULL,
        expires_at  TEXT NOT NULL,
        revoked_at  TEXT,
        ip          TEXT,
        user_agent  TEXT
      ) STRICT;

      CREATE INDEX idx_sessions_user    ON sessions (user_id);
      CREATE INDEX idx_sessions_expires ON sessions (expires_at);

      -- --------------------------------------------------------- audit events
      -- The durable change log. Previously this lived in localStorage, which
      -- made it per-browser, clearable by the person it recorded, and erased
      -- on sign-out.
      CREATE TABLE audit_events (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        occurred_at    TEXT NOT NULL,
        -- Nullable: failed sign-ins are worth recording and have no actor.
        actor_user_id  TEXT REFERENCES users (id),
        actor_role     TEXT,
        action         TEXT NOT NULL,
        entity         TEXT NOT NULL,
        entity_id      TEXT,
        summary        TEXT NOT NULL,
        before_value   TEXT,
        after_value    TEXT,
        scenario       TEXT,
        ip             TEXT
      ) STRICT;

      CREATE INDEX idx_audit_time   ON audit_events (occurred_at DESC);
      CREATE INDEX idx_audit_actor  ON audit_events (actor_user_id);
      CREATE INDEX idx_audit_action ON audit_events (action);

      -- An audit trail that can be edited is a log, not an audit trail. These
      -- triggers make the table append-only at the database level, so a bug
      -- or a careless query cannot rewrite history — only a deliberate schema
      -- change can, and that leaves a migration behind.
      CREATE TRIGGER audit_events_no_update
        BEFORE UPDATE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;

      CREATE TRIGGER audit_events_no_delete
        BEFORE DELETE ON audit_events
        BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;

      -- ------------------------------------------------------------ approvals
      -- The signing record for a capital decision. Stores the full model
      -- snapshot: an approval that merely references live assumptions is
      -- worthless the moment someone edits them, because it no longer says
      -- what was actually approved.
      CREATE TABLE approvals (
        id                 TEXT PRIMARY KEY,
        decided_at         TEXT NOT NULL,
        decided_by_user_id TEXT NOT NULL REFERENCES users (id),
        decided_by_role    TEXT NOT NULL,
        decision           TEXT NOT NULL,
        scenario           TEXT NOT NULL,
        -- SHA-256 over the canonical snapshot, so tampering is detectable
        -- without diffing two JSON blobs by eye.
        snapshot_hash      TEXT NOT NULL,
        metrics_json       TEXT NOT NULL,
        assumptions_json   TEXT NOT NULL,
        note               TEXT
      ) STRICT;

      CREATE INDEX idx_approvals_time ON approvals (decided_at DESC);

      CREATE TRIGGER approvals_no_update
        BEFORE UPDATE ON approvals
        BEGIN SELECT RAISE(ABORT, 'approvals are immutable once signed'); END;

      CREATE TRIGGER approvals_no_delete
        BEFORE DELETE ON approvals
        BEGIN SELECT RAISE(ABORT, 'approvals are immutable once signed'); END;
    `,
  },

  {
    version: 2,
    name: 'project profiles and shared working model',
    up: `
      -- The capital model itself, which until now lived in localStorage.
      --
      -- That made it per-browser: two members of the same capital committee
      -- opened the same project and saw different numbers, an approval could
      -- be signed against figures nobody else had, and clearing site data
      -- discarded the model. A committee reviewing one investment has to be
      -- looking at one model.
      CREATE TABLE project_profiles (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        description     TEXT NOT NULL DEFAULT '',
        assumptions_json TEXT NOT NULL,
        created_by      TEXT REFERENCES users (id),
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL,
        updated_by      TEXT REFERENCES users (id),
        -- Optimistic concurrency. Two analysts editing the same profile from
        -- different tabs would otherwise silently overwrite each other, and
        -- the loser would never know their change was gone.
        version         INTEGER NOT NULL DEFAULT 1,
        archived_at     TEXT
      ) STRICT;

      CREATE INDEX idx_profiles_updated ON project_profiles (updated_at DESC);

      -- Which profile the application is currently working against.
      --
      -- Single row by construction: the CHECK pins the primary key, so a
      -- second "current" cannot exist even if a bug tries to insert one.
      CREATE TABLE workspace_state (
        id                  INTEGER PRIMARY KEY CHECK (id = 1),
        active_profile_id   TEXT REFERENCES project_profiles (id),
        selected_scenario   TEXT NOT NULL DEFAULT 'Base',
        updated_at          TEXT NOT NULL,
        updated_by          TEXT REFERENCES users (id)
      ) STRICT;
    `,
  },
];
