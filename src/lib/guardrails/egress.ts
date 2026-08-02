/**
 * Outbound network policy — no scraping, ever.
 *
 * WHY THIS EXISTS
 *
 * Automated collection from third-party websites is not a neutral technical
 * choice in this jurisdiction. UAE Federal Decree-Law No. 34 of 2021 (the
 * Cybercrimes Law) criminalises accessing an information system without
 * authorisation, and a site's Terms of Use plus its robots.txt are the
 * ordinary evidence of what was and was not authorised. Federal Decree-Law
 * No. 45 of 2021 (PDPL) independently restricts collecting personal data
 * without a lawful basis, which a scraper cannot establish. Copyright in
 * compiled databases (Federal Decree-Law No. 38 of 2021) applies on top.
 *
 * So the rule for this project is absolute and structural, not advisory:
 * the application performs NO web scraping, NO crawling, and NO automated
 * retrieval from any host other than the configured model provider. Every
 * external figure in the product is either a user-entered assumption, a
 * value transcribed by hand from a cited public document, or clearly labelled
 * as synthetic.
 *
 * This module is the single chokepoint. Any outbound request must go through
 * `guardedFetch`, which fails closed against an allowlist. `tests/guardrails.test.ts`
 * additionally fails the build if a raw external fetch is reintroduced.
 */

/** Hosts this application may contact, and the only reason each is allowed. */
interface AllowedHost {
  host: string;
  reason: string;
}

function providerHost(): AllowedHost | null {
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  try {
    return {
      host: new URL(base).host.toLowerCase(),
      reason: 'Configured model provider — first-party API under contract, not a scraped source.',
    };
  } catch {
    return null;
  }
}

export function allowedHosts(): AllowedHost[] {
  const provider = providerHost();
  return provider ? [provider] : [];
}

export class EgressBlockedError extends Error {
  constructor(
    readonly url: string,
    readonly reason: string
  ) {
    super(`Egress blocked for ${url}: ${reason}`);
    this.name = 'EgressBlockedError';
  }
}

export interface EgressDecision {
  allowed: boolean;
  host: string;
  reason: string;
}

/**
 * Decide whether a URL may be contacted. Exported separately from
 * `guardedFetch` so policy can be asserted in tests without a network stack.
 */
export function checkEgress(rawUrl: string): EgressDecision {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, host: '', reason: 'Malformed URL.' };
  }

  if (url.protocol !== 'https:') {
    return {
      allowed: false,
      host: url.host,
      reason: 'Only https is permitted; plaintext egress is refused.',
    };
  }

  const host = url.host.toLowerCase();
  const match = allowedHosts().find((a) => a.host === host);
  if (!match) {
    return {
      allowed: false,
      host,
      reason:
        'Host is not the configured model provider. This application does not scrape, crawl or ' +
        'automatically retrieve third-party web content. Add the value by hand with a citation ' +
        'instead, or obtain a licensed API and add it to the allowlist deliberately.',
    };
  }

  return { allowed: true, host, reason: match.reason };
}

/** The only sanctioned way to make an outbound request. Fails closed. */
export async function guardedFetch(url: string, init?: RequestInit): Promise<Response> {
  const decision = checkEgress(url);
  if (!decision.allowed) throw new EgressBlockedError(url, decision.reason);
  return fetch(url, init);
}
