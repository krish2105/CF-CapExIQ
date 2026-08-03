import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * The suite used to run entirely unauthenticated. Once middleware started
 * gating every route, two specs failed and three kept passing against the
 * login page they had been redirected to — an `h1` and the string
 * "NovaRetail GCC" both appear there, so the assertions still matched. Green
 * tests asserting the wrong page are worse than red ones, because nobody
 * looks at them.
 *
 * Signed-in state is therefore established once by a setup project and reused,
 * and the access-control specs opt out of it deliberately.
 */
const STATE_DIR = path.join(__dirname, 'e2e/.auth');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: path.join(STATE_DIR, 'cfo.json') },
      dependencies: ['setup'],
      testIgnore: [
        /auth\.setup\.ts/,
        /access-control\.spec\.ts/,
        /rbac\.spec\.ts/,
        /mfa\.spec\.ts/,
      ],
    },

    {
      // Restricted lens, for assertions about what a role may NOT see.
      name: 'chromium-ceo',
      use: { ...devices['Desktop Chrome'], storageState: path.join(STATE_DIR, 'ceo.json') },
      dependencies: ['setup'],
      testMatch: /rbac\.spec\.ts/,
    },

    {
      // No storageState at all: these specs assert the unauthenticated
      // behaviour, so inheriting a session would silently invert them.
      name: 'chromium-anonymous',
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
      // MFA joins these: it signs in itself, and enrolling a second factor
      // on an account the setup project uses would leave the whole suite
      // unable to authenticate if a run aborted mid-way.
      testMatch: /(access-control|mfa)\.spec\.ts/,
    },
  ],

  webServer: {
    // CI runs this against `pnpm start` (the production build) via
    // PLAYWRIGHT_WEB_SERVER_COMMAND — middleware, static prerendering and the
    // session module all behave differently under NODE_ENV=production, and
    // that is the configuration actually being shipped.
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      // `next dev` leaves NODE_ENV as development, where the session module
      // falls back to a dev key — but pinning it here keeps the suite working
      // if the server is started as a production build instead.
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-only-ephemeral-secret-not-a-deployment-key',
    },
  },
});
