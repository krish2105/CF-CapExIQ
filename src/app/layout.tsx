import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AppChrome } from '@/components/layout/AppChrome';
import { ChartGradients } from '@/components/ui/charts';
import { StoreHydration } from '@/components/StoreHydration';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <ChartGradients />
        </svg>
        {/* Applies the persisted store after hydration. See the component for
            why the store defers rehydration rather than doing it inline. */}
        <StoreHydration />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
