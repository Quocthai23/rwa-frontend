'use client';

import { useEffect, type ReactNode } from 'react';
import { isDemoAccount } from '@/lib/trading/environment';
import { useAccountStore } from '@/store/useAccountStore';
import { notifyIfDemoAccount } from '@/store/demoNoticeStore';
import LiveAccountOnly from './LiveAccountOnly';

export default function DemoPaymentRouteGuard({ children }: { children: ReactNode }) {
  const demo = useAccountStore((s) => isDemoAccount(s.selectedAccount));
  useEffect(() => {
    if (demo) notifyIfDemoAccount();
  }, [demo]);
  return <LiveAccountOnly>{children}</LiveAccountOnly>;
}
