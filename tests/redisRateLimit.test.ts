import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createServer, type Server } from 'node:net';
import {
  parseRedisUrl,
  encodeCommand,
  decodeReply,
  createRedisRateLimitBackend,
  configureRateLimitBackendFromEnv,
} from '@/lib/guardrails/redisRateLimit';

describe('connection URLs', () => {
  it('parses host, port, credentials and database', () => {
    const t = parseRedisUrl('redis://user:secret@cache.internal:6380/3');
    expect(t).toMatchObject({
      host: 'cache.internal',
      port: 6380,
      username: 'user',
      password: 'secret',
      db: '3',
      tls: false,
    });
  });

  it('defaults to port 6379', () => {
    expect(parseRedisUrl('redis://cache.internal').port).toBe(6379);
  });

  it('marks rediss:// as TLS', () => {
    expect(parseRedisUrl('rediss://cache.internal').tls).toBe(true);
  });

  it('rejects an unsupported scheme rather than trying it', () => {
    expect(() => parseRedisUrl('http://cache.internal')).toThrow(/Unsupported Redis scheme/);
  });
});

describe('RESP encoding', () => {
  it('encodes a command as an array of bulk strings', () => {
    expect(encodeCommand(['GET', 'key'])).toBe('*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n');
  });

  it('measures byte length, not character length', () => {
    // A multi-byte key would otherwise declare a short length and desync the
    // stream for every subsequent reply on that connection.
    const encoded = encodeCommand(['GET', 'ké']);
    expect(encoded).toContain('$3\r\nké\r\n');
  });

  it('coerces numeric arguments', () => {
    expect(encodeCommand(['PEXPIRE', 'k', 60000])).toContain('$5\r\n60000\r\n');
  });
});

describe('RESP decoding', () => {
  it('reads simple strings, integers and bulk strings', () => {
    expect(decodeReply('+OK\r\n')?.value).toBe('OK');
    expect(decodeReply(':42\r\n')?.value).toBe(42);
    expect(decodeReply('$5\r\nhello\r\n')?.value).toBe('hello');
  });

  it('reads a nested array, which is what EVAL returns', () => {
    expect(decodeReply('*2\r\n:3\r\n:59000\r\n')?.value).toEqual([3, 59000]);
  });

  it('reads null bulk and null array', () => {
    expect(decodeReply('$-1\r\n')?.value).toBeNull();
    expect(decodeReply('*-1\r\n')?.value).toBeNull();
  });

  it('surfaces an error reply as a thrown error', () => {
    expect(() => decodeReply('-NOAUTH Authentication required.\r\n')).toThrow(/NOAUTH/);
  });

  it('returns null for a partial buffer rather than guessing', () => {
    // A reply can arrive split across TCP segments. A parser that assumes one
    // packet per reply works locally and corrupts under load.
    expect(decodeReply('$5\r\nhel')).toBeNull();
    expect(decodeReply('*2\r\n:3\r\n')).toBeNull();
    expect(decodeReply('')).toBeNull();
  });

  it('leaves trailing bytes for the next reply', () => {
    const first = decodeReply(':1\r\n:2\r\n');
    expect(first?.value).toBe(1);
    expect(decodeReply(first!.rest)?.value).toBe(2);
  });
});

/**
 * A mock Redis speaking real RESP over a real socket.
 *
 * The point is to exercise the client's protocol handling — framing, reply
 * ordering, multi-command connections — rather than stub the layer where the
 * bugs actually live.
 */
class MockRedis {
  server: Server;
  port = 0;
  received: string[][] = [];
  counters = new Map<string, number>();
  failWith: string | null = null;
  splitReplies = false;

  constructor() {
    this.server = createServer((socket) => {
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');

        // Parse as many complete commands as arrived.
        for (;;) {
          const parsed = this.readCommand(buffer);
          if (!parsed) break;
          buffer = parsed.rest;
          this.received.push(parsed.args);

          const reply = this.replyFor(parsed.args);
          if (this.splitReplies && reply.length > 4) {
            // Deliberately fragmented, to prove the client reassembles.
            socket.write(reply.slice(0, 3));
            setTimeout(() => socket.write(reply.slice(3)), 5);
          } else {
            socket.write(reply);
          }
        }
      });
    });
  }

  private readCommand(buffer: string): { args: string[]; rest: string } | null {
    if (!buffer.startsWith('*')) return null;
    const headEnd = buffer.indexOf('\r\n');
    if (headEnd === -1) return null;
    const count = Number(buffer.slice(1, headEnd));
    let rest = buffer.slice(headEnd + 2);
    const args: string[] = [];

    for (let i = 0; i < count; i++) {
      if (!rest.startsWith('$')) return null;
      const lenEnd = rest.indexOf('\r\n');
      if (lenEnd === -1) return null;
      const len = Number(rest.slice(1, lenEnd));
      const body = rest.slice(lenEnd + 2);
      if (Buffer.byteLength(body) < len + 2) return null;
      args.push(body.slice(0, len));
      rest = body.slice(len + 2);
    }
    return { args, rest };
  }

  private replyFor(args: string[]): string {
    const cmd = args[0]?.toUpperCase();
    if (this.failWith) return `-${this.failWith}\r\n`;
    if (cmd === 'AUTH' || cmd === 'SELECT') return '+OK\r\n';

    if (cmd === 'EVAL') {
      const key = args[3];
      const windowMs = Number(args[4]);
      const next = (this.counters.get(key) ?? 0) + 1;
      this.counters.set(key, next);
      return `*2\r\n:${next}\r\n:${windowMs}\r\n`;
    }

    return '+OK\r\n';
  }

  async start() {
    await new Promise<void>((r) => this.server.listen(0, '127.0.0.1', r));
    this.port = (this.server.address() as { port: number }).port;
    return `redis://127.0.0.1:${this.port}`;
  }

  stop() {
    this.server.close();
  }
}

