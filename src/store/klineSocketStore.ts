import { getSocketBaseUrl } from '@/utils/socketUrl';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';

type Candle = {
  close: number;
  high: number;
  isClosed: boolean;
  low: number;
  open: number;
  timestamp: number;
  volume: number;
};

type ClientToServerEvents = {
  subscribeKline: (payload: {
    symbol?: string;
    assetId?: string;
    timeframe: number;
    resolution?: string;
  }) => void;
  unsubscribeKline: (payload: {
    symbol?: string;
    assetId?: string;
    timeframe: number;
    resolution?: string;
  }) => void;
};

type KlineSocketState = {
  connectCount: number;
  isConnected: boolean;
  socket: null | Socket<ServerToClientEvents, ClientToServerEvents>;

  // Track active subscriptions
  subscriptions: Map<string, KlineSubscription>;

  // Store latest candle data by symbol-timeframe key
  klineData: Record<string, Candle>;

  // Callbacks for real-time updates
  connect: () => void;

  disconnect: () => void;
  listeners: Map<string, Set<(candle: Candle) => void>>;

  /** topicId = asset UUID (preferred) or symbol string â€” must match server kline keys */
  subscribe: (topicId: string, timeframe: number, callback: (candle: Candle) => void) => void;
  unsubscribe: (topicId: string, timeframe: number, callback: (candle: Candle) => void) => void;
};

type KlineSubscription = {
  topicId: string;
  timeframe: number;
};

type ServerToClientEvents = {
  kline: (message: unknown) => void;
};

// const SOCKET_URL = 'wss://price-service-integration.tnwteam.dev';

export const buildKlineStoreKey = (topicId: string, timeframe: number) => `${topicId}-${timeframe}`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isAssetIdTopic(topicId: string): boolean {
  return UUID_RE.test(topicId.trim());
}

function timeframeSecondsToResolutionLabel(seconds: number): string {
  if (seconds <= 60) return '1m';
  if (seconds <= 300) return '5m';
  if (seconds <= 900) return '15m';
  if (seconds <= 3600) return '1h';
  if (seconds <= 14400) return '4h';
  if (seconds <= 86400) return '1d';
  return '1h';
}

function buildSubscribePayload(topicId: string, timeframe: number) {
  const resolution = timeframeSecondsToResolutionLabel(timeframe);
  if (isAssetIdTopic(topicId)) {
    return { assetId: topicId.trim(), timeframe, resolution };
  }
  return { symbol: topicId.trim(), timeframe, resolution };
}

function resolutionLabelToSeconds(res: unknown): number | null {
  if (typeof res === 'number' && Number.isFinite(res) && res > 0) return res;
  const s = String(res ?? '')
    .trim()
    .toLowerCase();
  const map: Record<string, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '60m': 3600,
    '4h': 14400,
    '240m': 14400,
    '1d': 86400,
    d: 86400,
    '1w': 604800,
  };
  if (map[s] != null) return map[s];
  const m = s.match(/^(\d+)\s*m$/i);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n)) return n * 60;
  }
  const h = s.match(/^(\d+)\s*h$/i);
  if (h) {
    const n = Number.parseInt(h[1], 10);
    if (Number.isFinite(n)) return n * 3600;
  }
  return null;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Supports:
 * - Nest flat: { assetId, resolution: "1m", time, open, high, low, close, volume, isClosed }
 * - Wrapped: { data: { symbol, timeframe, candle } }
 * - Flat symbol: { symbol, timeframe, ... OHLC }
 */
function parseKlineSocketPayload(
  message: unknown,
): { topicId: string; timeframe: number; candle: Candle } | null {
  if (!isPlainObject(message)) return null;

  const inner = isPlainObject(message.data) ? message.data : message;

  const assetId = typeof inner.assetId === 'string' ? inner.assetId.trim() : '';
  const symbol = typeof inner.symbol === 'string' ? inner.symbol.trim() : '';
  const topicId = assetId || symbol;
  if (!topicId) return null;

  let timeframe = NaN;
  const tfRaw = inner.timeframe;
  if (typeof tfRaw === 'number' && Number.isFinite(tfRaw)) {
    timeframe = tfRaw;
  } else if (typeof tfRaw === 'string') {
    const parsed = Number.parseInt(tfRaw, 10);
    if (Number.isFinite(parsed)) timeframe = parsed;
  }
  if (!Number.isFinite(timeframe)) {
    timeframe = resolutionLabelToSeconds(inner.resolution) ?? NaN;
  }
  if (!Number.isFinite(timeframe)) return null;

  const candleObj = isPlainObject(inner.candle) ? inner.candle : inner;

  const toNum = (v: unknown) => Number(String(v ?? 'NaN'));
  const time = candleObj.timestamp ?? candleObj.time ?? inner.time;
  let ts = typeof time === 'number' ? time : toNum(time);
  if (ts && ts < 1e12) ts = ts * 1000;

  const open = toNum(candleObj.open ?? candleObj.o);
  const high = toNum(candleObj.high ?? candleObj.h);
  const low = toNum(candleObj.low ?? candleObj.l);
  const close = toNum(candleObj.close ?? candleObj.c);
  const volume = toNum(candleObj.volume ?? candleObj.v ?? 0);
  const isClosedRaw = candleObj.isClosed ?? inner.isClosed;
  const isClosed = typeof isClosedRaw === 'boolean' ? isClosedRaw : true;

  if (![open, high, low, close].every((n) => Number.isFinite(n))) return null;

  const candle: Candle = {
    open,
    high,
    low,
    close,
    volume: Number.isFinite(volume) ? volume : 0,
    timestamp: Number.isFinite(ts) ? ts : Date.now(),
    isClosed,
  };

  return { topicId, timeframe, candle };
}

