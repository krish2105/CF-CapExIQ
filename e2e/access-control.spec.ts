import { test, expect } from '@playwright/test';

/**
 * Unauthenticated behaviour. Runs with no storageState — see the
 * `chromium-anonymous` project, which pins an empty one so a session cannot
 * leak in from the setup project and quietly invert every assertion here.
 *
 * None of this was covered before: the old suite ran unauthenticated by
 * accident rather than by design, and asserted application content while
 * actually sitting on the login page.
 */
test.describe('unauthenticated access', () => {
  for (const route of ['/', '/dashboard', '/monte-carlo', '/funding', '/settings']) {
    test(`${route} redirects to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('the intended destination is preserved for after sign-in', async ({ page }) => {
    await page.goto('/monte-carlo');
    await expect(page).toHaveURL(/next=%2Fmonte-carlo/);
  });

  test('API routes answer 401 rather than redirecting', async ({ request }) => {
    const res = await request.post('/api/ai/board-memo', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('the login page does not leak the module inventory', async ({ page }) => {
    await page.goto('/login');
    // AppChrome renders bare on /login precisely so a visitor cannot read the
    // navigation rail for a list of everything the product does.
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('rejects a bad password without revealing whether the account exists', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('cfo@novaretail.example');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('an unknown account returns the identical message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nobody@novaretail.example');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Same wording as above — the form must not be an account-enumeration
    // oracle for a directory of named executives.
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
