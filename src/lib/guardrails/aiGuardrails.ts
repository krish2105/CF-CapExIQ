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
 * Fixed-window rate limit, per process.
 *
 * The default backend is per-process memory. On a single long-lived server
 * that is correct, and it bounds accidental cost — a held-down Enter key, a
 * runaway retry loop — rather than a distributed attacker.
 *
 * DEPLOYMENT BOUNDARY — READ BEFORE SHIPPING
 * On serverless or multi-instance hosting the in-memory backend does not limit
 * anything meaningful: every instance keeps its own counters and a cold start
 * resets them, so the effective limit is (instances x window) rather than the
 * number configured here. Install a shared backend with `setRateLimitBackend`
 * before running this anywhere that autoscales. The interface is a single
 * method precisely so a Redis or Upstash adapter is a few lines:
 *
 *   setRateLimitBackend({
 *     hit: async (key, windowMs, max) => {
 *       const count = await redis.incr(key);
 *       if (count === 1) await redis.pexpire(key, windowMs);
 *       const ttl = await redis.pttl(key);
 *       return { count, resetAt: Date.now() + ttl };
 *     },
 *   });
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Count for a key within its current window, and when that window ends. */
export interface RateLimitHit {
  count: number;
  resetAt: number;
}

export interface RateLimitBackend {
  /**
   * Record a request against `key` and return the resulting window state.
   *
   * `now` is supplied by the caller rather than read from the clock inside the
   * backend, so a virtual clock can be injected in tests to assert that a
   * window actually expires. A backend that calls `Date.now()` itself silently
   * ignores that and makes window-expiry untestable.
   */
  hit(
    key: string,
    windowMs: number,
    max: number,
    now: number
  ): RateLimitHit | Promise<RateLimitHit>;
}

/** Per-process backend. Correct on one instance, ineffective across many. */
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
    return bucket;
  },
};

let backend: RateLimitBackend = memoryBackend;

/** Install a shared backend. Call once at startup in any multi-instance deploy. */
export function setRateLimitBackend(next: RateLimitBackend) {
  backend = next;
}

/** Whether a shared backend is installed — surfaced so a health check can say. */
export function isRateLimitDistributed(): boolean {
  return backend !== memoryBackend;
}

function decide(hit: RateLimitHit, max: number, now: number): RateLimitResult {
  if (hit.count > max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, remaining: Math.max(0, max - hit.count), retryAfterSeconds: 0 };
}

/**
 * Synchronous check against the in-memory backend.
 *
 * Retained because the existing call sites are synchronous. It ignores an
 * installed async backend by design rather than silently awaiting nothing —
 * use `checkRateLimitAsync` once a shared backend is configured.
 */
export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const hit = memoryBackend.hit(key, WINDOW_MS, MAX_REQUESTS_PER_WINDOW, now) as RateLimitHit;
  return decide(hit, MAX_REQUESTS_PER_WINDOW, now);
}

/** Backend-aware check. Prefer this in any deployment that autoscales. */
export async function checkRateLimitAsync(
  key: string,
  now = Date.now()
): Promise<RateLimitResult> {
  const hit = await backend.hit(key, WINDOW_MS, MAX_REQUESTS_PER_WINDOW, now);
  return decide(hit, MAX_REQUESTS_PER_WINDOW, now);
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


/** Largest request body forwarded to a model provider, serialised. */
export const MAX_BODY_BYTES = 16_384;

export interface BodyGuardResult {
  ok: boolean;
  code?: 'not-object' | 'too-large' | 'injection';
  message?: string;
}

/**
 * Structural guard for route bodies that are passed through to a provider.
 *
 * Several routes accept a loosely-shaped object and interpolate its fields
 * straight into a prompt. Without a schema per route — which would couple each
 * handler to its caller's exact payload — the two exposures that matter are
 * still addressable generically: an unbounded body (cost) and hostile text in
 * any string field (injection). This walks the object once and applies the
 * same screening `guardInput` performs on a single question.
 *
 * It is a floor, not a substitute for a schema. A route with a known shape
 * should still validate it; this exists so that the routes which do not cannot
 * be the weakest link.
 */
export function guardRequestBody(raw: unknown): BodyGuardResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'not-object', message: 'Request body must be a JSON object.' };
  }

  let serialised: string;
  try {
    serialised = JSON.stringify(raw);
  } catch {
    return { ok: false, code: 'not-object', message: 'Request body is not serialisable.' };
  }

  if (serialised.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      code: 'too-large',
      message: `Request body exceeds the ${MAX_BODY_BYTES}-byte limit.`,
    };
  }

  // Walk every string the body carries, at any depth, and screen the short ones.
  //
  // SCOPE, AND WHY IT IS NARROW
  // Injection screening is applied only to strings under SCREEN_MAX_CHARS. An
  // override attempt is short and imperative; a long field is document content
  // the user pasted, and screening it produces false refusals on legitimate
  // input — a vendor quotation containing the line "System: AutoStore B-1450"
  // matches the role-prefix pattern, and one containing a supplier URL matches
  // the scraping pattern. Refusing a real quotation to block a hypothetical
  // injection is the wrong trade when the size cap already bounds the cost and
  // the system prompt already delimits untrusted text.
  //
  // Scraping patterns are deliberately not applied here at all: they match any
  // bare URL, which appears legitimately in pasted source material. The
  // dedicated `guardInput` still applies them to free-text questions, which is
  // where "go and fetch this" actually arrives.
  const SCREEN_MAX_CHARS = 500;
  const stack: unknown[] = [raw];
  let visited = 0;
  while (stack.length) {
    const node = stack.pop();
    if (++visited > 2000) break; // pathological nesting; the size cap bounds real payloads

    if (typeof node === 'string') {
      if (node.length > SCREEN_MAX_CHARS) continue;
      for (const { re, label } of INJECTION_PATTERNS) {
        if (re.test(node)) {
          return { ok: false, code: 'injection', message: `Blocked: ${label}.` };
        }
      }
    } else if (node && typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) stack.push(value);
    }
  }

  return { ok: true };
}
