import { NextResponse } from 'next/server';

/**
 * Honest envelopes for AI route responses.
 *
 * WHY THIS EXISTS
 *
 * Every structured AI route wrapped its handler in a catch-all that returned a
 * hard-coded `DEFAULT_FALLBACK_*` object on any failure — missing API key,
 * network error, unparseable completion. Those constants contain specific
 * financial figures, named board members and explicit verdicts, and they were
 * returned with a 200 and no marker of any kind. The client could not tell a
 * generated board recommendation from a canned one, so a committee could read
 * "APPROVE WITH GATES, 2 approve / 2 conditional" off a screen and act on it
 * when nothing had been evaluated at all.
 *
 * `/api/ai/explain` already got this right — it emits `isFallback` on its
 * final SSE event — and `live-macro` was fixed by removing generation
 * entirely. This module generalises that honesty to the remaining routes.
 *
 * The flag is deliberately on the body rather than only in a header: the
 * component that renders the figure reads the body, and a header is easy to
 * drop through a proxy, a cache or a client refactor. The header is a
 * convenience for logs and smoke tests, not the contract.
 */

export type FallbackReason =
  /** No usable OPENAI_API_KEY configured. */
  | 'provider-unconfigured'
  /** Provider answered, but with no usable content. */
  | 'provider-empty'
  /** Provider call threw — network, auth, rate limit, timeout. */
  | 'provider-error'
  /** Provider answered with content that was not valid JSON. */
  | 'parse-failed';

export const FALLBACK_NOTICE =
  'Illustrative pre-set values — the model provider was unavailable, so nothing here was ' +
  'generated for your inputs. Do not present as analysis.';

/** A genuine model-generated payload. */
export function aiGenerated<T extends object>(data: T): NextResponse {
  return NextResponse.json(
    { ...data, isFallback: false },
    { headers: { 'Cache-Control': 'no-store', 'X-CapExIQ-Fallback': 'false' } }
  );
}

/**
 * Canned data standing in for a generation that did not happen.
 *
 * Still a 200: the caller asked for a page's worth of content and gets
 * something renderable, which is the behaviour the fallbacks were written for.
 * What changes is that the response now says so, in the body, where the
 * renderer can act on it.
 */
export function aiFallback<T extends object>(data: T, reason: FallbackReason): NextResponse {
  return NextResponse.json(
    { ...data, isFallback: true, fallbackReason: reason, fallbackNotice: FALLBACK_NOTICE },
    { headers: { 'Cache-Control': 'no-store', 'X-CapExIQ-Fallback': reason } }
  );
}

/** Fields every AI response carries so a client can tell the two apart. */
export interface AiResponseMeta {
  isFallback?: boolean;
  fallbackReason?: FallbackReason;
  fallbackNotice?: string;
}
