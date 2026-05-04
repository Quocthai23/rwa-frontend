/**
 * Trading Realtime Socket Store
 * Connects to /trading namespace for real-time trading events
 * Events: trade_matched, price_update, order_book_update, my_order_matched
 */

import { SOCKET_CHART_URL } from '@/constants/env';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────

type TradeEvent = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  buyerAccountId?: string;
  sellerAccountId?: string;
  buyOrderId?: string;
  sellOrderId?: string;
};

type PriceUpdate = {
  symbol: string;
  lastPrice: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
};

type OrderBookUpdate = {
  symbol: string;
  bids: Array<[price: number, quantity: number]>;
  asks: Array<[price: number, quantity: number]>;
  timestamp: number;
};

type MyOrderMatched = {
  orderId: string;
  symbol: string;
  matchedPrice: number;
  matchedQuantity: number;
  side: 'BUY' | 'SELL';
  counterpartyOrderId?: string;
  timestamp: number;
};

type ClientToServerEvents = {
  subscribeSymbol: (payload: { symbol: string; accountId?: string }) => void;
  unsubscribeSymbol: (payload: { symbol: string }) => void;
};

type ServerToClientEvents = {
  trade_matched: (data: TradeEvent) => void;
  price_update: (data: PriceUpdate) => void;
  order_book_update: (data: OrderBookUpdate) => void;
  my_order_matched: (data: MyOrderMatched) => void;
};

type TradingRealtimeSocketState = {
  isConnected: boolean;
  isReconnecting: boolean;
  socket: null | Socket<ServerToClientEvents, ClientToServerEvents>;

  // Subscription tracking
  subscribedSymbols: Set<string>;

  // Latest data
  latestTrades: Record<string, TradeEvent[]>; // symbol -> last 50 trades
  latestPrices: Record<string, PriceUpdate>;
  latestOrderBooks: Record<string, OrderBookUpdate>;

  // Callbacks
  onTradeMatched: (callback: (data: TradeEvent) => void) => () => void;
  onPriceUpdate: (callback: (data: PriceUpdate) => void) => () => void;
  onOrderBookUpdate: (callback: (data: OrderBookUpdate) => void) => () => void;
  onMyOrderMatched: (callback: (data: MyOrderMatched) => void) => () => void;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribeSymbol: (symbol: string, accountId?: string) => void;
  unsubscribeSymbol: (symbol: string) => void;
};

// ─── Store ────────────────────────────────────────────────────

const listeners = {
  tradeMatched: new Set<(data: TradeEvent) => void>(),
  priceUpdate: new Set<(data: PriceUpdate) => void>(),
  orderBookUpdate: new Set<(data: OrderBookUpdate) => void>(),
  myOrderMatched: new Set<(data: MyOrderMatched) => void>(),
};

export const useTradingRealtimeSocketStore = create<TradingRealtimeSocketState>((set, get) => ({
  isConnected: false,
  isReconnecting: false,
  socket: null,
  subscribedSymbols: new Set(),
  latestTrades: {},
  latestPrices: {},
  latestOrderBooks: {},

  onTradeMatched: (callback: (data: TradeEvent) => void) => {
    listeners.tradeMatched.add(callback);
    return () => {
      listeners.tradeMatched.delete(callback);
    };
  },

  onPriceUpdate: (callback: (data: PriceUpdate) => void) => {
    listeners.priceUpdate.add(callback);
    return () => {
      listeners.priceUpdate.delete(callback);
    };
  },

  onOrderBookUpdate: (callback: (data: OrderBookUpdate) => void) => {
    listeners.orderBookUpdate.add(callback);
    return () => {
      listeners.orderBookUpdate.delete(callback);
    };
  },

  onMyOrderMatched: (callback: (data: MyOrderMatched) => void) => {
    listeners.myOrderMatched.add(callback);
    return () => {
      listeners.myOrderMatched.delete(callback);
    };
  },

  connect: () => {
    const existing = get().socket;
    if (existing) {
      if (!existing.connected) existing.connect();
      return;
    }

    if (!SOCKET_CHART_URL) {
      console.warn('[TradingRealtimeSocket] ⚠️ SOCKET_CHART_URL not configured');
      return;
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      `${SOCKET_CHART_URL}/trading`,
      {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        timeout: 10_000,
        transports: ['websocket'],
      }
    );

    socket.on('connect', () => {
      console.log('[TradingRealtimeSocket] ✅ Connected to /trading namespace');
      set({ isConnected: true, isReconnecting: false });

      // Resubscribe to all symbols
      const { subscribedSymbols } = get();
      for (const symbol of subscribedSymbols) {
        socket.emit('subscribeSymbol', { symbol });
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[TradingRealtimeSocket] ❌ Disconnected:', reason);
      set({ isConnected: false, isReconnecting: true });
    });

    socket.on('connect_error', (error) => {
      console.error('[TradingRealtimeSocket] 🔴 Connection error:', error);
    });

    // Listen to trade_matched events
    socket.on('trade_matched', (data: TradeEvent) => {
      console.log('[TradingRealtimeSocket] 📊 Trade matched:', data);

      // Update latest trades
      set((state) => {
        const trades = state.latestTrades[data.symbol] ?? [];
        const updated = [data, ...trades].slice(0, 50); // Keep last 50
        return {
          latestTrades: {
            ...state.latestTrades,
            [data.symbol]: updated,
          },
        };
      });

      // Notify listeners
      for (const callback of listeners.tradeMatched) {
        callback(data);
      }
    });

    // Listen to price_update events
    socket.on('price_update', (data: PriceUpdate) => {
      set((state) => ({
        latestPrices: {
          ...state.latestPrices,
          [data.symbol]: data,
        },
      }));

      for (const callback of listeners.priceUpdate) {
        callback(data);
      }
    });

    // Listen to order_book_update events
    socket.on('order_book_update', (data: OrderBookUpdate) => {
      set((state) => ({
        latestOrderBooks: {
          ...state.latestOrderBooks,
          [data.symbol]: data,
        },
      }));

      for (const callback of listeners.orderBookUpdate) {
        callback(data);
      }
    });

    // Listen to my_order_matched events
    socket.on('my_order_matched', (data: MyOrderMatched) => {
      console.log('[TradingRealtimeSocket] 🎯 My order matched:', data);

      for (const callback of listeners.myOrderMatched) {
        callback(data);
      }
    });

    socket.connect();
    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  subscribeSymbol: (symbol: string, accountId?: string) => {
    const state = get();
    const { socket, subscribedSymbols } = state;

    subscribedSymbols.add(symbol);
    set({ subscribedSymbols: new Set(subscribedSymbols) });

    if (socket?.connected) {
      socket.emit('subscribeSymbol', { symbol, accountId });
    }
  },

  unsubscribeSymbol: (symbol: string) => {
    const state = get();
    const { socket, subscribedSymbols } = state;

    subscribedSymbols.delete(symbol);
    set({ subscribedSymbols: new Set(subscribedSymbols) });

    if (socket?.connected) {
      socket.emit('unsubscribeSymbol', { symbol });
    }
  },
}));
