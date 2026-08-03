/**
 * Input and output guardrails for the AI surfaces.
 *
 * The route handlers previously accepted an unbounded string from an
 * unauthenticated POST and forwarded it to a billed provider. That is three
 * separate exposures — cost, prompt injection, and personal data leaving the
 * jurisdiction — so they are handled here in one place rather than per route.
 */

/** Longest user text forwarded to the provider. */
export const MAX_INPUT_CHARS = 1000;

export interface GuardResult {
  ok: boolean;
  /** Sanitised text, safe to forward. Empty when `ok` is false. */
  text: string;
  /** Machine-readable reason, for logging and for the refusal message. */
  code?: 'empty' | 'too-long' | 'injection' | 'scraping-request' | 'pii';
  message?: string;
  /** Non-fatal notes — e.g. redactions that were applied. */
  notices: string[];
}

/**
 * Instruction-override patterns.
 *
 * Deliberately narrow: broad matching on words like "ignore" or "system"
 * rejects legitimate finance questions ("ignore the salvage value for a
 * moment", "what does the system assume?"). These target the imperative
 * shape of an override attempt, not its vocabulary.
 */
const INJECTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /ignore\s+(all\s+|any\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, label: 'instruction override' },
  { re: /disregard\s+(all\s+|any\s+)?(previous|prior|above|the)\s+(instructions?|rules?|context)/i, label: 'instruction override' },
  { re: /(reveal|print|show|repeat|output)\s+(me\s+)?(your|the)\s+(system\s+prompt|instructions|prompt)/i, label: 'system prompt extraction' },
  { re: /you\s+are\s+now\s+(a|an|no longer)/i, label: 'persona override' },
  { re: /\b(DAN|jailbreak|developer\s+mode)\b/i, label: 'jailbreak' },
  { re: /<\s*\/?\s*(system|assistant)\s*>/i, label: 'role-tag injection' },
  { re: /^\s*(system|assistant)\s*:/im, label: 'role-prefix injection' },
];

/**
 * Requests to go and collect third-party web content.
 *
 * Refused rather than silently ignored: the user should learn that the
 * capability is absent by policy, not assume the model tried and failed.
 * See src/lib/guardrails/egress.ts for the legal basis.
 */
const SCRAPING_PATTERNS: RegExp[] = [
  /\b(scrape|scraping|crawl|crawler|spider)\b/i,
  /\b(fetch|pull|download|get)\b[^.?!]{0,40}\b(from\s+)?(the\s+)?(web|internet|website|site|url)\b/i,
  /\bbrowse\s+(to|the\s+web|the\s+internet)\b/i,
  /https?:\/\/(?!localhost)/i,
];

/** Conservative PII detectors — redact rather than refuse. */
const PII_PATTERNS: Array<{ re: RegExp; label: string; replacement: string }> = [
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, label: 'email address', replacement: '[redacted-email]' },
  // No leading \b: a word boundary cannot match between a space and a '+',
  // so "call +971 50 123 4567" slipped through. A negative lookbehind for a
  // digit is what actually prevents matching mid-number.
  { re: /(?<!\d)(?:\+971|00971|0)\s?5\d(?:[\s-]?\d){7}(?!\d)/g, label: 'UAE mobile number', replacement: '[redacted-phone]' },
  { re: /\b784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d\b/g, label: 'Emirates ID', replacement: '[redacted-emirates-id]' },
  { re: /\bAE\d{2}[\s-]?(?:\d{4}[\s-]?){4}\d{3}\b/gi, label: 'IBAN', replacement: '[redacted-iban]' },
  { re: /\b(?:\d[ -]?){13,19}\b(?=\s|$)/g, label: 'possible card number', replacement: '[redacted-card]' },
];

export const SCRAPING_REFUSAL =
  'I can\'t retrieve content from external websites. This application performs no web scraping ' +
  'or crawling by design — automated collection from third-party sites can breach their terms of ' +
  'use and, in the UAE, engages Federal Decree-Law No. 34 of 2021 on Cybercrimes and the PDPL. ' +
  'If you need an external figure in the model, enter it in the Assumptions Register with a ' +
  'citation to the published source, which also keeps it auditable.';

export const INJECTION_REFUSAL =
  'That request looks like an attempt to override my operating instructions, so I won\'t act on ' +
  'it. I can answer questions about the NovaRetail GCC capital model, its assumptions, its ' +
  'methodology and its limitations, grounded in the project documentation.';

