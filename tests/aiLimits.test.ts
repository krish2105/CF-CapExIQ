import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  AI_MAX_TOKENS,
  AI_MAX_TOKENS_LONG,
  AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
} from '@/lib/ai/limits';

const AI_DIR = path.resolve(__dirname, '../src/app/api/ai');

const routes = readdirSync(AI_DIR)
  .filter((e) => statSync(path.join(AI_DIR, e)).isDirectory())
  .map((e) => ({ name: e, file: path.join(AI_DIR, e, 'route.ts') }))
  .map((r) => ({ ...r, source: readFileSync(r.file, 'utf8') }))
  // `live-macro` serves a static constant and calls no model.
  .filter((r) => r.source.includes('chat.completions.create'));

describe('ceilings are sane', () => {
  it('bounds a single call well below a provider default', () => {
    expect(AI_MAX_TOKENS).toBeGreaterThan(200);
    expect(AI_MAX_TOKENS).toBeLessThanOrEqual(1000);
  });

  it('raises the long ceiling without removing it', () => {
    // A limit that is generous everywhere bounds nothing in practice.
    expect(AI_MAX_TOKENS_LONG).toBeGreaterThan(AI_MAX_TOKENS);
    expect(AI_MAX_TOKENS_LONG).toBeLessThanOrEqual(4000);
  });

  it('times out inside a request lifetime', () => {
    expect(AI_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    expect(AI_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });

  it('retries at most once', () => {
    // The SDK default of 2 turns one stalled request into 90s of wall clock
    // and triple the token spend.
    expect(AI_MAX_RETRIES).toBeLessThanOrEqual(1);
  });
});

describe('every model call is bounded', () => {
  it('finds the AI routes', () => {
    expect(routes.length).toBeGreaterThanOrEqual(10);
  });

  it.each(routes)('$name caps max_tokens', ({ source }) => {
    // Unbounded generation is the per-request half of AI spend. Rate limiting
    // bounds how often a user calls; this bounds what one call can cost.
    expect(source).toMatch(/max_tokens:\s*AI_MAX_TOKENS(_LONG)?/);
  });

  it.each(routes)('$name imports the shared ceiling rather than a literal', ({ source }) => {
    expect(source).toMatch(/from '@\/lib\/ai\/limits'/);
    // A hand-written number drifts; the whole point is one place to change.
    expect(source).not.toMatch(/max_tokens:\s*\d+/);
  });

  it.each(routes)('$name builds its client through the guarded factory', ({ source }) => {
    // The factory is what applies the timeout and retry ceiling, so a route
    // constructing its own client would silently opt out of both.
    expect(source).toMatch(/createModelClient\(/);
  });
});

describe('client-level ceilings', () => {
  const client = readFileSync(path.resolve(__dirname, '../src/lib/ai/client.ts'), 'utf8');

  it('sets a timeout, which the SDK does not do by default', () => {
    // Without it, a provider that stalls mid-response holds a server
    // connection open indefinitely.
    expect(client).toMatch(/timeout:\s*AI_TIMEOUT_MS/);
  });

  it('caps retries', () => {
    expect(client).toMatch(/maxRetries:\s*AI_MAX_RETRIES/);
  });
});

describe('the streaming route bounds the stream, not just the handshake', () => {
  const explain = readFileSync(path.join(AI_DIR, 'explain/route.ts'), 'utf8');

  it('applies a deadline across the whole generation', () => {
    // The client timeout covers time-to-first-token. A generation that stalls
    // half way through would otherwise hold the connection open until
    // something further up the stack gave up.
    expect(explain).toMatch(/const deadline = Date\.now\(\) \+ AI_TIMEOUT_MS/);
    expect(explain).toMatch(/Date\.now\(\) > deadline/);
  });
});
