import { test, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Role-based access control, proven end to end.
 *
 * The Executive Lens used to be a dropdown, so a COO and a CFO saw identical
 * output. These specs assert the boundary is now real: the same URL returns
 * the page to one role and a refusal to another.
 */

test.describe('RBAC boundary', () => {
  test.describe('as CFO', () => {
    test.use({ storageState: path.join(__dirname, '.auth/cfo.json') });

    test('reaches the funding structure', async ({ page }) => {
      await page.goto('/funding', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Outside your authority')).toHaveCount(0);
    });
  });

  test.describe('as COO', () => {
    test.use({ storageState: path.join(__dirname, '.auth/coo.json') });

    test('is refused the funding structure', async ({ page }) => {
      await page.goto('/funding', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Outside your authority')).toBeVisible({ timeout: 15000 });
    });

    test('is refused the approval workflow', async ({ page }) => {
      await page.goto('/approvals', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Outside your authority')).toBeVisible({ timeout: 15000 });
    });
  });
});

test.describe('unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a protected route redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
