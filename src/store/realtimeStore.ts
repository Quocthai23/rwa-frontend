/**
 * Unified Realtime Store
 *
 * Consolidates data from TWO WebSocket connections:
 * 1. Default namespace / for candlesticks + market ticker
 * 2. /trading namespace for order/trade events
 *
 * Single source of truth for prices, orderbook, trades
 */

import { getSocketBaseUrl } from '@/utils/socketUrl';
import { getSocketAccessToken } from '@/services/tokenStorage';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/** Market ticker from / namespace */
export type TickerMessage = {
  assetId?: string;
  symbol?: string;
  ask?: number;
  askSize?: number;
  bid?: number;
  bidSize?: number;
  change?: number;
  changePercent?: number;
  code?: string;
  lastPrice?: number;
  seq?: number;
  sessionStats?: {
    high?: number;
    low?: number;
    open?: number;
    prevClose?: number;
  };
  low?: number;
  high?: number;
  open?: number;
  prevClose?: number;
  tick_time?: number;
  timestamp?: number | string;
  updatedAt?: string;
  volume?: number;
  buyPercent?: number;
  sellPercent?: number;
  takerBuyVolume24h?: number;
  takerSellVolume24h?: number;
  takerBuyRatio5m?: number;
  takerBuyRatio24h?: number;
  takerBuyVolume5m?: number;
  takerSellVolume5m?: number;
};

export type RT = { ts?: number } & TickerMessage;

/** Price update from /trading namespace */
export type PriceUpdate = {
  assetId?: string;
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
};

/** Trade event */
export type TradeEvent = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  buyerAccountId?: string;
  sellerAccountId?: string;
};

/** Order book snapshot */
export type OrderBookSnapshot = {
  symbol: string;
  bids: Array<[price: number, quantity: number]>;
  asks: Array<[price: number, quantity: number]>;
  timestamp: number;
};

/** My order matched event */
export type MyOrderMatched = {
  orderId: string;
  symbol: string;
  matchedPrice: number;
  matchedQuantity: number;
  side: 'BUY' | 'SELL';
  counterpartyOrderId?: string;
  timestamp: number;
};

