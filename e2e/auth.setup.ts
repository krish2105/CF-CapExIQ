import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

/**
 * Sign in once per role and persist the browser state for the specs.
 *
 * WHY THROUGH THE FORM RATHER THAN THE API
 *
 * Posting to /api/auth/login would be faster and would set the session cookie,
 * but it would exercise none of the sign-in path. Driving the real form keeps
 * that path covered: if login breaks, every spec fails here — at setup, with an
 * obvious cause — rather than mysteriously later.
 *
 * It also covers the second factor. An account with MFA enrolled does not
 * receive a session from the password step alone, and a fixture that posted
 * straight to the login endpoint would report success while holding no session
 * at all.
 *
 * TWO RACES THIS DELIBERATELY AVOIDS
 *
 * 1. The login inputs are React-controlled (`value={email}` with an onChange).
 *    A `fill()` issued before hydration completes writes the DOM value, then
 *    React re-renders the input from its own empty state and the typed value is
 *    silently discarded — the form submits with an empty field and never
 *    navigates. Clicking the persona button drives the same React state a user
 *    would, and the value landing is itself the proof hydration has finished.
 *
 * 2. `submit()` calls `router.replace()`, a client-side soft navigation. No
 *    `load` event fires, so `page.waitForURL()` — which waits for `load` by
 *    default — can block until timeout after the URL has already changed.
 *    Polling with a web-first assertion is the correct wait here.
 */

export const STATE_DIR = path.join(__dirname, '.auth');

const ACCOUNTS = [
  { role: 'cfo', email: 'cfo@novaretail.example', name: 'Rashid Kamal' },
  { role: 'ceo', email: 'ceo@novaretail.example', name: 'Amira Al Suwaidi' },
] as const;

/** Generous: a cold dev server compiles /login and /dashboard on demand. */
const SLOW = 90_000;

for (const account of ACCOUNTS) {
  setup(`authenticate as ${account.role}`, async ({ page }) => {
    setup.setTimeout(180_000);

    // `domcontentloaded` rather than `load`: the server streams, and the load
    // event can lag well behind the form being usable.
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: SLOW });

    const email = page.locator('#email');
    const password = page.locator('#password');
    await email.waitFor({ state: 'visible', timeout: SLOW });

    // Retry until the value sticks — the click is a no-op until React has
    // attached its handlers, and the assertion is what tells us it has.
    const persona = page.getByRole('button').filter({ hasText: account.email });
    await expect(async () => {
      await persona.click();
      await expect(email).toHaveValue(account.email, { timeout: 1_000 });
    }).toPass({ timeout: SLOW });

    // The persona button derives the password from the role. Assert rather than
    // assume, so a change to that derivation fails here and not later as an
    // unexplained 401.
    await expect(password).toHaveValue(`${account.role}-capex-2026`);

    await page.getByRole('button', { name: /^sign in$/i }).click();

    // The redirect is the assertion: landing on /dashboard proves the cookie
    // was issued and middleware accepted it. Polled, not `waitForURL` — see the
    // soft-navigation note above.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: SLOW });

    await page.context().storageState({
      path: path.join(STATE_DIR, `${account.role}.json`),
    });
  });
}
