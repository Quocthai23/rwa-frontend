'use client';

import type { ReactNode } from 'react';

import WebHeader, { type WebHeaderProps } from '@/components/shared/header/WebHeader';
import WebNavbar from '@/components/shared/navbar/WebNavbar';
import { cn } from '@/lib/utils';
import LiveAccountOnly from '@/components/shared/trading/LiveAccountOnly';

type WebLayoutProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showHeader?: boolean;
  showNavbar?: boolean;
  headerProps?: WebHeaderProps;
  liveOnly?: boolean;
};

export function WebLayout({
  children,
  className,
  contentClassName,
  showHeader = true,
  showNavbar = true,
  headerProps,
  liveOnly = false,
}: WebLayoutProps) {
  return (
    <div className={cn('bg-background text-foreground min-h-dvh', className)}>
      {showHeader ? <WebHeader {...headerProps} /> : null}
      <div className={cn(showNavbar ? 'pl-[80px]' : '', contentClassName)}>
        {liveOnly ? <LiveAccountOnly>{children}</LiveAccountOnly> : children}
      </div>
      {showNavbar ? <WebNavbar withHeader={showHeader} /> : null}
    </div>
  );
}
