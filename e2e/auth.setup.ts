import { test as setup, expect, type Page } from '@playwright/test';
import path from 'node:path';

/**
 * Authentication setup.
 *
 * Every route is gated by `src/middleware.ts`, which verifies a signed session
 * cookie before the page renders. Specs that navigate straight to a protected
 * route are redirected to /login, so the suite needs genuine signed-in state —
 * the cookie is HMAC-signed and cannot be forged from the test side.
 *
 * TWO RACES THIS DELIBERATELY AVOIDS
 *
 * 1. The login inputs are React-controlled (`value={email}` with an onChange).
 *    A `fill()` issued before hydration completes writes the DOM value, then
 *    React re-renders the input from its own empty state and the typed value is
 *    silently discarded. That is exactly what happened previously: the email
 *    box ended up empty while the password — filled a moment later, after
 *    hydration — survived, so the form submitted with no email and never
 *    navigated. Clicking the persona button instead drives the same React state
 *    the user would, and the value landing is itself the proof that hydration
 *    has finished.
 *
 * 2. `submit()` calls `router.replace()`, a client-side soft navigation. No
 *    `load` event fires, so `page.waitForURL()` — which waits for `load` by
 *    default — blocks until timeout even though the URL has already changed.
 *    Polling the URL with a web-first assertion is the correct wait here.
 */

export const CFO_STATE = path.join(__dirname, '.auth/cfo.json');
export const COO_STATE = path.join(__dirname, '.auth/coo.json');

/** Generous: a cold Next dev server compiles /login and /dashboard on demand. */
const SLOW = 90_000;

async function signIn(page: Page, email: string, password: string, file: string) {
  // `domcontentloaded` rather than `load`: the dev server streams and the load
  // event can lag well behind the form being usable.
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: SLOW });

  const emailField = page.locator('#email');
  const passwordField = page.locator('#password');
  await emailField.waitFor({ state: 'visible', timeout: SLOW });

  // Retry until the value sticks — the click is a no-op until React has
  // attached its handlers, and the assertion is what tells us it has.
  const persona = page.getByRole('button').filter({ hasText: email });
  await expect(async () => {
    await persona.click();
    await expect(emailField).toHaveValue(email, { timeout: 1_000 });
  }).toPass({ timeout: SLOW });

  // The persona button derives the password from the role; assert rather than
  // assume, so a change to that derivation fails here and not mysteriously
  // later with an unexplained 401.
  await expect(passwordField).toHaveValue(password);

  await page.getByRole('button', { name: /^sign in$/i }).click();

  // Soft navigation — poll the URL rather than waiting for a load event.
  await expect(page).not.toHaveURL(/\/login/, { timeout: SLOW });
  // Confirm we landed on a real page rather than a redirect loop.
  await expect(emailField).toHaveCount(0, { timeout: SLOW });

  await page.context().storageState({ path: file });
}

setup('authenticate as CFO', async ({ page }) => {
  setup.setTimeout(180_000);
  await signIn(page, 'cfo@novaretail.example', 'cfo-capex-2026', CFO_STATE);
});

setup('authenticate as COO', async ({ page }) => {
  setup.setTimeout(180_000);
  await signIn(page, 'coo@novaretail.example', 'coo-capex-2026', COO_STATE);
});
