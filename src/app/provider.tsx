'use client';

import { AppToaster, WebToaster } from '@/components/shared/atoms/sonner';
import { ThemeProvider } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GetdataProvider } from '../context/GetdataContext';
import { AnimationProvider } from '../context/AnimationContext';
import { useRealtimeStore } from '@/store/realtimeStore';
import { useOrderSocketStore } from '@/store/orderSocketStore';
import { useKlineSocketStore } from '@/store/klineSocketStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import I18nSync from '@/components/shared/I18nSync';
import { GlobalModals } from '@/components/shared/GlobalModals';
import { useMediaQuery } from '@/hook/useMediaQuery';
import '@/i18n';

/** Keeps kline WebSocket alive across route changes (e.g. Market ↔ Trade) so candles stay continuous. */
let klineAppSessionConnectStarted = false;

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
  const userId = useAuthStore((state) => state.user?.id);
  const isDesktop = useMediaQuery('(min-width: 768px)', false);

  // Initialize kline socket (keeps candlestick data alive)
  useEffect(() => {
    if (klineAppSessionConnectStarted) return;
    klineAppSessionConnectStarted = true;
    useKlineSocketStore.getState().connect();
  }, []);

  // Initialize realtime store (unified market + trading data)
  useEffect(() => {
    useRealtimeStore.getState().connect();
  }, []);

  // Initialize order socket when account is selected
  useEffect(() => {
    useOrderSocketStore.getState().disconnect();
    if (userId && selectedAccount?.id) {
      useOrderSocketStore.getState().connect();
      useOrderSocketStore.getState().subscribeAccount(selectedAccount.id);
    } else {
      useOrderSocketStore.getState().disconnect();
    }

    return () => {
      useOrderSocketStore.getState().disconnect();
    };
  }, [selectedAccount?.id, userId]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultMode="light">
        <AnimationProvider>
          <GetdataProvider>
            <I18nSync />
            <GlobalModals />
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
