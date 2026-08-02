import { describe, it, expect } from 'vitest';
import { signRequest, uriEncode, amzDates } from '@/lib/db/remote/sigv4';

/**
 * AWS's published SigV4 test suite.
 *
 * Hand-rolling a request signer is only defensible if it is checked against
 * the authority's own vectors — a signature that is merely well-formed is
 * indistinguishable from one that is wrong until a real upload rejects it,
 * and by then the backup job has been "succeeding" for weeks.
 *
 * Credentials below are AWS's documented examples, not secrets.
 */
const AWS_EXAMPLE = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  service: 'service',
  now: new Date('2015-08-30T12:36:00Z'),
};

describe('SigV4 against AWS published vectors', () => {
  it('matches get-vanilla', () => {
    const parts = signRequest({
      ...AWS_EXAMPLE,
      method: 'GET',
      url: 'https://example.amazonaws.com/',
      body: Buffer.alloc(0),
    });

    expect(parts.signedHeaders).toBe('host;x-amz-date');
    expect(parts.credentialScope).toBe('20150830/us-east-1/service/aws4_request');
    expect(parts.signature).toBe(
      '5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31'
    );
  });

  it('builds the documented canonical request for get-vanilla', () => {
    const parts = signRequest({
      ...AWS_EXAMPLE,
      method: 'GET',
      url: 'https://example.amazonaws.com/',
      body: Buffer.alloc(0),
    });

    expect(parts.canonicalRequest).toBe(
      [
        'GET',
        '/',
        '',
        'host:example.amazonaws.com\nx-amz-date:20150830T123600Z\n',
        'host;x-amz-date',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ].join('\n')
    );
  });

  it('produces the documented string-to-sign preamble', () => {
    const parts = signRequest({
      ...AWS_EXAMPLE,
      method: 'GET',
      url: 'https://example.amazonaws.com/',
      body: Buffer.alloc(0),
    });

    const lines = parts.stringToSign.split('\n');
    expect(lines[0]).toBe('AWS4-HMAC-SHA256');
    expect(lines[1]).toBe('20150830T123600Z');
    expect(lines[2]).toBe('20150830/us-east-1/service/aws4_request');
  });

  it('sorts query parameters by encoded key then value', () => {
    const parts = signRequest({
      ...AWS_EXAMPLE,
      method: 'GET',
      url: 'https://example.amazonaws.com/?Param2=value2&Param1=value1',
      body: Buffer.alloc(0),
    });
    expect(parts.canonicalRequest.split('\n')[2]).toBe('Param1=value1&Param2=value2');
  });

  it('signs the payload hash for S3 and omits it elsewhere', () => {
    const body = Buffer.from('snapshot bytes');

    const s3 = signRequest({
      ...AWS_EXAMPLE,
      service: 's3',
      method: 'PUT',
      url: 'https://bucket.s3.us-east-1.amazonaws.com/key.db',
      body,
    });
    expect(s3.signedHeaders).toContain('x-amz-content-sha256');

    const other = signRequest({
      ...AWS_EXAMPLE,
      method: 'PUT',
      url: 'https://example.amazonaws.com/key',
      body,
    });
    expect(other.signedHeaders).not.toContain('x-amz-content-sha256');
  });

  it('includes a session token in the signed headers when present', () => {
    const parts = signRequest({
      ...AWS_EXAMPLE,
      method: 'GET',
      url: 'https://example.amazonaws.com/',
      body: Buffer.alloc(0),
      sessionToken: 'FQoDYXdzEExampleToken',
    });
    expect(parts.signedHeaders).toContain('x-amz-security-token');
  });

  it('changes the signature when the body changes', () => {
    const base = { ...AWS_EXAMPLE, service: 's3', method: 'PUT', url: 'https://b.s3.amazonaws.com/k' };
    const a = signRequest({ ...base, body: Buffer.from('one') });
    const b = signRequest({ ...base, body: Buffer.from('two') });
    expect(a.signature).not.toBe(b.signature);
  });
});

describe('URI encoding', () => {
  it('escapes the characters encodeURIComponent leaves alone', () => {
    // AWS requires !'()* escaped; encodeURIComponent does not escape them, and
    // a key containing one would sign correctly and upload with a mismatch.
    expect(uriEncode("a!b'c(d)e*f", false)).toBe('a%21b%27c%28d%29e%2Af');
  });

  it('keeps slashes in a path but escapes them in a value', () => {
    expect(uriEncode('a/b/c', true)).toBe('a/b/c');
    expect(uriEncode('a/b/c', false)).toBe('a%2Fb%2Fc');
  });

  it('escapes spaces as %20, never +', () => {
    expect(uriEncode('capexiq backup.db', false)).toBe('capexiq%20backup.db');
  });
});

describe('timestamp formatting', () => {
  it('formats the AMZ date and date stamp', () => {
    const { amzDate, dateStamp } = amzDates(new Date('2026-08-02T14:47:15.528Z'));
    expect(amzDate).toBe('20260802T144715Z');
    expect(dateStamp).toBe('20260802');
  });
});
