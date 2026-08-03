/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

/**
 * The Content-Security-Policy is NOT here.
 *
 * It moved to `src/middleware.ts` because `script-src` now carries a
 * per-request nonce, and this function is evaluated once at build time — it
 * can only emit a constant. Leaving a second, static CSP here would not merge
 * with the per-request one; the browser would enforce BOTH, and the stricter
 * union would block the very scripts the nonce exists to permit.
 *
 * The headers below are genuinely constant and stay.
 */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // The voice copilot asks for the mic on user gesture; everything
            // else is denied outright.
            value: 'camera=(), geolocation=(), interest-cohort=(), microphone=(self)',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // The AI route handlers are non-idempotent and provider-billed —
        // never let a shared cache or CDN retain their responses.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;
