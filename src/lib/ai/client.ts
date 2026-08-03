import OpenAI from 'openai';
import { checkEgress, EgressBlockedError } from '@/lib/guardrails/egress';
import { AI_TIMEOUT_MS, AI_MAX_RETRIES } from './limits';

/**
 * The only sanctioned way to construct a model client.
 *
 * WHY THIS EXISTS
 *
 * `src/lib/guardrails/egress.ts` states that every outbound request must go
 * through `guardedFetch`, and `tests/guardrails.test.ts` claims to fail the
 * build if a raw external fetch is reintroduced. Neither was true of the two
 * paths that actually made network calls:
 *
 *   - Nine route handlers constructed `new OpenAI({ baseURL })` directly. The
 *     SDK owns its own transport, so the allowlist never saw those requests.
 *   - `src/lib/rag/embed.ts` called `fetch()` on a template literal, which the
 *     structural test did not match because it only looked for a literal
 *     `fetch('https://…')`.
 *
 * So the policy held by convention, and the test that was supposed to enforce
 * it passed for the wrong reason. Injecting the allowlist into the SDK's
 * transport makes the chokepoint real: a misconfigured `OPENAI_BASE_URL`
 * pointing at an arbitrary host now throws instead of silently exfiltrating
 * the prompt — and the prompt contains the capital model.
 */

/**
 * Adapter between the SDK's fetch contract and `checkEgress`.
 *
 * The SDK may pass a string, a URL or a Request, so the target is normalised
 * before the allowlist sees it. The check runs on every call rather than once
 * at construction: `OPENAI_BASE_URL` is read at request time, and a client
 * built before an environment change would otherwise keep using a host that
 * is no longer permitted.
 */
const guardedTransport = async (
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  const decision = checkEgress(url);
  if (!decision.allowed) {
    // Logged before throwing because the SDK catches whatever the transport
    // raises and re-reports it as a generic "Connection error", with the cause
    // discarded. Without this line an egress refusal is indistinguishable from
    // the provider being down, which is the difference between a policy
    // working and a policy silently misconfigured.
    console.error(`[egress] blocked ${url}: ${decision.reason}`);
    throw new EgressBlockedError(url, decision.reason);
  }

  return fetch(input as RequestInfo, init);
};

/**
 * Build a provider client bound to the egress allowlist.
 *
 * `tests/guardrails.test.ts` fails if any route constructs `new OpenAI(...)`
 * directly, so this cannot be bypassed by accident.
 */
export function createModelClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    fetch: guardedTransport as unknown as typeof fetch,

    // Set here rather than per call so no route can omit them. The SDK has no
    // timeout by default, so a provider that stalled mid-response held a
    // server connection open indefinitely; and its default of 2 retries turns
    // one stalled request into 90s of wall clock at triple the token spend.
    timeout: AI_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
  });
}
