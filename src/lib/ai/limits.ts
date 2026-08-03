/**
 * Per-request ceilings on model calls.
 *
 * WHY THIS EXISTS
 *
 * Rate limiting bounds how *often* a user can call a billed endpoint. It says
 * nothing about how much any single call costs. Until now no route in this
 * lineage set `max_tokens` or a request timeout, so one request could generate
 * until the provider's own default ceiling — and a provider that stalled mid
 * -response held a server connection open indefinitely, because the OpenAI
 * SDK has no timeout by default.
 *
 * The values and the LONG/standard split are taken from the parallel
 * implementation on `main` (`d40bbfe`), which had this right when this branch
 * did not. Reading it after superseding it is how the gap was found.
 *
 * TRUNCATION IS A FAILURE, NOT A DEGRADATION
 *
 * A completion cut off at the ceiling produces invalid JSON. That is the
 * intended behaviour: `parseModelOutput` rejects it and the route serves its
 * deterministic fallback, correctly flagged `isFallback`. A half-written board
 * memo rendered as though it were complete would be far worse than an honest
 * "the provider was unavailable".
 */

/** Token ceiling for the structured JSON routes. */
export const AI_MAX_TOKENS = 800;

/**
 * Raised ceiling for routes whose payload genuinely does not fit in 800.
 *
 * Board memo and board debate emit several prose fields plus arrays of
 * statements; the vendor-quote extractor can return up to 60 line items; the
 * advisory assistant streams long-form prose. Everything else is smaller and
 * stays on the lower ceiling, because a limit that is generous everywhere
 * bounds nothing in practice.
 */
export const AI_MAX_TOKENS_LONG = 1600;

/**
 * Wall-clock ceiling for a model call.
 *
 * Applied at the client so no route can forget it. Thirty seconds is well
 * beyond a normal completion on this provider (measured 2–8s) and short
 * enough that a stalled request fails while the user is still watching,
 * rather than occupying a connection until something else times out.
 */
export const AI_TIMEOUT_MS = 30_000;

/**
 * Retries on a failed call.
 *
 * The SDK defaults to 2, which turns one stalled request into 90 seconds of
 * wall clock and three times the token spend. One retry covers a transient
 * network blip; beyond that the deterministic fallback is the better answer
 * and is already wired.
 */
export const AI_MAX_RETRIES = 1;
