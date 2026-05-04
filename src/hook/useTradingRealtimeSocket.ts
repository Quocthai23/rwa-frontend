/**
 * Hook: useTradingRealtimeSocket
 * Manages trading realtime socket connection and subscriptions
 * Auto-connects on mount and subscribes to symbols
 */

import { useEffect } from 'react';
import { useTradingRealtimeSocketStore } from '@/store/tradingRealtimeSocketStore';

type UseRealtimeSocketOptions = {
  /** Symbols to subscribe to on mount */
  symbols?: string[];
  /** User account ID for receiving personal order matched events */
  accountId?: string;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
};

export const useTradingRealtimeSocket = (options: UseRealtimeSocketOptions = {}) => {
  const { symbols = [], accountId, autoConnect = true } = options;
  const store = useTradingRealtimeSocketStore();

  useEffect(() => {
    if (!autoConnect) return;

    // Connect to socket
    store.connect();

    return () => {
      // Don't disconnect on unmount - socket should persist
      // This allows multiple components to use the same socket
    };
  }, [autoConnect, store]);

  useEffect(() => {
    // Subscribe to symbols when they change
    for (const symbol of symbols) {
      store.subscribeSymbol(symbol, accountId);
    }

    return () => {
      // Optionally unsubscribe on unmount
      // for (const symbol of symbols) {
      //   store.unsubscribeSymbol(symbol);
      // }
    };
  }, [symbols, accountId, store]);

  return store;
};
