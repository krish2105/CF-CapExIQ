import { createConnection, type Socket } from 'node:net';
import { connect as createTlsConnection } from 'node:tls';
import type { RateLimitBackend, RateLimitHit } from './aiGuardrails';

/**
 * Shared rate-limit counters, for multi-instance deployments.
 *
 * WHY THIS EXISTS
 *
 * The in-memory backend keeps counters per process. Behind two app servers, or
 * on anything that autoscales or cold-starts, the effective allowance becomes
 * (instances x window) and a restart clears it entirely — so the number in the
 * config stops describing what the system actually permits. That is fine while
 * this runs on one box and stops being fine the moment it does not.
 *
 * WHY A LUA SCRIPT RATHER THAN INCR + PEXPIRE
 *
 * The obvious implementation is `INCR`, then `PEXPIRE` when the counter comes
 * back as 1, then `PTTL` to find the reset time. That is three round trips and
 * it has a real failure mode: if the connection drops between INCR and
 * PEXPIRE, the key is left with no expiry. The counter then never resets and
 * that user is rate-limited permanently — a self-inflicted denial of service
 * that only clears when someone notices and deletes the key by hand.
 *
 * EVAL runs the whole thing atomically in one round trip, so the counter and
 * its expiry are set together or not at all.
 *
 * WHY NO CLIENT LIBRARY
 *
 * `ioredis` and `node-redis` are both substantial dependencies carrying
 * cluster support, pub/sub, sentinel discovery and connection pooling. This
 * needs one command. RESP is a simple line protocol and the client below is
 * about a hundred lines — smaller than the dependency's type definitions, and
 * with no ambient reconnection behaviour to reason about during an incident.
 */

const CONNECT_TIMEOUT_MS = 2_000;
const COMMAND_TIMEOUT_MS = 1_000;

/**
 * Atomic fixed-window counter.
 *
 * Returns the post-increment count and the millisecond TTL, so the caller can
 * derive the reset time without a second query. `PEXPIRE` is applied only on
 * the first hit of a window; re-applying it on every request would slide the
 * window forward and let a steady stream of traffic never reset.
 */
const WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {count, redis.call('PTTL', KEYS[1])}
`.trim();

interface RedisTarget {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls: boolean;
  db?: string;
}

export function parseRedisUrl(raw: string): RedisTarget {
  const url = new URL(raw);
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error(`Unsupported Redis scheme "${url.protocol}". Use redis:// or rediss://.`);
  }

  const db = url.pathname.replace(/^\//, '');
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:',
    db: db || undefined,
  };
}

/** Encode a command as a RESP array of bulk strings. */
export function encodeCommand(args: Array<string | number>): string {
  const parts = args.map((a) => {
    const s = String(a);
    return `$${Buffer.byteLength(s)}\r\n${s}\r\n`;
  });
  return `*${args.length}\r\n${parts.join('')}`;
}

export type RespValue = string | number | null | RespValue[];

/**
 * Minimal RESP reader.
 *
 * Returns `null` for an incomplete buffer so the caller can wait for more
 * bytes — a reply can arrive split across TCP segments, and a parser that
 * assumes one packet per reply works locally and fails under load.
 */
export function decodeReply(buffer: string): { value: RespValue; rest: string } | null {
  if (!buffer) return null;
  const lineEnd = buffer.indexOf('\r\n');
  if (lineEnd === -1) return null;

  const type = buffer[0];
  const head = buffer.slice(1, lineEnd);
  const after = buffer.slice(lineEnd + 2);

  if (type === '+') return { value: head, rest: after };
  if (type === ':') return { value: Number(head), rest: after };
  if (type === '-') throw new Error(`Redis error: ${head}`);

  if (type === '$') {
    const length = Number(head);
    if (length === -1) return { value: null, rest: after };
    if (after.length < length + 2) return null;
    return { value: after.slice(0, length), rest: after.slice(length + 2) };
  }

  if (type === '*') {
    const count = Number(head);
    if (count === -1) return { value: null, rest: after };
    const items: RespValue[] = [];
    let rest = after;
    for (let i = 0; i < count; i++) {
      const next = decodeReply(rest);
      if (!next) return null;
      items.push(next.value);
      rest = next.rest;
    }
    return { value: items, rest };
  }

  throw new Error(`Unrecognised RESP type "${type}"`);
}