export const useKlineSocketStore = create<KlineSocketState>((set, get) => ({
  connect: () => {
    set((state) => ({ connectCount: state.connectCount + 1 }));

    const existing = get().socket;
    if (existing) {
      if (!existing.connected) existing.connect();

      return;
    }

    const socketBaseUrl = getSocketBaseUrl();
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketBaseUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10_000,
      // Polling first avoids "connection interrupted while page is loading" in some browsers;
      // websocket-only fails if the WS handshake races with navigation or strict proxies.
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });

      // Resubscribe all active subscriptions
      const { subscriptions } = get();
      for (const sub of subscriptions.values()) {
        socket.emit('subscribeKline', buildSubscribePayload(sub.topicId, sub.timeframe));
      }
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      set({ isConnected: false });
      console.warn('[Kline] Connection interrupted; retrying:', error.message);
    });

    // Listen to kline events
    socket.on('kline', (message: unknown) => {
      const parsed = parseKlineSocketPayload(message);
      if (!parsed) return;

      const { topicId, timeframe, candle } = parsed;
      const key = buildKlineStoreKey(topicId, timeframe);

      set((state) => ({
        klineData: {
          ...state.klineData,
          [key]: candle,
        },
      }));

      const listeners = get().listeners.get(key);
      if (listeners) {
        for (const callback of listeners) callback(candle);
      }
    });

    socket.connect();
    set({ socket });
  },
  connectCount: 0,
  disconnect: () => {
    const state = get();
    const nextCount = Math.max(0, state.connectCount - 1);

    set({ connectCount: nextCount });

    if (nextCount > 0) return;

    if (state.socket) {
      state.socket.disconnect();
      set({ isConnected: false, socket: null });
    }
  },
  isConnected: false,
  klineData: {},
  listeners: new Map(),

  socket: null,

  // subscribe: (
  //   symbol: string,
  //   timeframe: number,
  //   callback: (candle: Candle) => void,
  // ) => {
  //   const { listeners, socket, subscriptions } = get();
  //   const key = getKey(symbol, timeframe);

  //   // Add listener
  //   const existingListeners = listeners.get(key) || new Set();
  //   existingListeners.add(callback);
  //   listeners.set(key, existingListeners);

  //   // If first subscription for this key, emit to server
  //   if (!subscriptions.has(key)) {
  //     subscriptions.set(key, { symbol, timeframe });

  //     if (socket?.connected) {
  //       socket.emit('subscribeKline', { symbol, timeframe });
  //     }

  //     set({
  //       listeners: new Map(listeners),
  //       subscriptions: new Map(subscriptions),
  //     });
  //   }
  // },

  subscribe: (topicId, timeframe, callback) => {
    const key = buildKlineStoreKey(topicId, timeframe);
    let shouldEmit = false;

    set((state) => {
      const listeners = new Map(state.listeners);
      const subscriptions = new Map(state.subscriptions);

      const setForKey = new Set(listeners.get(key) ?? []);
      setForKey.add(callback);
      listeners.set(key, setForKey);

      if (!subscriptions.has(key)) {
        subscriptions.set(key, { topicId, timeframe });
        shouldEmit = true;
      }

      return { listeners, subscriptions };
    });

    const socket = get().socket;
    if (shouldEmit && socket?.connected) {
      socket.emit('subscribeKline', buildSubscribePayload(topicId, timeframe));
    }
  },

  subscriptions: new Map(),

  unsubscribe: (topicId: string, timeframe: number, callback: (candle: Candle) => void) => {
    const key = buildKlineStoreKey(topicId, timeframe);
    let shouldEmit = false;

    set((state) => {
      const listeners = new Map(state.listeners);
      const subscriptions = new Map(state.subscriptions);

      const existingListeners = listeners.get(key);
      if (!existingListeners) return state;

      const nextListeners = new Set(existingListeners);
      nextListeners.delete(callback);

      if (nextListeners.size === 0) {
        listeners.delete(key);
        subscriptions.delete(key);
        shouldEmit = true;
      } else {
        listeners.set(key, nextListeners);
      }

      return {
        listeners,
        subscriptions,
      };
    });

    const socket = get().socket;
    if (shouldEmit && socket?.connected) {
      socket.emit('unsubscribeKline', buildSubscribePayload(topicId, timeframe));
    }
  },
}));
