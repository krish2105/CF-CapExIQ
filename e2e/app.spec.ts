import { test, expect } from '@playwright/test';

test.describe('CapExIQ Application End-to-End Tests', () => {
  test('1. Opens the application overview page and checks branding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('NovaRetail GCC').first()).toBeVisible();
  });

  test('2. Navigates to Executive Dashboard and verifies KPI metrics', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Baseline NPV').first()).toBeVisible();
    await expect(page.getByText('Initial Outlay').first()).toBeVisible();
  });

  test('3. Theme toggle button is rendered in top-right header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const themeBtn = page.locator('button[aria-label="Select color theme"]').first();
    await expect(themeBtn).toBeVisible({ timeout: 15000 });
  });

  test('4. Navigates to Monte Carlo Risk Simulation page', async ({ page }) => {
    await page.goto('/monte-carlo', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('5. Navigates to WACC & CAPM Calculator page', async ({ page }) => {
    await page.goto('/external-data', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });
});
