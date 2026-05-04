import { SOCKET_CHART_URL } from '@/constants/env';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

const DISABLE_MARKET_SOCKET = false;

type ClientToServerEvents = {
  subscribe: (payload: { symbols: string[] }) => void;
  unsubscribe: (payload: { symbols: string[] }) => void;
};

type DataSocket = {
  data: TickerMessage;
  event: string;
};

type MarketSocketState = {
  isConnected: boolean;
  isReconnecting: boolean;

  socket: null | Socket<ServerToClientEvents, ClientToServerEvents>;

  subCount: Record<string, number>;

  rtBySymbol: Record<string, RT>;

  connect: () => void;
  disconnect: () => void;

  subscribeSymbols: (symbols: string[]) => void;
  unsubscribeSymbols: (symbols: string[]) => void;
};

type RT = { ts?: number } & TickerMessage;

type ServerToClientEvents = {
  ticker: (message: DataSocket) => void; // server emit "ticker"
  // (optional) snapshot: (message: { data: Record<string, TickerMessage> }) => void
};

type TickerMessage = {
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

export const useMarketSocketStore = create<MarketSocketState>((set, get) => {
  let batchedUpdates: Record<string, RT> = {};
  let flushTimer: NodeJS.Timeout | null = null;

  const FLUSH_INTERVAL_MS = 300;

  const startFlushLoop = () => {
    if (flushTimer) return;

    flushTimer = setInterval(() => {
      const keys = Object.keys(batchedUpdates);
      if (keys.length === 0) return;

      // take snapshot
      const updates = batchedUpdates;
      batchedUpdates = {};

      set((s) => ({
        rtBySymbol: {
          ...s.rtBySymbol,
          ...updates,
        },
      }));
    }, FLUSH_INTERVAL_MS);
  };

  const stopFlushLoop = () => {
    if (!flushTimer) return;
    clearInterval(flushTimer);
    flushTimer = null;

    // optional: reset buffer
    batchedUpdates = {};
  };

  return {
    isConnected: false,
    rtBySymbol: {},
    isReconnecting: false,
    socket: null,
    subCount: {},

    connect: () => {
      if (DISABLE_MARKET_SOCKET) return;

      const existing = get().socket;
      if (existing) {
        startFlushLoop();

        if (!existing.connected) existing.connect();

        return;
      }

      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_CHART_URL, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
        timeout: 10_000,
        transports: ['websocket'],
      });

      startFlushLoop();

      socket.on('connect', () => {
        set({ isConnected: true, isReconnecting: false });

        const all = Object.keys(get().subCount);
        if (all.length > 0) socket.emit('subscribe', { symbols: all });
      });
      socket.io.on('reconnect_attempt', () => {
        set({ isReconnecting: true });
      });

      socket.on('disconnect', (reason) => {
        set({ isConnected: false, isReconnecting: true });
      });

      socket.on('connect_error', (error) => {});
      socket.io.on('reconnect_failed', () => {
        set({ isReconnecting: false });
      });
      // ---- listen ticker ----
      socket.on('ticker', (message) => {
        const raw = message?.data ?? (message as unknown as TickerMessage);
        const symbol = raw?.symbol ?? raw?.code;
        if (!symbol) return;

        batchedUpdates[symbol] = {
          ...batchedUpdates[symbol],
          ...raw,
          ts: Date.now(),
        };
      });

      set({ socket });
      socket.connect();
    },

    disconnect: () => {
      const socket = get().socket;
      if (!socket) {
        stopFlushLoop();

        return;
      }
      socket.io.off('reconnect_failed');
      socket.io.off('reconnect_attempt');
      socket.removeAllListeners();
      socket.disconnect();

      stopFlushLoop();

      set({
        isConnected: false,
        socket: null,
        subCount: {},
        isReconnecting: false,
        // rtBySymbol: {},
      });
    },

    subscribeSymbols: (symbols) => {
      const uniq = [...new Set(symbols)].filter(Boolean);
      if (uniq.length === 0) return;
      const toSub: string[] = [];

      set((st) => {
        const next = { ...st.subCount };
        for (const sym of uniq) {
          const previous = next[sym] ?? 0;
          next[sym] = previous + 1;
          if (previous === 0) toSub.push(sym);
        }

        return { subCount: next };
      });

      const socket = get().socket;

      if (toSub.length > 0 && socket?.connected) {
        socket.emit('subscribe', { symbols: toSub });
      }
    },

    unsubscribeSymbols: (symbols) => {
      const uniq = [...new Set(symbols)].filter(Boolean);
      if (uniq.length === 0) return;
      const toUnsub: string[] = [];

      set((st) => {
        const next = { ...st.subCount };
        for (const sym of uniq) {
          const previous = next[sym] ?? 0;
          const now = Math.max(0, previous - 1);

          if (now === 0) {
            if (previous > 0) toUnsub.push(sym);
            delete next[sym];
          } else {
            next[sym] = now;
          }
        }

        return { subCount: next };
      });

      const socket = get().socket;

      if (toUnsub.length > 0 && socket?.connected) {
        socket.emit('unsubscribe', { symbols: toUnsub });
      }
    },
  };
});
