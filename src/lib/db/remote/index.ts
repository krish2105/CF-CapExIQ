import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signedHeaders } from './sigv4';
import { guardedFetch } from '@/lib/guardrails/egress';

/**
 * Shipping snapshots off the box.
 *
 * WHY THIS MATTERS MORE THAN THE LOCAL BACKUP
 *
 * `pnpm db:backup` writes to `.data/backups/`, on the same disk as the
 * database. That protects against a bad migration or an accidental delete and
 * against nothing else — lose the volume and the audit trail, the approval
 * records and every snapshot of them go together. Until a copy exists
 * somewhere else, the honest description is "rollback", not "disaster
 * recovery", and this module is what closes that gap.
 *
 * DESTINATIONS
 *
 * Configured by a single URL in `CAPEXIQ_BACKUP_REMOTE`:
 *
 *   file:///mnt/backup-volume     a different disk, NAS or mounted share
 *   s3://bucket/prefix?region=eu-west-1
 *   https://host/container/prefix?<sas-token>    Azure Blob, or any presigned
 *                                                PUT endpoint
 *
 * `file:` is not a lesser option. A mounted volume on separate hardware is
 * genuinely off-box, needs no credentials in the environment, and is what
 * most single-instance deployments should reach for first. The network
 * backends exist for where that is not available.
 *
 * EGRESS
 *
 * Every network upload goes through `guardedFetch`, the same chokepoint that
 * governs the model provider. A backup target is first-party storage under
 * the operator's control, so it is a legitimate entry rather than an
 * exception to the no-scraping policy — but it still has to be named, and an
 * unnamed host is refused.
 */

export interface UploadResult {
  destination: string;
  key: string;
  bytes: number;
}

export interface RemoteDestination {
  readonly kind: 'file' | 's3' | 'https';
  readonly describe: string;
  upload(localFile: string): Promise<UploadResult>;
  /** Newest first. Empty when the backend cannot enumerate cheaply. */
  list(): Promise<string[]>;
  prune(keep: number): Promise<string[]>;
}

// ------------------------------------------------------------------- file

class FileDestination implements RemoteDestination {
  readonly kind = 'file' as const;
  readonly describe: string;

  constructor(private readonly dir: string) {
    this.describe = `file:${dir}`;
  }

  async upload(localFile: string): Promise<UploadResult> {
    mkdirSync(this.dir, { recursive: true });
    const key = path.basename(localFile);
    const target = path.join(this.dir, key);

    if (existsSync(target)) {
      // Same rule as the local snapshot: never silently overwrite a restore
      // point that already exists.
      throw new Error(`Refusing to overwrite an existing remote snapshot: ${target}`);
    }

    copyFileSync(localFile, target);
    return { destination: this.describe, key, bytes: statSync(target).size };
  }

  async list(): Promise<string[]> {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => path.join(this.dir, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  }

  async prune(keep: number): Promise<string[]> {
    if (keep < 1) throw new Error('Refusing to prune to fewer than one remote backup.');
    const removed: string[] = [];
    for (const file of (await this.list()).slice(keep)) {
      unlinkSync(file);
      removed.push(file);
    }
    return removed;
  }
}

// --------------------------------------------------------------------- s3

class S3Destination implements RemoteDestination {
  readonly kind = 's3' as const;
  readonly describe: string;

  constructor(
    private readonly bucket: string,
    private readonly prefix: string,
    private readonly region: string,
    private readonly endpoint: string
  ) {
    this.describe = `s3://${bucket}/${prefix}`;
  }

  private credentials() {
    const accessKeyId = process.env.CAPEXIQ_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CAPEXIQ_S3_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'CAPEXIQ_S3_ACCESS_KEY_ID and CAPEXIQ_S3_SECRET_ACCESS_KEY must be set to upload to S3.'
      );
    }
    return { accessKeyId, secretAccessKey, sessionToken: process.env.CAPEXIQ_S3_SESSION_TOKEN };
  }

  async upload(localFile: string): Promise<UploadResult> {
    const key = `${this.prefix}${this.prefix.endsWith('/') || !this.prefix ? '' : '/'}${path.basename(localFile)}`;
    const url = `${this.endpoint}/${key}`;

    const body = readFileSync(localFile);
    const creds = this.credentials();

    const headers = signedHeaders({
      method: 'PUT',
      url,
      region: this.region,
      service: 's3',
      body,
      ...creds,
      headers: {
        'content-type': 'application/octet-stream',
        // Server-side encryption is requested, not assumed. A snapshot holds
        // password hashes and the entire audit trail; landing it unencrypted
        // in a bucket because nobody set a default policy is not acceptable.
        'x-amz-server-side-encryption': 'AES256',
      },
    });

    const res = await guardedFetch(url, { method: 'PUT', headers, body });
    if (!res.ok) {
      throw new Error(`S3 upload failed: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    }

    return { destination: this.describe, key, bytes: body.byteLength };
  }

  async list(): Promise<string[]> {
    // ListObjectsV2 is deliberately not implemented: remote retention on an
    // object store belongs in a bucket lifecycle rule, which survives this
    // application being down and cannot delete the wrong thing because of a
    // bug here.
    return [];
  }

  async prune(): Promise<string[]> {
    return [];
  }
}

// ------------------------------------------------------------------- https

class HttpsDestination implements RemoteDestination {
  readonly kind = 'https' as const;
  readonly describe: string;

  constructor(private readonly base: URL) {
    this.describe = `https://${base.host}${base.pathname}`;
  }

  async upload(localFile: string): Promise<UploadResult> {
    const key = path.basename(localFile);
    const url = new URL(this.base.toString());
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${key}`;

    const body = readFileSync(localFile);
    const res = await guardedFetch(url.toString(), {
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
        // Azure Blob requires this on a PUT; harmless to other endpoints.
        'x-ms-blob-type': 'BlockBlob',
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: HTTP ${res.status} ${await res.text().catch(() => '')}`);
    }

    return { destination: this.describe, key, bytes: body.byteLength };
  }

  async list(): Promise<string[]> {
    return [];
  }

  async prune(): Promise<string[]> {
    return [];
  }
}

// ------------------------------------------------------------------ parsing

/**
 * Build the configured destination, or null when none is set.
 *
 * Returning null rather than throwing: a deployment with no off-box target is
 * a supported (if weaker) configuration, and the backup command says so
 * loudly rather than failing.
 */
export function remoteDestination(
  raw = process.env.CAPEXIQ_BACKUP_REMOTE
): RemoteDestination | null {
  if (!raw?.trim()) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`CAPEXIQ_BACKUP_REMOTE is not a valid URL: ${raw}`);
  }

  if (url.protocol === 'file:') {
    return new FileDestination(fileURLToPath(url));
  }

  if (url.protocol === 's3:') {
    const bucket = url.hostname;
    const prefix = url.pathname.replace(/^\//, '');
    const region = url.searchParams.get('region') ?? process.env.AWS_REGION ?? 'us-east-1';
    const endpoint =
      process.env.CAPEXIQ_S3_ENDPOINT ?? `https://${bucket}.s3.${region}.amazonaws.com`;
    return new S3Destination(bucket, prefix, region, endpoint.replace(/\/$/, ''));
  }

  if (url.protocol === 'https:') {
    return new HttpsDestination(url);
  }

  // http: is refused here as well as by the allowlist. A snapshot in flight is
  // password hashes and an audit trail on the wire.
  throw new Error(
    `Unsupported backup destination "${url.protocol}". Use file:, s3: or https:.`
  );
}
