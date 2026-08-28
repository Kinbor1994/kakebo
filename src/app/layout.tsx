import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SecurityProvider } from '@/components/security/SecurityContext';
import { PwaRegister } from '@/components/layout/PwaRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Kakeibo — Finances Zen & Gestion Personnelle',
  description: 'Application Kakeibo pour maîtriser son budget, ses 4 piliers de dépenses et son épargne en F CFA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kakeibo',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      >
        <SecurityProvider>
          {children}
          <PwaRegister />
        </SecurityProvider>
      </body>
    </html>
  );
}
