import { test, expect } from '@playwright/test';

/**
 * Content-Security-Policy.
 *
 * Asserted end-to-end rather than by unit test because the failure mode is a
 * policy that looks correct in isolation and blocks the application's own
 * bundle in a browser — which no amount of string comparison catches.
 */
test.describe('CSP', () => {
  test('serves a nonce-based policy with no unsafe-inline scripts', async ({ request }) => {
    const res = await request.get('/login');
    const csp = res.headers()['content-security-policy'];

    expect(csp).toBeTruthy();
    expect(csp).toMatch(/script-src[^;]*'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toMatch(/script-src[^;]*'strict-dynamic'/);

    // The finding this closes: any injected <script> executed, and CSP
    // contributed nothing against XSS.
    const scriptSrc = csp.match(/script-src[^;]*/)?.[0] ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test('issues a different nonce on every response', async ({ request }) => {
    const nonceOf = async () => {
      const res = await request.get('/login');
      return res.headers()['content-security-policy'].match(/'nonce-([^']+)'/)?.[1];
    };

    const [a, b] = [await nonceOf(), await nonceOf()];
    expect(a).toBeTruthy();
    // A reused nonce is no nonce at all — an attacker who reads one page can
    // then write a script tag that any later page will execute.
    expect(a).not.toBe(b);
  });

  test('applies the policy to redirects and errors, not just page loads', async ({ request }) => {
    // Five of six exit paths carrying a policy is a policy with a hole, and
    // the missing one is usually the error path.
    //
    // This project is signed in, so /login is the path that redirects here —
    // asserting against /dashboard would silently test a 200 instead.
    const redirect = await request.get('/login', { maxRedirects: 0 });
    expect(redirect.status()).toBeGreaterThanOrEqual(300);
    expect(redirect.status()).toBeLessThan(400);
    expect(redirect.headers()['content-security-policy']).toBeTruthy();

    // A refusal, not a 401: this project holds a CFO session, and the CFO
    // lens does not hold `vendor.negotiate`. Asserting a 401 here tested a
    // 200 instead, because an authenticated context never sees one.
    const refused = await request.post('/api/ai/rfp-negotiator', { data: {} });
    expect(refused.status()).toBe(403);
    expect(refused.headers()['content-security-policy']).toBeTruthy();
  });

  test('locks down the remaining directives', async ({ request }) => {
    const csp = (await request.get('/login')).headers()['content-security-policy'];
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  test('ships no second, conflicting policy', async ({ request }) => {
    // A static CSP left in next.config.mjs would not merge with the
    // per-request one — the browser enforces both, and the stricter union
    // blocks the very scripts the nonce exists to permit.
    const res = await request.get('/login');
    const raw = res.headersArray().filter((h) => h.name.toLowerCase() === 'content-security-policy');
    expect(raw).toHaveLength(1);
  });

  test('the application still runs under the policy', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) {
        violations.push(m.text());
      }
    });

    await page.goto('/dashboard');
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();

    // Hydration is the real test: a policy that blocks the bundle leaves
    // static HTML that looks fine until something is clicked.
    await expect(page.locator('button[aria-label="Select colour theme"]').first()).toBeVisible();
    expect(violations).toEqual([]);
  });

  test('the theme bootstrap script runs, so there is no flash of wrong theme', async ({ page }) => {
    await page.goto('/dashboard');
    // next-themes writes this class before first paint via an inline script —
    // the one script in the tree that is genuinely ours, and the reason the
    // nonce has to reach the layout at all.
    const cls = await page.evaluate(() => document.documentElement.className);
    expect(cls).toMatch(/dark|light/);
  });
});
