import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/navigation/CommandPalette';

export const metadata: Metadata = {
  title: 'CapExIQ — AI Capital Budgeting Decision Platform | NovaRetail GCC',
  description: 'AI-Assisted Capital Expenditure Decision Platform for Micro-Fulfilment Centre evaluation by NovaRetail GCC.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <CommandPalette />
          <div className="flex-1 flex flex-col md:flex-row">
            <Sidebar />
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
