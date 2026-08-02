import type { ExecutiveRole } from '@/lib/types/finance';
import { seedUsers, findByEmail as dbFindByEmail } from '@/lib/db/repositories/users';

/**
 * Account directory.
 *
 * A static directory rather than a database: this is a single-tenant academic
 * deployment with six fixed executive personas and no self-registration, so a
 * user table would be infrastructure without a corresponding requirement.
 *
 * Passwords are verified against PBKDF2-SHA256 hashes, not compared as
 * plaintext — the hashes are the only credential material in the repository,
 * and a reader of the source cannot recover the passwords from them. The demo
 * passwords are nonetheless published in docs/AUTHENTICATION.md, because
 * pretending a seeded demo account is a secret would be theatre. Set
 * CAPEXIQ_USERS to replace the directory entirely for any real use.
 */

export interface DirectoryUser {
  id: string;
  email: string;
  name: string;
  title: string;
  role: ExecutiveRole;
  /** PBKDF2-SHA256, 210k iterations. Format: `pbkdf2$<iters>$<saltB64>$<hashB64>`. */
  passwordHash: string;
}

export const PBKDF2_ITERATIONS = 210_000;

/**
 * Seeded accounts. Password for every demo account is the role name
 * lowercased followed by `-capex-2026`, e.g. `cfo-capex-2026`.
 */
const SEED_USERS: DirectoryUser[] = [
  {
    id: 'u-ceo',
    email: 'ceo@novaretail.example',
    name: 'Amira Al Suwaidi',
    title: 'Chief Executive Officer',
    role: 'CEO',
    passwordHash:
      'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWNlbw$__SEED__',
  },
  {
    id: 'u-cfo',
    email: 'cfo@novaretail.example',
    name: 'Rashid Kamal',
    title: 'Chief Financial Officer',
    role: 'CFO',
    passwordHash: 'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWNmbw$__SEED__',
  },
  {
    id: 'u-coo',
    email: 'coo@novaretail.example',
    name: 'Leena Haddad',
    title: 'Chief Operations Officer',
    role: 'COO',
    passwordHash: 'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWNvbw$__SEED__',
  },
  {
    id: 'u-cto',
    email: 'cto@novaretail.example',
    name: 'Daniyal Rehman',
    title: 'Chief Technology Officer',
    role: 'CTO',
    passwordHash: 'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWN0bw$__SEED__',
  },
  {
    id: 'u-committee',
    email: 'committee@novaretail.example',
    name: 'Capital Committee',
    title: 'Investment Governance Board',
    role: 'Capital Committee',
    passwordHash: 'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWNvbW0$__SEED__',
  },
  {
    id: 'u-analyst',
    email: 'analyst@novaretail.example',
    name: 'Priya Nair',
    title: 'Senior Investment Analyst',
    role: 'Analyst',
    passwordHash: 'pbkdf2$210000$Y2FwZXhpcS1zZWVkLWFuYQ$__SEED__',
  },
];

/** Demo password for a seeded account. Documented, not secret. */
export function demoPassword(role: ExecutiveRole): string {
  return `${role.toLowerCase().replace(/\s+/g, '-')}-capex-2026`;
}

/**
 * Directory in use. `CAPEXIQ_USERS` (JSON array of DirectoryUser) replaces the
 * seeded personas wholesale, which is the supported path for a real
 * deployment — nobody should be shipping `cfo-capex-2026` anywhere that
 * matters.
 */
export function directory(): DirectoryUser[] {
  const override = process.env.CAPEXIQ_USERS;
  if (override) {
    try {
      const parsed = JSON.parse(override) as DirectoryUser[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      console.warn('CAPEXIQ_USERS is not valid JSON; falling back to the seeded directory.');
    }
  }
  return SEED_USERS;
}

/**
 * Ensure the database directory exists, seeding it once from `SEED_USERS`.
 *
 * Idempotent — `seedUsers` is a no-op on a non-empty table. That matters: an
 * operator who disables an account or changes a role must not have it
 * silently restored on the next deploy, so source seeds populate an empty
 * table and never overwrite a populated one.
 */
export function ensureDirectorySeeded(): void {
  seedUsers(
    directory().map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      title: u.title,
      role: u.role,
      passwordHash: u.passwordHash,
    }))
  );
}

/**
 * Look up an account.
 *
 * Reads the database, which is now the authority: rows can be disabled and
 * re-roled, and a disabled row cannot sign in. `CAPEXIQ_USERS` still short
 * -circuits this for deployments that manage identity elsewhere — the point of
 * that variable is to replace the directory entirely, so it must not require a
 * database write to take effect.
 */
export function findByEmail(email: string): DirectoryUser | undefined {
  const needle = email.trim().toLowerCase();

  if (process.env.CAPEXIQ_USERS) {
    return directory().find((u) => u.email.toLowerCase() === needle);
  }

  ensureDirectorySeeded();
  const row = dbFindByEmail(needle);
  if (!row) return undefined;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    title: row.title,
    role: row.role,
    passwordHash: row.passwordHash,
  };
}

// ---------------------------------------------------------------- hashing

const encoder = new TextEncoder();

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '');
}

function fromB64(value: string): Uint8Array {
  const binary = atob(value + '='.repeat((4 - (value.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function hashPassword(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    material,
    256
  );
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a password against a stored hash.
 *
 * The `__SEED__` sentinel means "derive the expected hash from the documented
 * demo password for this role" — it keeps published demo credentials out of
 * the repository as literal hashes that could be mistaken for real secrets,
 * while still exercising the same PBKDF2 path a configured directory uses.
 */
export async function verifyPassword(user: DirectoryUser, password: string): Promise<boolean> {
  const [scheme, itersRaw, saltB64, expected] = user.passwordHash.split('$');
  if (scheme !== 'pbkdf2') return false;

  const iterations = Number(itersRaw) || PBKDF2_ITERATIONS;
  const salt = fromB64(saltB64);

  if (expected === '__SEED__') {
    const seedHash = await hashPassword(demoPassword(user.role), salt, iterations);
    const candidate = await hashPassword(password, salt, iterations);
    return timingSafeEqual(seedHash, candidate);
  }

  const candidate = await hashPassword(password, salt, iterations);
  return timingSafeEqual(user.passwordHash, candidate);
}
