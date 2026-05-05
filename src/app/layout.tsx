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
  title: 'MTX Trading',
  icons: {
    icon: [{ url: '/logo/logo-web.svg', type: 'image/svg+xml' }],
    shortcut: '/logo/logo-web.svg',
    apple: '/logo/logo-web.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
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
