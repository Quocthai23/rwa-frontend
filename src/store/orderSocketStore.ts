/**
 * Order Socket Store (Zustand)
 * 
 * Refactored from class-based to Zustand pattern
 * Manages real-time order and position updates via /trading namespace
 */

import { queryClient } from '@/app/provider';
import { SOCKET_CHART_URL } from '@/constants/env';
import { OrderItem } from '@/types/orders';
import { Position } from '@/types/position';
import { io } from 'socket.io-client';
import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type MyOrderMatchedEvent = {
    orderId: string;
    symbol: string;
    matchedPrice: number;
    matchedQuantity: number;
    side: 'BUY' | 'SELL';
    counterpartyOrderId?: string;
    timestamp: number;
};

export type OrderSocketState = {
    isConnected: boolean;
    isReconnecting: boolean;
    connectionError: string | null;

    socket: any | null;

    // Subscriptions tracking
    subscribedAccounts: Set<string>;
    subscribedSymbols: Set<string>;

    // Actions
    connect: () => void;
    disconnect: () => void;
    subscribeAccount: (accountId: string) => void;
    unsubscribeAccount: (accountId: string) => void;
    subscribeSymbol: (symbol: string) => void;
    unsubscribeSymbol: (symbol: string) => void;

    // Event handlers
    onOrderMatched: (callback: (event: MyOrderMatchedEvent) => void) => () => void;
};

// ═══════════════════════════════════════════════════════════
// LISTENERS (for manual subscription)
// ═══════════════════════════════════════════════════════════

const listeners = {
    orderMatched: new Set<(event: MyOrderMatchedEvent) => void>(),
};

const notifyOrderMatched = (event: MyOrderMatchedEvent) => {
    listeners.orderMatched.forEach((listener) => listener(event));
};

// ═══════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════

export const useOrderSocketStore = create<OrderSocketState>((set, get) => {
    let socket: any = null;

    return {
        isConnected: false,
        isReconnecting: false,
        connectionError: null,
        socket: null,
        subscribedAccounts: new Set(),
        subscribedSymbols: new Set(),

        connect: () => {
            set({ isReconnecting: true });

            try {
                socket = io(`${SOCKET_CHART_URL}/trading`, {
                    path: '/socket.io',
                    auth: { token: localStorage.getItem('token') },
                    reconnectionDelay: 1000,
                    reconnection: true,
                    reconnectionDelayMax: 5000,
                    reconnectionAttempts: 5,
                });

                socket.on('connect', () => {
                    console.log('[OrderSocket] Connected');

                    // Re-subscribe accounts & symbols after reconnect
                    const { subscribedAccounts, subscribedSymbols } = get();
                    Array.from(subscribedAccounts).forEach((accountId) => {
                        socket.emit('subscribe_user', { accountId });
                    });
                    Array.from(subscribedSymbols).forEach((symbol) => {
                        socket.emit('subscribe_market', { assetId: symbol });
                    });

                    set({ isConnected: true, isReconnecting: false, connectionError: null });
                });

                socket.on('disconnect', () => {
                    console.log('[OrderSocket] Disconnected');
                    set({ isConnected: false });
                });

                socket.on('my_order_matched', (event: MyOrderMatchedEvent) => {
                    // Notify listeners
                    notifyOrderMatched(event);

                    // Invalidate affected queries
                    queryClient.invalidateQueries({ queryKey: ['infinite-orders'] });
                    queryClient.invalidateQueries({ queryKey: ['infinite-positions'] });
                });

                socket.on('connect_error', (error: Error) => {
                    set({ connectionError: error.message });
                    console.error('[OrderSocket] Connection error:', error);
                });

                set({ socket, isConnected: true, isReconnecting: false });
            } catch (error) {
                set({
                    isConnected: false,
                    isReconnecting: false,
                    connectionError: (error as Error).message,
                });
                console.error('[OrderSocket] Failed to connect:', error);
            }
        },

        disconnect: () => {
            socket?.disconnect();
            socket = null;
            set({
                socket: null,
                isConnected: false,
                isReconnecting: false,
                subscribedAccounts: new Set(),
                subscribedSymbols: new Set(),
            });
        },

        subscribeAccount: (accountId: string) => {
            const state = get();
            if (state.subscribedAccounts.has(accountId)) return;

            socket?.emit('subscribe_user', { accountId });

            set((s) => ({
                subscribedAccounts: new Set([...s.subscribedAccounts, accountId]),
            }));
        },

        unsubscribeAccount: (accountId: string) => {
            const state = get();
            if (!state.subscribedAccounts.has(accountId)) return;

            socket?.emit('unsubscribe_user', { accountId });

            set((s) => {
                const next = new Set(s.subscribedAccounts);
                next.delete(accountId);
                return { subscribedAccounts: next };
            });
        },

        subscribeSymbol: (symbol: string) => {
            const state = get();
            if (state.subscribedSymbols.has(symbol)) return;

            socket?.emit('subscribe_market', { assetId: symbol });

            set((s) => ({
                subscribedSymbols: new Set([...s.subscribedSymbols, symbol]),
            }));
        },

        unsubscribeSymbol: (symbol: string) => {
            const state = get();
            if (!state.subscribedSymbols.has(symbol)) return;

            socket?.emit('unsubscribe_market', { assetId: symbol });

            set((s) => {
                const next = new Set(s.subscribedSymbols);
                next.delete(symbol);
                return { subscribedSymbols: next };
            });
        },

        onOrderMatched: (callback: (event: MyOrderMatchedEvent) => void) => {
            listeners.orderMatched.add(callback);
            return () => {
                listeners.orderMatched.delete(callback);
            };
        },
    };
});
