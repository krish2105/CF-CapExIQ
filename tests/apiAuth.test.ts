import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { authorizeToken } from '@/lib/auth/apiAuth';
import { issueTestSession } from '@/test/session';
import type { ExecutiveRole } from '@/lib/types/finance';

/** A usable session: signed token plus the row that keeps it valid. */
const token = async (role: ExecutiveRole) => (await issueTestSession(role)).token;

describe('API authorisation policy', () => {
  it('rejects a missing session with 401, not 403', async () => {
    const decision = await authorizeToken(undefined, 'ai.advisory');
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.status).toBe(401);
  });

  it('rejects a forged token', async () => {
    const decision = await authorizeToken('not.a.real.token', 'ai.advisory');
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.status).toBe(401);
  });

  it('rejects a token whose payload was edited to escalate role', async () => {
    // Take a real Analyst session and rewrite the role claim to CFO, keeping
    // the original signature. This is the exact attack the HMAC exists for.
    const analyst = await token('Analyst');
    const [body, sig] = analyst.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    payload.role = 'CFO';
    const forgedBody = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const decision = await authorizeToken(`${forgedBody}.${sig}`, 'funding.view');
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.status).toBe(401);
  });

  it('admits a role that holds the permission', async () => {
    const decision = await authorizeToken(await token('CFO'), 'board.materials');
    expect(decision.ok).toBe(true);
  });

  it('refuses a valid session lacking the permission with 403', async () => {
    const decision = await authorizeToken(await token('Analyst'), 'board.materials');
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.status).toBe(403);
      expect(decision.error).toMatch(/Analyst/);
      expect(decision.error).toMatch(/board\.materials/);
    }
  });

  it('admits any authenticated role when no permission is required', async () => {
    for (const role of ['CEO', 'CFO', 'COO', 'CTO', 'Analyst'] as ExecutiveRole[]) {
      expect((await authorizeToken(await token(role), null)).ok).toBe(true);
    }
  });

  /**
   * The escalations that were live before server-side authorisation existed.
   * Each pair is a role that could previously reach an endpoint its lens
   * explicitly denies.
   */
  it.each([
    ['Analyst', 'board.materials'],
    ['CTO', 'vendor.negotiate'],
    ['CEO', 'assumptions.edit'],
    ['COO', 'funding.view'],
    ['CTO', 'financials.schedule'],
    ['CEO', 'metrics.advanced'],
  ] as Array<[ExecutiveRole, 'board.materials']>)(
    'blocks %s from %s',
    async (role, permission) => {
      const decision = await authorizeToken(await token(role), permission);
      expect(decision.ok).toBe(false);
      if (!decision.ok) expect(decision.status).toBe(403);
    }
  );
});

/**
 * Structural guard.
 *
 * The policy is only real if a new AI endpoint cannot ship without a check.
 * A handler that calls `requirePermission` and ignores the result compiles
 * and passes type-checking, so this asserts the early return too.
 */
describe('every AI route is authorised', () => {
  const AI_ROUTES = path.resolve(__dirname, '../src/app/api/ai');

  const routes = readdirSync(AI_ROUTES)
    .filter((entry) => statSync(path.join(AI_ROUTES, entry)).isDirectory())
    .map((entry) => ({ name: entry, file: path.join(AI_ROUTES, entry, 'route.ts') }));

  it('finds every AI route directory', () => {
    expect(routes.length).toBeGreaterThanOrEqual(11);
  });

  it.each(routes)('$name guards its handler', ({ file }) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/from '@\/lib\/auth\/apiAuth'/);
    expect(source).toMatch(/await require(Permission|Session)\(/);
    expect(source).toMatch(/if \(!auth\.ok\) return auth\.response;/);
  });

  /**
   * `live-macro` is exempt: it makes no provider call and serves a static
   * constant, so it costs nothing to answer, and the header ticker polls it
   * often enough that a 20/minute budget would break the UI rather than
   * protect anything.
   */
  const BILLED = routes.filter((r) => r.name !== 'live-macro');

  it.each(BILLED)('$name rate-limits per user', ({ file }) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/rateLimited\(/);
    expect(source).toMatch(/if \(limited\) return limited;/);
  });

  it('leaves no route interpolating raw client JSON into a prompt', () => {
    // `JSON.stringify(assumptions)` in a user turn is a prompt-injection
    // channel: the object is arbitrary client-supplied JSON, so a string field
    // anywhere inside it reached the model unchecked while the guarded
    // question field carried nothing.
    const offenders = routes.filter(({ file }) =>
      /JSON\.stringify\((assumptions|metrics|currentAssumptions)\)/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders.map((o) => o.name)).toEqual([]);
  });

  /**
   * A canned board memo returned with a 200 and no marker is indistinguishable
   * from a generated one. `live-macro` is exempt — it serves declared
   * reference data with its own `isLive: false` and provenance string, and
   * `explain` streams `isFallback` on its SSE `done` event instead.
   */
  const STRUCTURED = routes.filter((r) => !['live-macro', 'explain'].includes(r.name));

  it.each(STRUCTURED)('$name marks generated vs fallback responses', ({ file }) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/from '@\/lib\/ai\/response'/);
    expect(source).toMatch(/aiFallback\(/);
  });

  it.each(STRUCTURED)('$name returns no unmarked payload', ({ file }) => {
    const source = readFileSync(file, 'utf8');
    // Every remaining bare NextResponse.json must be an error envelope
    // (guardrail refusal / 401 / 429), never a content payload.
    const bare = source.match(/return NextResponse\.json\((?!\s*\{\s*error)/g) ?? [];
    expect(bare).toEqual([]);
  });

  /**
   * Revocation must not be checked in middleware.
   *
   * Middleware compiles into its own edge bundle with a separate webpack
   * runtime (`.next/server/src/middleware.js` + `edge-runtime-webpack.js`),
   * which holds its own copy of every module it imports and cannot reach the
   * Node module registry that route handlers share. A revocation check placed
   * there reads state that the logout handler — `runtime = 'nodejs'` — never
   * wrote to, so it returns "not revoked" for every token, forever, while
   * looking exactly like a working control.
   *
   * That is not hypothetical: it is precisely how a superseded in-memory
   * implementation on this repo failed. The store is a SQLite table for the
   * same reason — `node:sqlite` cannot load at the edge at all, which turns a
   * silent no-op into a build error.
   */
  it('does not check revocation at the edge, where the store is unreachable', () => {
    const source = readFileSync(path.resolve(__dirname, '../src/middleware.ts'), 'utf8');
    expect(source).not.toMatch(/from '@\/lib\/db\//);
    expect(source).not.toMatch(/isSessionActive|isSessionRevoked/);
  });

  it.each(routes)('$name checks before entering its try block', ({ file }) => {
    const source = readFileSync(file, 'utf8');
    const guard = source.indexOf('if (!auth.ok) return auth.response;');
    const firstTry = source.indexOf('try {');
    // A guard inside the try is swallowed by the fallback catch and returned
    // as a 200 with content — the failure mode this ordering exists to stop.
    if (firstTry !== -1) expect(guard).toBeLessThan(firstTry);
  });
});
