'use client';

import type { ReactNode } from 'react';

import AppHeader, { type SharedHeaderProps } from '@/components/shared/header/AppHeader';
import AppNavbar from '@/components/shared/navbar/AppNavbar';
import { cn } from '@/lib/utils';

type AppLayoutProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  showHeader?: boolean;
  showNavbar?: boolean;
  headerProps?: SharedHeaderProps;
};

export function AppLayout({
  children,
  className,
  contentClassName,
  showHeader = false,
  showNavbar = true,
  headerProps,
}: AppLayoutProps) {
  const resolvedHeaderProps: SharedHeaderProps = {
    label: headerProps?.label ?? '',
    iconLeftLabel: headerProps?.iconLeftLabel,
    onBack: headerProps?.onBack,
    rightItem: headerProps?.rightItem,
  };

  return (
    <div className={cn('bg-background text-foreground min-h-dvh', className)}>
      {showHeader ? <AppHeader {...resolvedHeaderProps} /> : null}
      <div className={contentClassName}>{children}</div>
      {showNavbar ? <AppNavbar /> : null}
    </div>
  );
}
