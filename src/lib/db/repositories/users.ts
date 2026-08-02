import { getDb } from '../client';
import type { ExecutiveRole } from '@/lib/types/finance';

/**
 * Account directory, backed by the database.
 *
 * The seeded personas are inserted once on an empty table so a fresh clone
 * still demonstrates the role model without a setup step. They are seed data,
 * not fixtures: once a row exists it is never overwritten from source, so an
 * operator who changes a role or disables an account does not have that
 * silently reverted on the next deploy.
 *
 * `CAPEXIQ_USERS` still works and still takes precedence, because replacing
 * the directory wholesale is the supported path for a real deployment and
 * should not require a database migration.
 */

export interface DbUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: ExecutiveRole;
  passwordHash: string;
  createdAt: string;
  disabledAt: string | null;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  title: string;
  role: string;
  password_hash: string;
  created_at: string;
  disabled_at: string | null;
}

function toUser(row: UserRow): DbUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    title: row.title,
    role: row.role as ExecutiveRole,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    disabledAt: row.disabled_at,
  };
}

export function seedUsers(
  seeds: Array<Omit<DbUser, 'createdAt' | 'disabledAt'>>
): { inserted: number } {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (existing.n > 0) return { inserted: 0 };

  const insert = db.prepare(
    `INSERT INTO users (id, email, name, title, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    for (const u of seeds) {
      insert.run(u.id, u.email.toLowerCase(), u.name, u.title, u.role, u.passwordHash, now);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { inserted: seeds.length };
}

/** Active accounts only — a disabled row must not be able to sign in. */
export function findByEmail(email: string): DbUser | undefined {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE email = ? AND disabled_at IS NULL')
    .get(email.trim().toLowerCase()) as UserRow | undefined;
  return row ? toUser(row) : undefined;
}

/**
 * Includes disabled accounts.
 *
 * Used to resolve the actor on a historical audit or approval row: a decision
 * signed by someone who has since left must still render their name, or the
 * record stops being attributable at exactly the moment it matters.
 */
export function findById(id: string): DbUser | undefined {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : undefined;
}

export function listUsers(): DbUser[] {
  const rows = getDb()
    .prepare('SELECT * FROM users ORDER BY created_at ASC')
    .all() as unknown as UserRow[];
  return rows.map(toUser);
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}
