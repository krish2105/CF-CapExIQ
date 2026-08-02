import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature Version 4, for S3 uploads.
 *
 * WHY NOT `@aws-sdk/client-s3`
 *
 * The SDK is roughly 20 MB across its dependency tree and pulls a credential
 * -provider chain that will happily read instance metadata, shared config
 * files and environment variables this application has no business touching.
 * All that is needed here is a single authenticated PUT. SigV4 is a hash, an
 * HMAC chain and a canonical string — about a hundred lines, with no runtime
 * dependency and nothing that reaches for ambient credentials.
 *
 * The trade is that this code is now ours to get right, which is why the
 * intermediate values are exported and asserted against AWS's own published
 * test vectors in `tests/sigv4.test.ts` rather than only the final header.
 * A signature that is merely well-formed is worthless.
 */

export interface SigV4Input {
  method: string;
  /** Full URL including any query string. */
  url: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  /** Raw body bytes. Empty buffer for a bodyless request. */
  body: Buffer;
  /** Additional headers to sign. `host` and `x-amz-*` are added here. */
  headers?: Record<string, string>;
  /** Overridable so tests can pin AWS's documented timestamp. */
  now?: Date;
}

const sha256Hex = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

/** `20150830T123600Z` and `20150830`. */
export function amzDates(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

/**
 * URI-encode a path segment per AWS rules.
 *
 * `encodeURIComponent` leaves `!'()*` unescaped and AWS requires them
 * escaped; conversely `/` must survive in a path. Getting this wrong produces
 * a signature mismatch only for keys containing those characters, which is
 * the kind of bug that ships fine and then fails on one customer's filename.
 */
export function uriEncode(value: string, keepSlashes: boolean): string {
  let out = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  if (keepSlashes) out = out.replace(/%2F/g, '/');
  return out;
}

export interface CanonicalParts {
  canonicalRequest: string;
  signedHeaders: string;
  credentialScope: string;
  stringToSign: string;
  signature: string;
  authorization: string;
  amzDate: string;
  payloadHash: string;
}

export function signRequest(input: SigV4Input): CanonicalParts {
  const now = input.now ?? new Date();
  const { amzDate, dateStamp } = amzDates(now);
  const url = new URL(input.url);
  const payloadHash = sha256Hex(input.body);

  const headers: Record<string, string> = {
    host: url.host,
    // S3 requires the payload hash as a signed header; the other services in
    // AWS's published test suite do not send it, and adding it unconditionally
    // would both diverge from those vectors and sign a header the service does
    // not expect.
    ...(input.service === 's3' ? { 'x-amz-content-sha256': payloadHash } : {}),
    'x-amz-date': amzDate,
    ...(input.sessionToken ? { 'x-amz-security-token': input.sessionToken } : {}),
    ...Object.fromEntries(
      Object.entries(input.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
    ),
  };

  // Sorted by header name; values whitespace-collapsed and trimmed.
  const sortedNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedNames
    .map((name) => `${name}:${headers[name].trim().replace(/\s+/g, ' ')}\n`)
    .join('');
  const signedHeaders = sortedNames.join(';');

  // Query parameters are sorted by encoded key, then encoded value.
  const query = [...url.searchParams.entries()]
    .map(([k, v]) => [uriEncode(k, false), uriEncode(v, false)] as const)
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonicalUri = uriEncode(decodeURIComponent(url.pathname), true) || '/';

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  // The derivation chain: each step re-keys with the next scope component, so
  // a leaked signing key is scoped to one day, one region and one service.
  const kDate = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, input.service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    canonicalRequest,
    signedHeaders,
    credentialScope,
    stringToSign,
    signature,
    authorization,
    amzDate,
    payloadHash,
  };
}

/** Headers to send alongside a signed request. */
export function signedHeaders(input: SigV4Input): Record<string, string> {
  const parts = signRequest(input);
  return {
    Authorization: parts.authorization,
    'x-amz-content-sha256': parts.payloadHash,
    'x-amz-date': parts.amzDate,
    ...(input.sessionToken ? { 'x-amz-security-token': input.sessionToken } : {}),
    ...(input.headers ?? {}),
  };
}
