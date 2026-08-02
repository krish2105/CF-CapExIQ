/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content-Security-Policy.
 *
 * The app previously shipped X-Frame-Options / nosniff / Referrer-Policy but
 * no CSP at all, which leaves the highest-value client-side control unset.
 *
 * 'unsafe-inline' for styles is required: the design system sets CSS custom
 * properties inline (--reveal-delay, chart geometry) and next/font injects an
 * inline <style>. Scripts additionally need 'unsafe-eval' in development only
 * — that is the webpack HMR runtime, and it must never reach production.
 *
 * next-themes writes the theme class before first paint via an inline script,
 * so script-src carries 'unsafe-inline'. Removing it requires migrating that
 * bootstrap to a nonce, which Next cannot yet supply to a client component in
 * the App Router without opting the whole tree into dynamic rendering.
 */
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Route handlers proxy the model provider server-side, so the browser only
  // ever talks to this origin. Dev additionally needs the HMR websocket.
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
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