/** Validate and sanitise a user question before it reaches the provider. */
export function guardInput(raw: unknown): GuardResult {
  const notices: string[] = [];

  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, text: '', code: 'empty', message: 'Question was empty.', notices };
  }

  let text = raw.trim();

  if (text.length > MAX_INPUT_CHARS) {
    return {
      ok: false,
      text: '',
      code: 'too-long',
      message: `Question exceeds the ${MAX_INPUT_CHARS}-character limit. Please shorten it.`,
      notices,
    };
  }

  for (const { re, label } of INJECTION_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, text: '', code: 'injection', message: `${INJECTION_REFUSAL} (${label})`, notices };
    }
  }

  for (const re of SCRAPING_PATTERNS) {
    if (re.test(text)) {
      return { ok: false, text: '', code: 'scraping-request', message: SCRAPING_REFUSAL, notices };
    }
  }

  // PII is redacted, not refused: a user pasting a supplier's contact details
  // into a costing question has made a mistake, not an attack, and the
  // question is still answerable without the personal data.
  for (const { re, label, replacement } of PII_PATTERNS) {
    if (re.test(text)) {
      text = text.replace(re, replacement);
      notices.push(`Redacted ${label} before sending to the model provider.`);
    }
  }

  return { ok: true, text, notices };
}

/**
 * Neutralise instruction-like content inside retrieved passages.
 *
 * Retrieved text is data, not instruction. The corpus is first-party today,
 * but a CSV upload or a future document drop could carry an injected line, and
 * a retriever that faithfully surfaces it would hand the model an instruction
 * with the authority of a citation.
 */
export function sanitizeContext(text: string): string {
  return text
    .replace(/^\s*(system|assistant|user)\s*:/gim, '$1 —')
    .replace(/<\s*\/?\s*(system|assistant|user)\s*>/gi, '')
    .replace(
      /ignore\s+(all\s+|any\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/gi,
      '[instruction-like text removed]'
    );
}

/**
 * Longest uploaded document forwarded to the provider.
 *
 * Far above MAX_INPUT_CHARS because a vendor quotation legitimately runs to
 * several thousand characters, and far below "whatever the client sent"
 * because `VendorQuoteUploader` reads an arbitrary file with `file.text()`
 * and posts the whole thing. 20k characters is roughly 5k tokens — enough for
 * any real quote, bounded enough that a 40 MB PDF cannot bill a fortune.
 */
export const MAX_DOCUMENT_CHARS = 20_000;

/** Longest JSON context block (assumptions/metrics) forwarded per request. */
export const MAX_CONTEXT_JSON_CHARS = 8_000;

/**
 * Prepare an uploaded document for a prompt.
 *
 * Documents are neutralised rather than refused. A vendor quote is data the
 * user chose to submit, and rejecting the whole upload because one line
 * happened to match an injection pattern turns a false positive into a broken
 * feature. `sanitizeContext` already defangs the role-tag and
 * instruction-override shapes, so the residual risk is worth the usability.
 *
 * The truncation is reported in `notices` rather than applied silently — a
 * user whose quote was cut in half must be able to see that the extracted
 * total is incomplete, otherwise a truncated document produces a confident
 * wrong CapEx figure.
 */
export function guardDocument(raw: unknown): GuardResult {
  const notices: string[] = [];

  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, text: '', code: 'empty', message: 'Document text was empty.', notices };
  }

  let text = raw.trim();

  if (text.length > MAX_DOCUMENT_CHARS) {
    text = text.slice(0, MAX_DOCUMENT_CHARS);
    notices.push(
      `Document truncated to the first ${MAX_DOCUMENT_CHARS.toLocaleString()} characters. ` +
        `Figures beyond that point were not read.`
    );
  }

  for (const { re, label, replacement } of PII_PATTERNS) {
    if (re.test(text)) {
      text = text.replace(re, replacement);
      notices.push(`Redacted ${label} before sending to the model provider.`);
    }
  }

  const before = text;
  text = sanitizeContext(text);
  if (text !== before) notices.push('Neutralised instruction-like text inside the document.');

  return { ok: true, text, notices };
}

