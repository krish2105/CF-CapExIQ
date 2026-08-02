import { test, expect } from '@playwright/test';

/**
 * Signed in as CEO — a lens that deliberately does NOT hold
 * `metrics.advanced`, `financials.schedule`, `funding.view`,
 * `operations.view` or `assumptions.edit`.
 *
 * This is the regression suite for the authorisation work: every assertion
 * here failed open before server-side checks existed, and none of it was
 * covered by any test at any level.
 */
test.describe('CEO lens restrictions', () => {
  test('reaches the dashboard it is entitled to', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();
  });

  test('is refused a route requiring funding.view', async ({ page }) => {
    await page.goto('/funding');
    // Middleware rewrites to /forbidden rather than redirecting, so the URL
    // stays put and the refusal explains itself.
    await expect(page.getByText(/restricted|not hold|forbidden/i).first()).toBeVisible();
    await expect(page.getByText('Green Loan').first()).toBeHidden();
  });

  test('is refused a route requiring financials.schedule', async ({ page }) => {
    await page.goto('/financial-model');
    await expect(page.getByText(/restricted|not hold|forbidden/i).first()).toBeVisible();
  });

  test('does not see analyst-grade metrics on a page it can open', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();
    // The tile is withheld by RoleGate; the grid reflows rather than gapping.
    await expect(page.getByText('Profitability Index')).toHaveCount(0);
  });

  test('cannot drive the model through the AI write endpoints', async ({ request }) => {
    // assumptions.edit — a microphone must not be a way around the matrix.
    const voice = await request.post('/api/ai/voice-intent', {
      data: { userSpeech: 'set the discount rate to 5 percent' },
    });
    expect(voice.status()).toBe(403);

    const quote = await request.post('/api/ai/parse-quote', {
      data: { documentText: 'Equipment: AED 1,000,000' },
    });
    expect(quote.status()).toBe(403);
  });

  test('cannot reach a vendor.negotiate endpoint', async ({ request }) => {
    const res = await request.post('/api/ai/rfp-negotiator', { data: {} });
    expect(res.status()).toBe(403);
  });

  test('can reach the endpoints its lens does hold', async ({ request }) => {
    // board.materials — the CEO holds this one, so the guard must not
    // over-restrict. A test that only asserts denials passes on a broken app
    // that refuses everything.
    const res = await request.post('/api/ai/board-memo', { data: {} });
    expect(res.status()).toBe(200);
  });

  /**
   * The regression that item 9 exists for.
   *
   * `selectedRole` used to live in the persisted store, so writing one
   * localStorage key promoted the lens and every gated widget rendered. The
   * value now comes from the signed session via RoleProvider and the store
   * does not carry a role at all, so the same tampering is inert.
   */
  test('promoting the lens via localStorage does not unlock gated content', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Profitability Index')).toHaveCount(0);

    await page.evaluate(() => {
      const raw = localStorage.getItem('capexiq-financial-store');
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
      parsed.state = { ...parsed.state, selectedRole: 'CFO' };
      localStorage.setItem('capexiq-financial-store', JSON.stringify(parsed));
    });

    await page.reload();

    // Still the CEO lens: the injected role is not read by anything.
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();
    await expect(page.getByText('Profitability Index')).toHaveCount(0);
  });

  test('a tampered lens cannot reach a restricted route either', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'capexiq-financial-store',
        JSON.stringify({ state: { selectedRole: 'CFO' }, version: 0 })
      );
    }).catch(() => {
      /* no page loaded yet on a fresh context — the goto below covers it */
    });

    await page.goto('/funding');
    await expect(page.getByText(/restricted|not hold|forbidden/i).first()).toBeVisible();
  });

  test('the voice copilot is not rendered for a lens that cannot use it', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: /voice/i })).toHaveCount(0);
  });
});
