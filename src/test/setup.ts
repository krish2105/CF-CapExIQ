import '@testing-library/jest-dom';

/**
 * Every test file gets its own in-memory database.
 *
 * Set before any module loads, because `getDb()` resolves the path once on
 * first connection. Pointing tests at the real `.data/capexiq.db` would let a
 * run mutate a developer's working data and — worse — make results depend on
 * whatever that file happened to contain.
 */
process.env.CAPEXIQ_DB_PATH = ':memory:';

/**
 * A real signing key, so `signSession` does not take the development fallback
 * path and tests exercise what a deployment actually runs.
 */
process.env.AUTH_SECRET ||= 'vitest-only-ephemeral-secret-not-a-deployment-key';
