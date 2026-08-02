/**
 * Post-login redirect sanitisation.
 *
 * The sign-in form navigates to whatever `?next=` says. Passing that value
 * through unchecked turns the login page into an open redirect — and an open
 * redirect on a login page is the useful kind, because the victim has just
 * been asked to type a password and will follow the destination without
 * suspicion.
 *
 * Only same-origin absolute paths are accepted. Everything else falls back to
 * the dashboard.
 */

export const DEFAULT_REDIRECT = '/dashboard';

/**
 * Control characters (NUL, tab, newline, DEL) are stripped or normalised by
 * some browsers before navigation, which is how a scheme gets smuggled past a
 * naive prefix check. Tested by code point rather than by a regex character
 * class so the literal bytes never have to survive a round trip through
 * tooling that may rewrite them.
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function safeRedirect(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_REDIRECT;
  if (hasControlCharacter(raw)) return DEFAULT_REDIRECT;

  // Must be a single-slash absolute path.
  //   "//evil.example"        protocol-relative — browsers treat as absolute
  //   "https://evil.example"  absolute
  //   "/\evil.example"        backslash normalised to "/" by some browsers
  //   "javascript:alert(1)"   scheme
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT;
  if (raw.startsWith('//')) return DEFAULT_REDIRECT;
  if (raw.startsWith('/\\')) return DEFAULT_REDIRECT;

  return raw;
}
