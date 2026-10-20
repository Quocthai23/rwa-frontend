import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './provider';
import { Navbar } from '@/components/shared/Navbar';
import RouteKeepAliveSwitch from './RouteKeepAliveSwitch';
import { BodyWrapper } from './BodyWrapper';
import PwaRegistration from '@/components/shared/PwaRegistration';
import { ExperienceSync } from '@/lib/experience/ExperienceSync';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: 'MTX Trading – Nền tảng giao dịch tài sản thực (RWA)',
  description:
    'MTX Trading là nền tảng tokenization tài sản thực hàng đầu Việt Nam. Mua bán, giao dịch token bất động sản và tài sản có giá trị một cách minh bạch trên blockchain.',
  keywords: 'RWA, tokenization, real world assets, bất động sản, trading, MTX, blockchain, PropX',
  openGraph: {
    title: 'MTX Trading – RWA Tokenization Platform',
    description: 'Giao dịch tài sản thực được tokenized trên blockchain',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/logo/logo-web.svg', type: 'image/svg+xml' }],
    shortcut: '/logo/logo-web.svg',
    apple: '/logo/logo-web.svg',
  },
};

// FIX 2.5: Remove maximumScale and userScalable – WCAG 2.1 SC 1.4.4 compliance
// Users must be able to zoom up to 400% without loss of content/functionality
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // minimumScale, maximumScale, userScalable intentionally omitted
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.className} suppressHydrationWarning>
      <BodyWrapper>
        <Providers>
          <ExperienceSync />
          <PwaRegistration />
          <RouteKeepAliveSwitch>{children}</RouteKeepAliveSwitch>
          <Navbar />
        </Providers>
      </BodyWrapper>
    </html>
  );
}
