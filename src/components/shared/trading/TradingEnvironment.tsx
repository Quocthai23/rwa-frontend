'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAccounts } from '@/hook/useAccount';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { isDemoAccount } from '@/lib/trading/environment';

export default function TradingEnvironment({ children }: { children: ReactNode }) {
  const { data: accounts = [] } = useAccounts();
  const select = useAccountStore((s) => s.selectAccount);
  const userId = useAuthStore((s) => s.user?.id);
  const pathname = usePathname();

  useEffect(() => {
    if (!userId || !accounts.length) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('tradingMode') === 'demo') {
      const account = accounts.find(isDemoAccount);
      if (account) {
        select(account);
        url.searchParams.delete('tradingMode');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    }
  }, [accounts, userId, select, pathname]);

  return <>{children}</>;
}
