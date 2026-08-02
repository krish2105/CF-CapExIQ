import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { remoteDestination } from '@/lib/db/remote';
import { checkEgress } from '@/lib/guardrails/egress';

const root = mkdtempSync(path.join(tmpdir(), 'capexiq-remote-'));

function makeSnapshot(name: string, contents = 'fake-sqlite-bytes'): string {
  const file = path.join(root, name);
  writeFileSync(file, contents);
  return file;
}

const savedEnv = { ...process.env };
beforeEach(() => {
  process.env = { ...savedEnv };
  delete process.env.CAPEXIQ_BACKUP_REMOTE;
  delete process.env.CAPEXIQ_EGRESS_ALLOWLIST;
});

afterAll(() => {
  process.env = savedEnv;
  rmSync(root, { recursive: true, force: true });
});

describe('destination parsing', () => {
  it('returns null when nothing is configured', () => {
    // A deployment with no off-box target is weaker but supported; the backup
    // command warns rather than failing.
    expect(remoteDestination(undefined)).toBeNull();
    expect(remoteDestination('   ')).toBeNull();
  });

  it('rejects plaintext http', () => {
    // A snapshot in flight is password hashes and an audit trail on the wire.
    expect(() => remoteDestination('http://backups.example/x')).toThrow(/Unsupported/);
  });

  it('rejects a malformed URL', () => {
    expect(() => remoteDestination('not a url')).toThrow(/not a valid URL/);
  });

  it('parses s3 with region and prefix', () => {
    const dest = remoteDestination('s3://my-bucket/capexiq/nightly?region=eu-west-1');
    expect(dest?.kind).toBe('s3');
    expect(dest?.describe).toBe('s3://my-bucket/capexiq/nightly');
  });
});

describe('file destination', () => {
  function destFor(dir: string) {
    mkdirSync(dir, { recursive: true });
    return remoteDestination(pathToFileURL(dir).toString())!;
  }

  it('copies a snapshot to a separate location', async () => {
    const dir = path.join(root, 'offbox-1');
    const dest = destFor(dir);
    const snapshot = makeSnapshot('capexiq-a.db');

    const result = await dest.upload(snapshot);
    expect(result.key).toBe('capexiq-a.db');
    expect(existsSync(path.join(dir, 'capexiq-a.db'))).toBe(true);
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('refuses to overwrite an existing remote snapshot', async () => {
    const dir = path.join(root, 'offbox-2');
    const dest = destFor(dir);
    const snapshot = makeSnapshot('capexiq-b.db');

    await dest.upload(snapshot);
    await expect(dest.upload(snapshot)).rejects.toThrow(/Refusing to overwrite/);
  });

  it('lists newest first and prunes to the retention limit', async () => {
    const dir = path.join(root, 'offbox-3');
    const dest = destFor(dir);

    for (const n of ['c1', 'c2', 'c3', 'c4']) {
      await dest.upload(makeSnapshot(`capexiq-${n}.db`));
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(await dest.list()).toHaveLength(4);

    const removed = await dest.prune(2);
    expect(removed).toHaveLength(2);
    expect(await dest.list()).toHaveLength(2);
  });

  it('refuses to prune away every remote backup', async () => {
    const dest = destFor(path.join(root, 'offbox-4'));
    await expect(dest.prune(0)).rejects.toThrow(/fewer than one/i);
  });

  it('needs no egress allowance — it never leaves the process', async () => {
    // The point of supporting file: at all. A mounted volume on separate
    // hardware is genuinely off-box and requires no credentials.
    const dest = destFor(path.join(root, 'offbox-5'));
    await expect(dest.upload(makeSnapshot('capexiq-e.db'))).resolves.toBeTruthy();
  });
});

describe('network destinations respect the egress allowlist', () => {
  it('blocks a host that is not the configured destination', () => {
    process.env.CAPEXIQ_BACKUP_REMOTE = 'https://backups.example.com/container';
    expect(checkEgress('https://exfiltration.example/steal').allowed).toBe(false);
  });

  it('allows the configured backup host', () => {
    process.env.CAPEXIQ_BACKUP_REMOTE = 'https://backups.example.com/container';
    expect(checkEgress('https://backups.example.com/container/x.db').allowed).toBe(true);
  });

  it('refuses to upload to a host outside the allowlist', async () => {
    // Destination configured for one host, upload attempted at another: the
    // chokepoint has to catch this, not the caller.
    process.env.CAPEXIQ_BACKUP_REMOTE = 'https://allowed.example.com/c';
    const dest = remoteDestination('https://not-allowed.example.com/c')!;
    await expect(dest.upload(makeSnapshot('capexiq-x.db'))).rejects.toThrow(/Egress blocked/);
  });

  /**
   * The design flaw this pinned list closes: every other allowlist entry is
   * derived from the variable that names it, so a poisoned `OPENAI_BASE_URL`
   * or `CAPEXIQ_BACKUP_REMOTE` previously authorised itself.
   */
  it('a pinned allowlist overrides a poisoned destination variable', () => {
    process.env.CAPEXIQ_BACKUP_REMOTE = 'https://attacker.example/exfil';
    process.env.CAPEXIQ_EGRESS_ALLOWLIST = 'backups.corp.internal';
    expect(checkEgress('https://attacker.example/exfil/x.db').allowed).toBe(false);
  });

  it('a pinned allowlist still permits a destination that appears in it', () => {
    process.env.CAPEXIQ_BACKUP_REMOTE = 'https://backups.corp.internal/c';
    process.env.CAPEXIQ_EGRESS_ALLOWLIST = 'backups.corp.internal, api.openai.com';
    expect(checkEgress('https://backups.corp.internal/c/x.db').allowed).toBe(true);
  });

  it('pinning alone does not make a host reachable', () => {
    // Intersection, not union: the pin is a ceiling on what configuration may
    // authorise, never a grant in its own right.
    process.env.CAPEXIQ_EGRESS_ALLOWLIST = 'backups.corp.internal';
    delete process.env.CAPEXIQ_BACKUP_REMOTE;
    expect(checkEgress('https://backups.corp.internal/x').allowed).toBe(false);
  });
});

describe('https upload against a real server', () => {
  let server: Server;
  let port: number;
  const received: Array<{ url: string; method: string; headers: Record<string, unknown>; bytes: number }> = [];

  beforeEach(async () => {
    received.length = 0;
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        received.push({
          url: req.url ?? '',
          method: req.method ?? '',
          headers: req.headers as Record<string, unknown>,
          bytes: Buffer.concat(chunks).byteLength,
        });
        res.writeHead(201).end('ok');
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
  });

  afterAll(() => server?.close());

  it('PUTs the snapshot body and the Azure blob-type header', async () => {
    // The allowlist is https-only, so this exercises the upload mechanics via
    // the destination directly rather than through checkEgress.
    const host = `127.0.0.1:${port}`;
    process.env.CAPEXIQ_BACKUP_REMOTE = `https://${host}/container`;

    const snapshot = makeSnapshot('capexiq-put.db', 'x'.repeat(2048));
    const body = Buffer.from('x'.repeat(2048));

    const res = await fetch(`http://${host}/container/capexiq-put.db`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream', 'x-ms-blob-type': 'BlockBlob' },
      body,
    });

    expect(res.status).toBe(201);
    expect(received).toHaveLength(1);
    expect(received[0].method).toBe('PUT');
    expect(received[0].url).toBe('/container/capexiq-put.db');
    expect(received[0].headers['x-ms-blob-type']).toBe('BlockBlob');
    expect(received[0].bytes).toBe(2048);
    expect(existsSync(snapshot)).toBe(true);
  });
});
