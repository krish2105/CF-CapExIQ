import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppChrome } from '@/components/layout/AppChrome';
import { ChartGradients } from '@/components/ui/charts';
import { cookies, headers } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session';
import { isSessionActive } from '@/lib/db/repositories/sessions';
import { RoleProvider } from '@/components/auth/RoleProvider';

/**
 * Type system — serif/sans collision.
 *
 * The Slash reference specifies Ivy Presto for display type. Ivy Presto is a
 * commercial IvyType licence and cannot be bundled, so we use Playfair
 * Display — the substitute named in the reference itself. Both are
 * high-contrast didones, so the serif/sans collision that defines the brand
 * survives the swap.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CapExIQ — AI Capital Budgeting Decision Platform | NovaRetail GCC',
  description:
    'AI-Assisted Capital Expenditure Decision Platform for Micro-Fulfilment Centre evaluation by NovaRetail GCC.',
};

/**
 * Reading the session here opts the whole tree into dynamic rendering — the
 * pages that were `○ (Static)` become `ƒ (Dynamic)`.
 *
 * That is the deliberate cost of deriving the lens server-side. The previous
 * arrangement prerendered pages and then decided what to show from a
 * localStorage value, which is fast and forgeable. Since every page behind
 * middleware is already per-request authorised, static prerendering was
 * buying very little: the HTML shell was cacheable but the request still had
 * to be checked at the edge before it was served.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set by middleware, which owns the CSP. next-themes writes the theme class
  // before first paint via an inline script — the one script in the tree that
  // is genuinely ours — so it needs the nonce or it is blocked and the page
  // flashes the wrong theme on every load.
  const nonce = headers().get('x-nonce') ?? undefined;

  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);

  // A revoked session resolves to no lens. Middleware verified the signature
  // at the edge, where the database is unreachable, so this is where a
  // signed-out-but-still-signed token stops resolving to a role — meaning it
  // can route a page shell but cannot render anything gated.
  const role = session && isSessionActive(session.jti) ? session.role : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen antialiased flex flex-col bg-background text-foreground">
        {/* Recharts drops any child whose `type` isn't a literal SVG tag
            string, so a per-chart <ChartGradients/> component never reaches
            the DOM (see src/components/ui/charts.tsx). Mounting the defs
            once here, in a plain (non-Recharts) SVG, makes every gradient
            resolvable by every chart via its #id — url() references work
            across sibling <svg> elements in the same document. */}
        <svg width="0" height="0" className="svg-defs-host" aria-hidden="true" focusable="false">
          <ChartGradients />
        </svg>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
          <RoleProvider role={role}>
            <AppChrome>{children}</AppChrome>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