export type RealtimeStoreState = {
  // Connection status
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;

  // Sockets (private)
  socket: Socket | null;
  tradingSocket: Socket | null;

  // Subscriptions
  subscribedSymbols: Set<string>;

  // Price & ticker data (UNIFIED from both namespaces)
  rtBySymbol: Record<string, RT>; // From / namespace ticker
  pricesBySymbol: Record<string, PriceUpdate>; // From /trading namespace

  // Order book & trades
  orderBooks: Record<string, OrderBookSnapshot>;
  lastTrades: Record<string, TradeEvent[]>; // Last 50 per symbol

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribeSymbol: (symbol: string, assetId?: string) => void;
  unsubscribeSymbol: (symbol: string, assetId?: string) => void;

  // Get current price for symbol (prefers trading namespace, fallback to ticker)
  getCurrentPrice: (symbol: string) => PriceUpdate | RT | null;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STORE IMPLEMENTATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const FLUSH_INTERVAL_MS = 200; // Throttle frequency for less CPU

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => {
  let batchedTickerUpdates: Record<string, RT> = {};
  let flushTimer: NodeJS.Timeout | null = null;
  let marketSocket: Socket | null = null;
  let tradingSocket: Socket | null = null;
  const subscribedAssetIds = new Map<string, string>();

  const syncConnectionState = () => {
    const connected = Boolean(marketSocket?.connected && tradingSocket?.connected);
    set({
      isConnected: connected,
      isReconnecting: !connected,
      ...(connected ? { connectionError: null } : {}),
    });
  };

  const upsertPriceUpdate = (data: PriceUpdate) => {
    const keys = new Set<string>();

    if (data.symbol) {
      keys.add(data.symbol);
    }

    if (data.assetId) {
      keys.add(data.assetId);
    }

    if (keys.size === 0) {
      return;
    }

    set((state) => {
      const nextPricesBySymbol = { ...state.pricesBySymbol };

      for (const key of keys) {
        nextPricesBySymbol[key] = data;
      }

      return {
        pricesBySymbol: nextPricesBySymbol,
      };
    });
  };

  const startFlushLoop = () => {
    if (flushTimer) return;

    flushTimer = setInterval(() => {
      const updates = batchedTickerUpdates;
      if (Object.keys(updates).length === 0) return;

      batchedTickerUpdates = {};
      set((state) => ({
        rtBySymbol: {
          ...state.rtBySymbol,
          ...updates,
        },
      }));
    }, FLUSH_INTERVAL_MS);
  };

  const stopFlushLoop = () => {
    if (!flushTimer) return;
    clearInterval(flushTimer);
    flushTimer = null;
  };

  return {
    isConnected: false,
    isReconnecting: false,
    connectionError: null,
    socket: null,
    tradingSocket: null,
    subscribedSymbols: new Set(),
    rtBySymbol: {},
    pricesBySymbol: {},
    orderBooks: {},
    lastTrades: {},

    connect: () => {
      // Providers and symbol hooks share these connections.
      if (marketSocket || tradingSocket) return;
      set({ isReconnecting: true });

      try {
        // === DEFAULT NAMESPACE (Market ticker) ===
        const socketBaseUrl = getSocketBaseUrl();
        marketSocket = io(socketBaseUrl, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        });

        marketSocket.on('connect', () => {
          console.log('[Realtime] Market socket connected');
          startFlushLoop();
          marketSocket?.emit('subscribe', { symbols: Array.from(get().subscribedSymbols) });
          syncConnectionState();
        });

        marketSocket.on('disconnect', () => {
          console.log('[Realtime] Market socket disconnected');
          stopFlushLoop();
          syncConnectionState();
        });

        marketSocket.on('ticker', (message: TickerMessage | { data?: TickerMessage }) => {
          const payload: TickerMessage | undefined =
            message && typeof message === 'object' && 'data' in message
              ? (message as { data?: TickerMessage }).data
              : (message as TickerMessage);
          const symbol = payload?.symbol ?? payload?.assetId;
          if (!payload || !symbol) {
            return;
          }
          const sessionStats =
            payload.sessionStats ??
            (payload.low == null &&
            payload.high == null &&
            payload.open == null &&
            payload.prevClose == null
              ? undefined
              : {
                  high: payload.high,
                  low: payload.low,
                  open: payload.open,
                  prevClose: payload.prevClose,
                });
          const rt: RT = { ...payload, symbol, sessionStats, ts: Date.now() };
          batchedTickerUpdates[symbol] = rt;
        });

        marketSocket.on('connect_error', (error: Error) => {
          set({ isConnected: false, isReconnecting: true, connectionError: error.message });
          console.warn('[Realtime] Market connection interrupted; retrying:', error.message);
        });

        // === TRADING NAMESPACE (Orders, prices, orderbook) ===
        const tradingBaseUrl = socketBaseUrl ?? '';
        tradingSocket = io(`${tradingBaseUrl}/trading`, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          auth: (callback) => { void getSocketAccessToken().then((token) => callback({ token })); },
          reconnectionDelay: 1000,
          reconnection: true,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        });

        tradingSocket.on('connect', () => {
          console.log('[Realtime] Trading socket connected');
          // Re-subscribe after reconnect
          const symbols = Array.from(get().subscribedSymbols);
          symbols.forEach((symbol) => {
            tradingSocket?.emit('subscribe_market', {
              assetId: subscribedAssetIds.get(symbol) ?? symbol,
            });
          });
          syncConnectionState();
        });

        tradingSocket.on('disconnect', syncConnectionState);

        tradingSocket.on('price_update', (data: PriceUpdate | { data?: PriceUpdate }) => {
          const payload =
            data && typeof data === 'object' && 'data' in data
              ? (data as { data?: PriceUpdate }).data
              : (data as PriceUpdate);

          if (!payload) {
            return;
          }

          upsertPriceUpdate(payload);
        });

        tradingSocket.on('order_book_update', (data: OrderBookSnapshot) => {
          set((state) => ({
            orderBooks: {
              ...state.orderBooks,
              [data.symbol]: data,
            },
          }));
        });

        tradingSocket.on('trade_matched', (data: TradeEvent) => {
          set((state) => ({
            lastTrades: {
              ...state.lastTrades,
              [data.symbol]: [data, ...(state.lastTrades[data.symbol] ?? [])].slice(0, 50),
            },
          }));
        });

        tradingSocket.on('connect_error', (error: Error) => {
          set({ isConnected: false, isReconnecting: true, connectionError: error.message });
          console.warn('[Realtime] Trading connection interrupted; retrying:', error.message);
        });

        set({
          socket: marketSocket,
          tradingSocket,
          isConnected: false,
          isReconnecting: true,
          connectionError: null,
        });
      } catch (error) {
        marketSocket?.disconnect();
        tradingSocket?.disconnect();
        marketSocket = null;
        tradingSocket = null;
        set({
          isConnected: false,
          isReconnecting: false,
          connectionError: (error as Error).message,
        });
        console.error('[Realtime] Connect failed:', error);
      }
    },

    disconnect: () => {
      stopFlushLoop();
      marketSocket?.disconnect();
      tradingSocket?.disconnect();
      marketSocket = null;
      tradingSocket = null;
      subscribedAssetIds.clear();

      set({
        socket: null,
        tradingSocket: null,
        isConnected: false,
        isReconnecting: false,
        subscribedSymbols: new Set(),
      });
    },

    subscribeSymbol: (symbol: string, assetId?: string) => {
      if (assetId) subscribedAssetIds.set(symbol, assetId);
      const state = get();
      if (state.subscribedSymbols.has(symbol)) return;

      marketSocket?.emit('subscribe', { symbols: [symbol] });
      tradingSocket?.emit('subscribe_market', { assetId: assetId ?? symbol });

      set((s) => ({
        subscribedSymbols: new Set([...s.subscribedSymbols, symbol]),
      }));
    },

    unsubscribeSymbol: (symbol: string, assetId?: string) => {
      const state = get();
      if (!state.subscribedSymbols.has(symbol)) return;

      marketSocket?.emit('unsubscribe', { symbols: [symbol] });
      tradingSocket?.emit('unsubscribe_market', {
        assetId: assetId ?? subscribedAssetIds.get(symbol) ?? symbol,
      });
      subscribedAssetIds.delete(symbol);

      set((s) => {
        const next = new Set(s.subscribedSymbols);
        next.delete(symbol);
        return { subscribedSymbols: next };
      });
    },

    getCurrentPrice: (symbol: string) => {
      const state = get();
      // Prefer trading namespace price (more real-time for trading)
      return state.pricesBySymbol[symbol] || state.rtBySymbol[symbol] || null;
    },
  };
});
