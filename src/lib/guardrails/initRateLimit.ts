import { setRateLimitBackend } from './aiGuardrails';
import { configureRateLimitBackendFromEnv } from './redisRateLimit';

/**
 * Install the configured rate-limit backend, once per process.
 *
 * Next.js has no single startup hook that reliably runs before route handlers
 * in every deployment target, so this is a memoised lazy init triggered by the
 * first rate-limit check rather than something wired into boot. The cost is
 * one boolean test per request; the alternative is an `instrumentation.ts`
 * that behaves differently across `next dev`, `next start` and serverless.
 *
 * Logged once, deliberately. A deployment quietly running per-process counters
 * while the operator believes they are shared is the exact failure this is
 * meant to prevent, and it is invisible unless something says so at startup.
 */
let initialised = false;

export function ensureRateLimitBackend(): void {
  if (initialised) return;
  initialised = true;

  const result = configureRateLimitBackendFromEnv(setRateLimitBackend);

  if (result.backend === 'redis') {
    console.info(`[rate-limit] shared counters enabled. ${result.reason}`);
  } else {
    console.warn(`[rate-limit] per-process counters. ${result.reason}`);
  }
}

/** Reset between tests. */
export function __resetRateLimitInit(): void {
  initialised = false;
}