/**
 * One command, one connection.
 *
 * Deliberately not pooled. A rate-limit check happens once per request against
 * an endpoint already bounded to 20/minute, so the connection cost is
 * irrelevant next to the model call it protects — and a pool introduces
 * lifecycle bugs (stale sockets, reconnect storms) that are worth far more
 * attention than they would save here. If this ever guards something
 * high-throughput, pool it then and measure first.
 */
async function sendCommands(
  target: RedisTarget,
  commands: Array<Array<string | number>>
): Promise<RespValue[]> {
  return new Promise((resolve, reject) => {
    const socket: Socket = target.tls
      ? (createTlsConnection({ host: target.host, port: target.port, servername: target.host }) as unknown as Socket)
      : createConnection({ host: target.host, port: target.port });

    let buffer = '';
    const replies: RespValue[] = [];
    let settled = false;

    const finish = (err: Error | null, value?: RespValue[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(commandTimer);
      socket.destroy();
      err ? reject(err) : resolve(value ?? []);
    };

    const connectTimer = setTimeout(
      () => finish(new Error(`Redis connect timed out after ${CONNECT_TIMEOUT_MS}ms`)),
      CONNECT_TIMEOUT_MS
    );
    const commandTimer = setTimeout(
      () => finish(new Error(`Redis command timed out after ${COMMAND_TIMEOUT_MS}ms`)),
      CONNECT_TIMEOUT_MS + COMMAND_TIMEOUT_MS
    );

    socket.on('error', (err) => finish(err));
    socket.on('close', () => finish(new Error('Redis connection closed before replying')));

    socket.on('connect', () => {
      clearTimeout(connectTimer);
      socket.write(commands.map(encodeCommand).join(''));
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      try {
        for (;;) {
          const next = decodeReply(buffer);
          if (!next) break;
          replies.push(next.value);
          buffer = next.rest;
          if (replies.length === commands.length) {
            finish(null, replies);
            return;
          }
        }
      } catch (err) {
        finish(err as Error);
      }
    });
  });
}

/**
 * Build a shared backend from a connection URL.
 *
 * Throws on a malformed URL at construction rather than on the first request,
 * so a typo in configuration surfaces at boot instead of silently degrading
 * every rate-limit check into the fail-open path.
 */
export function createRedisRateLimitBackend(url: string, keyPrefix = 'capexiq:rl:'): RateLimitBackend {
  const target = parseRedisUrl(url);

  return {
    async hit(key, windowMs, _max, now): Promise<RateLimitHit> {
      const commands: Array<Array<string | number>> = [];

      // AUTH and SELECT ride along on the same connection, so a configured
      // password or database is applied before the counter is touched.
      if (target.password) {
        commands.push(
          target.username
            ? ['AUTH', target.username, target.password]
            : ['AUTH', target.password]
        );
      }
      if (target.db) commands.push(['SELECT', target.db]);

      commands.push(['EVAL', WINDOW_SCRIPT, 1, `${keyPrefix}${key}`, windowMs]);

      const replies = await sendCommands(target, commands);
      const result = replies[replies.length - 1];

      if (!Array.isArray(result) || typeof result[0] !== 'number') {
        throw new Error('Unexpected reply from Redis rate-limit script');
      }

      const count = result[0];
      const ttl = typeof result[1] === 'number' ? result[1] : windowMs;

      return {
        count,
        // A negative TTL means the key exists without an expiry, which the
        // script should make impossible — treated as a fresh window rather
        // than trusted, so a surprising reply cannot lock a user out forever.
        resetAt: now + (ttl >= 0 ? ttl : windowMs),
      };
    },
  };
}

/**
 * Install the shared backend when one is configured.
 *
 * Returns what it did, so the caller can log which backend is live. A
 * deployment quietly running per-process counters when the operator believes
 * they are shared is the failure this reports on.
 */
export function configureRateLimitBackendFromEnv(
  set: (backend: RateLimitBackend | null) => void
): { backend: 'memory' | 'redis'; reason: string } {
  const url = process.env.CAPEXIQ_REDIS_URL?.trim();

  if (!url) {
    return {
      backend: 'memory',
      reason: 'CAPEXIQ_REDIS_URL is not set — counters are per-process and reset on restart.',
    };
  }

  try {
    set(createRedisRateLimitBackend(url));
    return { backend: 'redis', reason: `Shared counters via ${parseRedisUrl(url).host}.` };
  } catch (err) {
    // Fall back rather than refuse to boot: an unreachable limiter should not
    // take the application down, but it must be loud about degrading.
    console.error('[rate-limit] Redis backend unavailable, using per-process counters:', (err as Error).message);
    return { backend: 'memory', reason: (err as Error).message };
  }
}
