import { test, expect } from '@playwright/test';

/**
 * The point of moving the model server-side: two people looking at one
 * project see one set of numbers.
 *
 * Before this, each browser held its own copy in localStorage — a CFO could
 * change the discount rate and the analyst beside them would never see it,
 * and an approval could be signed against figures nobody else had.
 */
/**
 * Serial, and necessarily so.
 *
 * These specs mutate one server-side profile, which is the behaviour under
 * test. Run in parallel they race each other — the first version of this file
 * failed because one spec read the discount rate another had just written,
 * which is a defect in the test and a demonstration of the feature.
 */
test.describe.configure({ mode: 'serial' });

test.describe('the capital model is shared', () => {
  test('an edit in one browser reaches another', async ({ page, browser }) => {
    await page.goto('/assumptions');
    await expect(page).toHaveURL(/\/assumptions/);

    // Write through the API the UI uses, so this asserts the wiring rather
    // than driving whichever input happens to render today.
    const written = await page.evaluate(async () => {
      const res = await fetch('/api/profiles/proj-dubai-mfc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: { discountRate: 0.0975 } }),
      });
      return res.status;
    });
    expect(written).toBe(200);

    // A genuinely separate browser context — its own localStorage — signed in
    // as the same role via the stored session.
    const second = await browser.newContext({ storageState: 'e2e/.auth/cfo.json' });
    const otherPage = await second.newPage();
    await otherPage.goto('/assumptions');

    const seen = await otherPage.evaluate(async () => {
      const res = await fetch('/api/profiles');
      const body = await res.json();
      return body.profiles.find((p: { id: string }) => p.id === 'proj-dubai-mfc')?.assumptions
        .discountRate;
    });

    expect(seen).toBe(0.0975);
    await second.close();
  });

  test('the change is attributed in the durable audit trail', async ({ page }) => {
    await page.goto('/dashboard');

    await page.evaluate(async () => {
      await fetch('/api/profiles/proj-dubai-mfc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: { automationEquipment: 18_750_000 } }),
      });
    });

    const audit = await page.evaluate(async () => {
      const res = await fetch('/api/audit?action=assumption.changed');
      return res.json();
    });

    expect(audit.total).toBeGreaterThan(0);
    const summaries = audit.events.map((e: { summary: string }) => e.summary).join(' | ');
    expect(summaries).toMatch(/automationEquipment/);
    expect(audit.events[0].actorName).toBeTruthy();
  });

  test('the model survives clearing local storage', async ({ page }) => {
    await page.goto('/dashboard');

    await page.evaluate(async () => {
      await fetch('/api/profiles/proj-dubai-mfc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assumptions: { discountRate: 0.1025 } }),
      });
      // The old failure: this wiped the model entirely.
      localStorage.clear();
    });

    await page.reload();

    const survived = await page.evaluate(async () => {
      const res = await fetch('/api/profiles');
      const body = await res.json();
      return body.profiles.find((p: { id: string }) => p.id === 'proj-dubai-mfc')?.assumptions
        .discountRate;
    });

    expect(survived).toBe(0.1025);
  });

  test('localStorage no longer carries the model', async ({ page }) => {
    await page.goto('/dashboard');

    const stored = await page.evaluate(() => localStorage.getItem('capexiq-financial-store'));
    if (stored) {
      // Persisting assumptions locally made the cache out-rank the server on
      // load: a stale tab reintroduced its own numbers and wrote them back.
      const parsed = JSON.parse(stored);
      expect(parsed.state?.assumptions).toBeUndefined();
      expect(parsed.state?.projectProfiles).toBeUndefined();
    }
  });
});
