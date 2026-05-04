'use client';

import { AppToaster, WebToaster } from '@/components/shared/atoms/sonner';
import { ThemeProvider } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GetdataProvider } from '../context/GetdataContext';
import { AnimationProvider } from '../context/AnimationContext';
import { orderSocketService } from '@/store/orderSocket';
import { useAccountStore } from '@/store/useAccountStore';
import I18nSync from '@/components/shared/I18nSync';
import { useMediaQuery } from '@/hook/useMediaQuery';
import '@/i18n';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: true,
      retry: 0,
      staleTime: 10_000,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 0,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const isDesktop = useMediaQuery('(min-width: 768px)', false);

  useEffect(() => {
    if (selectedAccount) {
      // Connect socket with optional accountId
      // const accountId = useAppStore.getState().selectedAccount;
      orderSocketService.connect(selectedAccount?.id);
    } else {
      // Disconnect socket when logged out
      orderSocketService.disconnect();
    }

    return () => {
      // Optional: disconnect on unmount
      // orderSocketService.disconnect();
    };
  }, [selectedAccount]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultMode="light">
        <AnimationProvider>
          <GetdataProvider>
            <I18nSync />
            {children}
            {isDesktop ? (
              <WebToaster richColors position="top-right" />
            ) : (
              <AppToaster richColors position="top-right" />
            )}
          </GetdataProvider>
        </AnimationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
