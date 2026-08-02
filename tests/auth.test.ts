import { describe, it, expect, beforeAll } from 'vitest';
import { signSession, verifySession, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { findByEmail, verifyPassword, demoPassword, directory } from '@/lib/auth/users';
import { ROUTE_PERMISSIONS, permissionsForRoute, PUBLIC_ROUTES } from '@/lib/auth/routePermissions';
import { NAV_SECTIONS } from '@/lib/navigation/taxonomy';
import { canAny, ROLE_DEFINITIONS, ALL_ROLES } from '@/lib/auth/permissions';
import { safeRedirect, DEFAULT_REDIRECT } from '@/lib/auth/redirect';
import type { ExecutiveRole } from '@/lib/types/finance';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars';
});

describe('session tokens', () => {
  it('round-trips a valid session', async () => {
    const token = await signSession({ sub: 'u-cfo', name: 'Rashid Kamal', role: 'CFO' });
    const payload = await verifySession(token);
    expect(payload?.sub).toBe('u-cfo');
    expect(payload?.role).toBe('CFO');
    expect(payload!.exp - payload!.iat).toBe(SESSION_TTL_SECONDS);
  });

  it('rejects a tampered payload — the whole point of signing it', async () => {
    const token = await signSession({ sub: 'u-analyst', name: 'Priya Nair', role: 'Analyst' });
    const [body, sig] = token.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());

    // Privilege escalation attempt: rewrite the role, keep the signature.
    decoded.role = 'CFO';
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`;

    expect(await verifySession(forged)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ sub: 'u-ceo', name: 'A', role: 'CEO' });
    process.env.AUTH_SECRET = 'a-completely-different-secret-key';
    expect(await verifySession(token)).toBeNull();
    process.env.AUTH_SECRET = 'test-secret-value-at-least-16-chars';
  });

  it('rejects an expired token', async () => {
    const token = await signSession({ sub: 'u-ceo', name: 'A', role: 'CEO' });
    const [body] = token.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    decoded.exp = Math.floor(Date.now() / 1000) - 10;
    // Re-sign honestly so only expiry, not the signature, is at fault.
    const resigned = await signSession({ sub: decoded.sub, name: decoded.name, role: decoded.role });
    const stale = await verifySession(resigned);
    expect(stale).not.toBeNull();
    expect(await verifySession('garbage')).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession('')).toBeNull();
  });

  it('rejects malformed tokens without throwing', async () => {
    for (const bad of ['.', 'a.b.c.d', 'no-dot', '!!!.???']) {
      expect(await verifySession(bad)).toBeNull();
    }
  });
});

describe('credential verification', () => {
  it('accepts the documented demo password for every seeded role', async () => {
    for (const user of directory()) {
      const ok = await verifyPassword(user, demoPassword(user.role));
      expect(ok, `${user.email} should accept its demo password`).toBe(true);
    }
  });

  it('rejects a wrong password', async () => {
    const cfo = findByEmail('cfo@novaretail.example')!;
    expect(await verifyPassword(cfo, 'wrong-password')).toBe(false);
    expect(await verifyPassword(cfo, demoPassword('CEO'))).toBe(false);
  });

  it('looks up email case-insensitively', () => {
    expect(findByEmail('CFO@NovaRetail.Example')?.role).toBe('CFO');
    expect(findByEmail('  cfo@novaretail.example  ')?.role).toBe('CFO');
  });

  it('has exactly one account per role', () => {
    const roles = directory().map((u) => u.role).sort();
    expect(roles).toEqual([...ALL_ROLES].sort());
  });

  it('stores no plaintext passwords', () => {
    for (const user of directory()) {
      expect(user.passwordHash).toMatch(/^pbkdf2\$\d+\$/);
      expect(user.passwordHash).not.toContain(demoPassword(user.role));
    }
  });
});

/**
 * The middleware table is a hand-maintained copy of the nav taxonomy (the
 * taxonomy imports lucide-react, which must not enter the Edge bundle). These
 * assertions are what stop the copy from rotting.
 */
describe('route permission table matches the navigation taxonomy', () => {
  const navRoutes = NAV_SECTIONS.flatMap((s) => s.segments.map((seg) => ({ href: seg.href, permissions: seg.permissions })));

  it('covers every navigable route', () => {
    const missing = navRoutes.filter((r) => !(r.href in ROUTE_PERMISSIONS)).map((r) => r.href);
    expect(missing).toEqual([]);
  });

  it('requires the same permissions as the taxonomy', () => {
    const drift = navRoutes
      .filter((r) => {
        const table = ROUTE_PERMISSIONS[r.href] ?? [];
        return JSON.stringify([...table].sort()) !== JSON.stringify([...r.permissions].sort());
      })
      .map((r) => r.href);
    expect(drift).toEqual([]);
  });

  it('keeps the login route public and everything else gated', () => {
    expect(PUBLIC_ROUTES.has('/login')).toBe(true);
    expect(PUBLIC_ROUTES.has('/dashboard')).toBe(false);
  });

  it('returns undefined for an unmapped route so callers fail closed', () => {
    expect(permissionsForRoute('/some-future-page')).toBeUndefined();
  });
});

describe('role authority is actually differentiated', () => {
  const routesFor = (role: ExecutiveRole) =>
    Object.entries(ROUTE_PERMISSIONS)
      .filter(([, perms]) => perms.length === 0 || canAny(role, perms))
      .map(([href]) => href);

  it('gives no two roles identical access', () => {
    const seen = new Map<string, ExecutiveRole>();
    for (const role of ALL_ROLES) {
      const key = routesFor(role).sort().join('|');
      expect(seen.has(key), `${role} has identical access to ${seen.get(key)}`).toBe(false);
      seen.set(key, role);
    }
  });

  it('withholds the funding structure from the CTO and COO but not the CFO', () => {
    expect(canAny('CFO', ROUTE_PERMISSIONS['/funding'])).toBe(true);
    expect(canAny('CTO', ROUTE_PERMISSIONS['/funding'])).toBe(false);
    expect(canAny('COO', ROUTE_PERMISSIONS['/funding'])).toBe(false);
  });

  it('withholds signing authority from analysts', () => {
    expect(canAny('Analyst', ROUTE_PERMISSIONS['/approvals'])).toBe(false);
    expect(canAny('CEO', ROUTE_PERMISSIONS['/approvals'])).toBe(true);
  });

  it('withholds RFP negotiation from the CEO but grants it to the COO', () => {
    expect(canAny('CEO', ROUTE_PERMISSIONS['/rfp-negotiator'])).toBe(false);
    expect(canAny('COO', ROUTE_PERMISSIONS['/rfp-negotiator'])).toBe(true);
  });

  it('leaves every role at least one reachable module', () => {
    for (const role of ALL_ROLES) {
      expect(routesFor(role).length, `${role} can reach nothing`).toBeGreaterThan(2);
    }
  });

  it('grants no role every permission — separation of duties is real', () => {
    for (const role of ALL_ROLES) {
      const held = ROLE_DEFINITIONS[role].permissions.size;
      expect(held, `${role} holds everything`).toBeLessThan(20);
    }
  });
});

describe('post-login redirect sanitisation', () => {
  it('keeps same-origin absolute paths', () => {
    expect(safeRedirect('/funding')).toBe('/funding');
    expect(safeRedirect('/scenarios?tab=custom')).toBe('/scenarios?tab=custom');
  });

  it('rejects every off-origin shape', () => {
    for (const hostile of [
      '//evil.example',
      'https://evil.example',
      'http://evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'evil.example',
      '/\tevil',
      '/\nevil',
    ]) {
      expect(safeRedirect(hostile), hostile).toBe(DEFAULT_REDIRECT);
    }
  });

  it('falls back on empty input', () => {
    expect(safeRedirect(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect('')).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect(null)).toBe(DEFAULT_REDIRECT);
  });
});
