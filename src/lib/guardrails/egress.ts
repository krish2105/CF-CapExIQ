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

/**
 * Backup destination, if one is configured.
 *
 * Shipping snapshots off-box is outbound traffic, so it has to be named here
 * or `guardedFetch` refuses it — which is the chokepoint working as intended.
 * A backup target is a first-party store under the operator's control, not a
 * third-party site being harvested, so it is a legitimate allowlist entry
 * rather than an exception to the scraping policy.
 */
function backupHost(): AllowedHost | null {
  const remote = process.env.CAPEXIQ_BACKUP_REMOTE;
  if (!remote || remote.startsWith('file:')) return null;

  try {
    return {
      host: new URL(remote).host.toLowerCase(),
      reason: 'Configured backup destination — first-party storage under the operator\'s control.',
    };
  } catch {
    return null;
  }
}

/**
 * Hosts explicitly pinned by the operator.
 *
 * WHY THIS EXISTS
 *
 * Every other entry is *derived* from the variable that names it, which means
 * the allowlist cannot protect against that variable being wrong. Point
 * `OPENAI_BASE_URL` at an attacker's host and `checkEgress` cheerfully
 * approves it, because the policy and the target come from the same place —
 * and the prompt carries the capital model. This was noted as a real
 * limitation when the SDK was first routed through the allowlist.
 *
 * `CAPEXIQ_EGRESS_ALLOWLIST` closes it: a comma-separated list of hosts that
 * every derived destination must ALSO appear in. Unset, behaviour is
 * unchanged (derive-only), so this is opt-in and nothing breaks by default.
 * Set, it becomes the outer bound — a poisoned base URL no longer authorises
 * itself.
 */
function pinnedHosts(): Set<string> | null {
  const raw = process.env.CAPEXIQ_EGRESS_ALLOWLIST;
  if (!raw?.trim()) return null;

  const hosts = raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return hosts.length ? new Set(hosts) : null;
}

export function allowedHosts(): AllowedHost[] {
  const derived = [providerHost(), backupHost()].filter((h): h is AllowedHost => h !== null);

  const pinned = pinnedHosts();
  if (!pinned) return derived;

  // Intersection, not union: the pin is a ceiling on what configuration may
  // authorise, so a host that is only pinned is not thereby reachable, and a
  // host that is only derived is refused.
  return derived.filter((h) => pinned.has(h.host));
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