/**
 * Serialise a client-supplied object for inclusion in a prompt.
 *
 * `assumptions` and `metrics` arrive as arbitrary JSON from the browser and
 * several handlers interpolated them with `JSON.stringify(...)` directly into
 * the user turn. A string field anywhere in that object was therefore a clean
 * prompt-injection channel that bypassed every check on the question itself —
 * the guarded field was never the one carrying the payload.
 */
export function safeContextJson(value: unknown, maxChars = MAX_CONTEXT_JSON_CHARS): string {
  let json: string;
  try {
    json = JSON.stringify(value ?? {});
  } catch {
    // Circular or otherwise unserialisable input is not worth diagnosing:
    // it cannot have come from the app's own store.
    return '{}';
  }
  if (typeof json !== 'string') return '{}';
  if (json.length > maxChars) json = `${json.slice(0, maxChars)}…[truncated]`;
  return sanitizeContext(json);
}

/**
 * Fixed-window rate limit, per process.
 *
 * Deliberately in-memory: this is a single-instance academic deployment, and
 * a Redis dependency would be more operational surface than the risk warrants.
 * It bounds accidental cost — a held-down Enter key, a runaway retry loop —
 * rather than a distributed attacker, and that limitation is the reason it is
 * documented here rather than presented as a security control.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitHit {
  count: number;
  resetAt: number;
}

/**
 * Pluggable counter.
 *
 * This interface is adopted from the parallel implementation on `main`
 * (`d40bbfe`, "make rate limiting pluggable"), which arrived at a better shape
 * than the version here did — one method, and `now` passed in by the caller
 * rather than read from the clock inside the backend, so a virtual clock can
 * assert that a window actually expires. A backend calling `Date.now()` itself
 * makes window-expiry untestable.
 *
 * Keeping their signature rather than inventing a competing one also means the
 * two lineages can be reconciled by deleting one file instead of rewriting
 * every call site.
 */
export interface RateLimitBackend {
  hit(key: string, windowMs: number, max: number, now: number): RateLimitHit | Promise<RateLimitHit>;
}

/**
 * Per-process backend. Correct on one instance, ineffective across many.
 *
 * DEPLOYMENT BOUNDARY. On serverless or multi-instance hosting this limits
 * nothing meaningful: each instance keeps its own counters and a cold start
 * resets them, so the effective allowance is (instances x window) rather than
 * the number configured here. Install the Redis backend before running
 * anywhere that autoscales — see `src/lib/guardrails/redisRateLimit.ts`.
 */
const memoryBackend: RateLimitBackend = {
  hit(key, windowMs, _max, now) {
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      const fresh = { count: 1, resetAt: now + windowMs };
      buckets.set(key, fresh);
      // Opportunistic sweep so abandoned keys cannot grow the map unbounded.
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
      }
      return fresh;
    }

    bucket.count += 1;
    return { count: bucket.count, resetAt: bucket.resetAt };
  },
};

let backend: RateLimitBackend = memoryBackend;

export function setRateLimitBackend(next: RateLimitBackend | null): void {
  backend = next ?? memoryBackend;
}

export function rateLimitBackendName(): string {
  return backend === memoryBackend ? 'memory' : 'shared';
}

/**
 * Record a request and decide whether it may proceed.
 *
 * Async because a shared backend is a network call. Every caller awaits it;
 * `tests/apiAuth.test.ts` fails if a route stops doing so, since a forgotten
 * await yields a truthy Promise and would reject every request as limited.
 */
export async function checkRateLimit(key: string, now = Date.now()): Promise<RateLimitResult> {
  let hit: RateLimitHit;

  try {
    hit = await backend.hit(key, WINDOW_MS, MAX_REQUESTS_PER_WINDOW, now);
  } catch (err) {
    // Fail OPEN, deliberately. A rate limiter exists to bound cost, not to
    // guard access — the authorisation check has already run by this point.
    // Refusing every request because Redis is unreachable converts a spend
    // control into an outage, which is the worse failure of the two.
    console.error('[rate-limit] backend unavailable, allowing request:', (err as Error).message);
    return { allowed: true, remaining: 0, retryAfterSeconds: 0 };
  }

  if (hit.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - hit.count),
    retryAfterSeconds: 0,
  };
}

/** Best-effort client key. Behind a proxy this is the forwarded address. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

/** Reset between tests. */
export function __resetRateLimits() {
  buckets.clear();
}