describe('against a mock Redis', () => {
  let redis: MockRedis;
  let url: string;

  beforeEach(async () => {
    redis = new MockRedis();
    url = await redis.start();
  });

  afterEach(() => redis.stop());

  it('counts hits through an atomic EVAL', async () => {
    const backend = createRedisRateLimitBackend(url);
    const now = 1_000_000;

    expect(await backend.hit('user-a', 60_000, 20, now)).toMatchObject({ count: 1 });
    expect(await backend.hit('user-a', 60_000, 20, now)).toMatchObject({ count: 2 });

    // One EVAL per hit — not INCR then PEXPIRE then PTTL, which can leave a
    // key with no expiry if the connection drops in between and locks the
    // user out permanently.
    const evals = redis.received.filter((c) => c[0].toUpperCase() === 'EVAL');
    expect(evals).toHaveLength(2);
    expect(evals[0][1]).toContain('PEXPIRE');
  });

  it('namespaces keys so it can share a Redis with other applications', async () => {
    await createRedisRateLimitBackend(url).hit('user-a', 60_000, 20, Date.now());
    expect(redis.received.find((c) => c[0].toUpperCase() === 'EVAL')?.[3]).toBe('capexiq:rl:user-a');
  });

  it('separates callers', async () => {
    const backend = createRedisRateLimitBackend(url);
    await backend.hit('user-a', 60_000, 20, Date.now());
    expect(await backend.hit('user-b', 60_000, 20, Date.now())).toMatchObject({ count: 1 });
  });

  it('derives resetAt from the TTL the script returns', async () => {
    const now = 5_000_000;
    const hit = await createRedisRateLimitBackend(url).hit('user-a', 45_000, 20, now);
    expect(hit.resetAt).toBe(now + 45_000);
  });

  it('authenticates before touching the counter', async () => {
    const authed = url.replace('redis://', 'redis://default:hunter2@');
    await createRedisRateLimitBackend(authed).hit('user-a', 60_000, 20, Date.now());

    const commands = redis.received.map((c) => c[0].toUpperCase());
    expect(commands[0]).toBe('AUTH');
    expect(commands.indexOf('AUTH')).toBeLessThan(commands.indexOf('EVAL'));
  });

  it('selects the configured database first', async () => {
    await createRedisRateLimitBackend(`${url}/7`).hit('user-a', 60_000, 20, Date.now());
    const select = redis.received.find((c) => c[0].toUpperCase() === 'SELECT');
    expect(select?.[1]).toBe('7');
  });

  it('reassembles a reply split across packets', async () => {
    redis.splitReplies = true;
    const hit = await createRedisRateLimitBackend(url).hit('user-a', 60_000, 20, Date.now());
    expect(hit.count).toBe(1);
  });

  it('propagates a Redis error rather than inventing a count', async () => {
    redis.failWith = 'NOAUTH Authentication required.';
    await expect(
      createRedisRateLimitBackend(url).hit('user-a', 60_000, 20, Date.now())
    ).rejects.toThrow(/NOAUTH/);
  });

  it('fails rather than hanging when nothing is listening', async () => {
    redis.stop();
    await expect(
      createRedisRateLimitBackend(url).hit('user-a', 60_000, 20, Date.now())
    ).rejects.toThrow();
  });
});

describe('environment configuration', () => {
  const saved = process.env.CAPEXIQ_REDIS_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.CAPEXIQ_REDIS_URL;
    else process.env.CAPEXIQ_REDIS_URL = saved;
  });

  it('reports memory when nothing is configured', () => {
    delete process.env.CAPEXIQ_REDIS_URL;
    const result = configureRateLimitBackendFromEnv(() => {});
    expect(result.backend).toBe('memory');
    expect(result.reason).toMatch(/per-process/);
  });

  it('installs the shared backend when a URL is present', () => {
    process.env.CAPEXIQ_REDIS_URL = 'redis://cache.internal:6379';
    let installed = false;
    const result = configureRateLimitBackendFromEnv(() => {
      installed = true;
    });
    expect(result.backend).toBe('redis');
    expect(installed).toBe(true);
  });

  it('falls back loudly on a malformed URL rather than refusing to boot', () => {
    process.env.CAPEXIQ_REDIS_URL = 'http://not-redis';
    const result = configureRateLimitBackendFromEnv(() => {});
    expect(result.backend).toBe('memory');
    expect(result.reason).toMatch(/Unsupported Redis scheme/);
  });
});
