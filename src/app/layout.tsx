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
  themeColor: '#1C1F1D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Kakeibo — Gestion Zen & Finances Personnelles',
  description: 'Application Kakeibo pour maîtriser son budget, ses 4 piliers de dépenses et son épargne de façon sereine et privée.',
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FAF9F5] dark:bg-[#141615] text-stone-900 dark:text-stone-100 selection:bg-stone-900 selection:text-white">
        <SecurityProvider>
          {children}
          <PwaRegister />
        </SecurityProvider>
      </body>
    </html>
  );
}
