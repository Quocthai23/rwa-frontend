/**
 * Unified Realtime Store
 * 
 * Consolidates data from TWO WebSocket connections:
 * 1. Default namespace / for candlesticks + market ticker
 * 2. /trading namespace for order/trade events
 * 
 * Single source of truth for prices, orderbook, trades
 */

import { SOCKET_CHART_URL } from '@/constants/env';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

/** Market ticker from / namespace */
export type TickerMessage = {
    ask: number;
    askSize: number;
    bid: number;
    bidSize: number;
    change: number;
    changePercent: number;
    code: string;
    lastPrice: number;
    seq: number;
    sessionStats: {
        high: number;
        low: number;
        open: number;
        prevClose: number;
    };
    symbol: string;
    tick_time: number;
    timestamp: number;
    updatedAt: string;
    takerBuyVolume24h: number;
    takerSellVolume24h: number;
    takerBuyRatio5m?: number;
    takerBuyRatio24h: number;
    takerBuyVolume5m: number;
    takerSellVolume5m: number;
};

export type RT = { ts?: number } & TickerMessage;

/** Price update from /trading namespace */
export type PriceUpdate = {
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
    subscribeSymbol: (symbol: string) => void;
    unsubscribeSymbol: (symbol: string) => void;

    // Get current price for symbol (prefers trading namespace, fallback to ticker)
    getCurrentPrice: (symbol: string) => PriceUpdate | RT | null;
};

// ═══════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════

const FLUSH_INTERVAL_MS = 200; // Throttle frequency for less CPU

export const useRealtimeStore = create<RealtimeStoreState>((set, get) => {
    let batchedTickerUpdates: Record<string, RT> = {};
    let flushTimer: NodeJS.Timeout | null = null;
    let marketSocket: Socket | null = null;
    let tradingSocket: Socket | null = null;

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
            set({ isReconnecting: true });

            try {
                // === DEFAULT NAMESPACE (Market ticker) ===
                marketSocket = io(SOCKET_CHART_URL, {
                    path: '/socket.io',
                    reconnectionDelay: 1000,
                    reconnection: true,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                });

                marketSocket.on('connect', () => {
                    console.log('[Realtime] Market socket connected');
                    startFlushLoop();
                });

                marketSocket.on('disconnect', () => {
                    console.log('[Realtime] Market socket disconnected');
                    stopFlushLoop();
                });

                marketSocket.on('ticker', (message: { data: TickerMessage; event: string }) => {
                    const rt: RT = { ...message.data, ts: Date.now() };
                    batchedTickerUpdates[message.data.symbol] = rt;
                });

                marketSocket.on('connect_error', (error: Error) => {
                    set({ connectionError: error.message });
                    console.error('[Realtime] Market socket error:', error);
                });

                // === TRADING NAMESPACE (Orders, prices, orderbook) ===
                tradingSocket = io(`${SOCKET_CHART_URL}/trading`, {
                    path: '/socket.io',
                    auth: { token: localStorage.getItem('token') },
                    reconnectionDelay: 1000,
                    reconnection: true,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                });

                tradingSocket.on('connect', () => {
                    console.log('[Realtime] Trading socket connected');
                    // Re-subscribe after reconnect
                    const symbols = Array.from(get().subscribedSymbols);
                    symbols.forEach((symbol) => {
                        tradingSocket?.emit('subscribe_market', { assetId: symbol });
                    });
                });

                tradingSocket.on('price_update', (data: PriceUpdate) => {
                    set((state) => ({
                        pricesBySymbol: {
                            ...state.pricesBySymbol,
                            [data.symbol]: data,
                        },
                    }));
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
                    set({ connectionError: error.message });
                    console.error('[Realtime] Trading socket error:', error);
                });

                set({
                    socket: marketSocket,
                    tradingSocket,
                    isConnected: true,
                    isReconnecting: false,
                    connectionError: null,
                });
            } catch (error) {
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

            set({
                socket: null,
                tradingSocket: null,
                isConnected: false,
                isReconnecting: false,
                subscribedSymbols: new Set(),
            });
        },

        subscribeSymbol: (symbol: string) => {
            const state = get();
            if (state.subscribedSymbols.has(symbol)) return;

            marketSocket?.emit('subscribe', { symbols: [symbol] });
            tradingSocket?.emit('subscribe_market', { assetId: symbol });

            set((s) => ({
                subscribedSymbols: new Set([...s.subscribedSymbols, symbol]),
            }));
        },

        unsubscribeSymbol: (symbol: string) => {
            const state = get();
            if (!state.subscribedSymbols.has(symbol)) return;

            marketSocket?.emit('unsubscribe', { symbols: [symbol] });
            tradingSocket?.emit('unsubscribe_market', { assetId: symbol });

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
