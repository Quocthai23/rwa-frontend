/**
 * Hook: useTradingRealtimeSocket (Refactored)
 * 
 * Unified API for accessing real-time trading data from BOTH:
 * - / namespace: ticker (bid/ask/price)
 * - /trading namespace: order events, trades, orderbook
 * 
 * Auto-subscribes to provided symbols and handles cleanup
 */

import { useEffect } from 'react';
import { useRealtimeStore } from '@/store/realtimeStore';

interface UseRealtimeSocketOptions {
  /** Symbols to auto-subscribe to */
  symbols?: string[];
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

export const useTradingRealtimeSocket = (options: UseRealtimeSocketOptions = {}) => {
  const { symbols = [], autoConnect = true } = options;
  const store = useRealtimeStore();

  // Auto-subscribe to symbols
  useEffect(() => {
    symbols.forEach((symbol) => {
      store.subscribeSymbol(symbol);
    });

    return () => {
      symbols.forEach((symbol) => {
        store.unsubscribeSymbol(symbol);
      });
    };
  }, [symbols, store]);

  return {
    // Connection status
    isConnected: store.isConnected,
    isReconnecting: store.isReconnecting,
    connectionError: store.connectionError,

    // Price data unified (prefers /trading namespace, fallback to /default)
    getCurrentPrice: (symbol: string) => store.getCurrentPrice(symbol),

    // Market ticker from / namespace
    rtBySymbol: store.rtBySymbol,

    // Real-time data from /trading namespace
    orderBooks: store.orderBooks,
    lastTrades: store.lastTrades,
    pricesBySymbol: store.pricesBySymbol,

    // Actions
    connect: store.connect,
    disconnect: store.disconnect,
    subscribe: store.subscribeSymbol,
    unsubscribe: store.unsubscribeSymbol,
  };
};
