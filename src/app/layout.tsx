import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import QueryProvider from '@/components/providers/QueryProvider';
import ThemeProvider from '@/components/providers/ThemeProvider';
import { getSettings } from '@/lib/settings';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TaskWarlock - TaskWarrior Web Interface',
  description: 'A modern, beautiful web interface for TaskWarrior with multiple themes and real-time task management',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch default theme from settings
  const settings = await getSettings();
  const defaultTheme = settings.theme;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const storageKey = 'taskwarlock-ui-theme';
                const theme = localStorage.getItem(storageKey) || '${defaultTheme}';
                document.documentElement.classList.add('theme-' + theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
