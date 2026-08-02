import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Sign in once per role and persist the browser state for the specs.
 *
 * WHY THROUGH THE FORM RATHER THAN THE API
 *
 * Posting to /api/auth/login would be faster and would set the session
 * cookie, but it would not populate `localStorage`. The Zustand store mirrors
 * the signed-in role there (`LoginForm` calls `setRole`), and every `RoleGate`
 * in the tree reads it. A cookie-only fixture therefore produces a browser
 * that is authenticated to the server and defaulted to CFO in the UI — which
 * would make role-gated assertions pass for a reason that has nothing to do
 * with the role under test.
 *
 * Driving the real form also keeps the sign-in path itself covered: if login
 * breaks, every spec fails at setup rather than mysteriously later.
 */

export const STATE_DIR = path.join(__dirname, '.auth');

const ACCOUNTS = [
  { role: 'cfo', email: 'cfo@novaretail.example', name: 'Rashid Kamal' },
  { role: 'ceo', email: 'ceo@novaretail.example', name: 'Amira Al Suwaidi' },
] as const;

for (const account of ACCOUNTS) {
  setup(`authenticate as ${account.role}`, async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(account.email);
    await page.getByLabel(/password/i).fill(`${account.role}-capex-2026`);
    await page.getByRole('button', { name: /sign in/i }).click();

    // The redirect is the assertion: landing on /dashboard proves the cookie
    // was issued and middleware accepted it.
    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    await page.context().storageState({
      path: path.join(STATE_DIR, `${account.role}.json`),
    });
  });
}
