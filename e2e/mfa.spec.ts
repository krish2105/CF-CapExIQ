import { test, expect, type Page } from '@playwright/test';
import { generateTotp, counterFor, TOTP_PERIOD_SECONDS } from '../src/lib/auth/totp';

/**
 * Multi-factor sign-in, driven through the real forms.
 *
 * Runs in the anonymous project and signs itself in, on `analyst` — an account
 * no other spec authenticates as.
 *
 * That isolation is not fussiness. The first version of this file enrolled MFA
 * on `cfo`, the account `auth.setup.ts` uses; a run that aborted between
 * enrolling and disabling left MFA switched on, and every subsequent spec in
 * the suite failed at setup because the password alone no longer signs in.
 * A second factor on a shared fixture account is a suite-wide outage waiting
 * for a mid-run failure.
 */
test.describe.configure({ mode: 'serial' });

const ACCOUNT = 'analyst@novaretail.example';
const PASSWORD = 'analyst-capex-2026';

/**
 * Wait until the current TOTP window is one the server has not seen.
 *
 * Replay protection refuses a counter already spent, so a test that enrols and
 * then signs in within the same 30-second window presents the same code twice
 * and is correctly rejected. That is the feature working; the test has to
 * respect it rather than the implementation weaken for it.
 */
async function freshCode(secret: string, usedCounter: number): Promise<string> {
  while (counterFor(Math.floor(Date.now() / 1000)) <= usedCounter) {
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return generateTotp(secret);
}

async function signInWithPassword(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ACCOUNT);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe('MFA', () => {
  let secret = '';
  let recoveryCodes: string[] = [];
  /** Counter consumed by enrolment — the next sign-in must exceed it. */
  let usedCounter = 0;

  test.afterAll(async ({ browser }) => {
    // Best-effort teardown covering a failure part-way through, so a red run
    // does not leave the account permanently second-factored.
    if (!secret) return;
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      await signInWithPassword(page);
      const codeField = page.getByLabel(/authentication code/i);
      if (await codeField.isVisible().catch(() => false)) {
        await codeField.fill(generateTotp(secret));
        await page.getByRole('button', { name: /verify/i }).click();
        await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(() => {});
      }
      await page.evaluate(
        async (c) =>
          fetch('/api/auth/mfa/enroll', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: c }),
          }),
        generateTotp(secret)
      );
    } catch {
      /* teardown is best effort */
    } finally {
      await context.close();
    }
  });

  test('enrolment is not active until a code is confirmed', async ({ page }) => {
    await signInWithPassword(page);
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    const started = await page.evaluate(async () => {
      const res = await fetch('/api/auth/mfa/enroll', { method: 'POST' });
      return res.json();
    });

    expect(started.secret).toBeTruthy();
    expect(started.otpauthUri).toContain('otpauth://totp/');
    secret = started.secret;

    // Pending, not enabled: a user whose phone never received the secret must
    // not be locked out of their own account.
    const state = await page.evaluate(async () => (await fetch('/api/auth/mfa/enroll')).json());
    expect(state.enabled).toBe(false);
    expect(state.pending).toBe(true);
  });

  test('confirming with a live code enables it and returns recovery codes', async ({ page }) => {
    await signInWithPassword(page);
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    const result = await page.evaluate(async (c) => {
      const res = await fetch('/api/auth/mfa/enroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      return { status: res.status, body: await res.json() };
    }, generateTotp(secret));

    expect(result.status).toBe(200);
    expect(result.body.enabled).toBe(true);
    // Without these, a lost phone is a permanently locked account.
    expect(result.body.recoveryCodes).toHaveLength(8);

    recoveryCodes = result.body.recoveryCodes;
    usedCounter = counterFor(Math.floor(Date.now() / 1000));
  });

  test('a recovery code completes sign-in and is then spent', async ({ page }) => {
    await signInWithPassword(page);
    await expect(page.getByLabel(/authentication code/i)).toBeVisible();

    // No window to wait for, and it covers the path a user takes when the
    // phone is gone — which is the whole reason recovery codes exist.
    await page.getByLabel(/authentication code/i).fill(recoveryCodes[0]);
    await page.getByRole('button', { name: /verify/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    const remaining = await page.evaluate(
      async () => (await fetch('/api/auth/mfa/enroll')).json()
    );
    expect(remaining.recoveryCodesRemaining).toBe(7);
  });

  test('a spent recovery code is refused', async ({ page }) => {
    await signInWithPassword(page);
    await expect(page.getByLabel(/authentication code/i)).toBeVisible();

    await page.getByLabel(/authentication code/i).fill(recoveryCodes[0]);
    await page.getByRole('button', { name: /verify/i }).click();

    await expect(page.getByText(/not valid/i)).toBeVisible();
  });

  test('the password alone no longer signs you in', async ({ page, context }) => {
    await signInWithPassword(page);

    // Held at the code step rather than admitted.
    await expect(page.getByLabel(/authentication code/i)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/login');

    // And the password step issued no session cookie.
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === 'capexiq_session')?.value ?? '').toBe('');
  });

  test('a wrong code is refused', async ({ page }) => {
    await signInWithPassword(page);
    await expect(page.getByLabel(/authentication code/i)).toBeVisible();

    await page.getByLabel(/authentication code/i).fill('000000');
    await page.getByRole('button', { name: /verify/i }).click();

    await expect(page.getByText(/not valid/i)).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('a correct code completes sign-in, and disabling needs one too', async ({ page }) => {
    // `freshCode` can block for most of a 30s TOTP window, which alone eats
    // Playwright's default per-test budget.
    test.setTimeout(90_000);

    await signInWithPassword(page);
    await expect(page.getByLabel(/authentication code/i)).toBeVisible();

    await page.getByLabel(/authentication code/i).fill(await freshCode(secret, usedCounter));
    await page.getByRole('button', { name: /verify/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();

    usedCounter = counterFor(Math.floor(Date.now() / 1000));

    // ---- disabling, from the session this test just established ----------
    // Folded in rather than run as its own test: a separate one would need a
    // second full sign-in and a second window wait, for no extra coverage.
    //
    // A signed-in browser left open is the likeliest way an attacker reaches
    // this endpoint, so the session alone must not be enough to strip the
    // factor.
    const refused = await page.evaluate(async () => {
      const res = await fetch('/api/auth/mfa/enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '000000' }),
      });
      return res.status;
    });
    expect(refused).toBe(400);

    const removed = await page.evaluate(async (c) => {
      const res = await fetch('/api/auth/mfa/enroll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      return res.status;
    }, await freshCode(secret, usedCounter));
    expect(removed).toBe(200);

    const state = await page.evaluate(async () => (await fetch('/api/auth/mfa/enroll')).json());
    expect(state.enabled).toBe(false);

    // Disabled, so teardown has nothing to undo.
    secret = '';
  });

});
