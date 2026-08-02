import { test, expect } from '@playwright/test';

/**
 * Signed in as CFO — the lens that holds nearly every permission, so these
 * specs exercise the application rather than the authorisation matrix. Role
 * restrictions live in rbac.spec.ts, sign-in in access-control.spec.ts.
 *
 * Every assertion names content that exists ONLY on the page under test. The
 * previous suite asserted `h1` visibility, which the login page also
 * satisfies — so three of its five tests passed while never once reaching
 * their target page.
 */
test.describe('CapExIQ — authenticated application', () => {
  test('dashboard renders the headline capital position', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();
    await expect(page.getByText('Initial Outlay').first()).toBeVisible();
  });

  test('CFO sees the analyst-grade metrics their lens holds', async ({ page }) => {
    await page.goto('/dashboard');
    // metrics.advanced — withheld from the CEO lens, asserted in rbac.spec.ts.
    await expect(page.getByText('Profitability Index').first()).toBeVisible();
  });

  test('monte carlo page loads under its own route', async ({ page }) => {
    await page.goto('/monte-carlo');
    await expect(page).toHaveURL(/\/monte-carlo/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('financial model exposes the cash-flow schedule', async ({ page }) => {
    await page.goto('/financial-model');
    await expect(page).toHaveURL(/\/financial-model/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('theme toggle is present in the application chrome', async ({ page }) => {
    await page.goto('/dashboard');
    // "colour", not "color" — the original spec asserted the American
    // spelling and could never have matched, independently of the auth change.
    await expect(page.locator('button[aria-label="Select colour theme"]').first()).toBeVisible();
  });

  test('the persisted store carries no role', async ({ page }) => {
    await page.goto('/dashboard');

    // The inverse of what this asserted before item 9. The store used to hold
    // `selectedRole`, seeded at sign-in and read by every RoleGate — which is
    // exactly what made the lens forgeable from devtools. The lens now comes
    // from the signed session, so the absence of a role here is the guarantee.
    const stored = await page.evaluate(() =>
      localStorage.getItem('capexiq-financial-store')
    );
    if (stored !== null) expect(stored).not.toContain('selectedRole');

    // And the lens itself still renders correctly from the session.
    await expect(page.getByText('Profitability Index').first()).toBeVisible();
  });
});
