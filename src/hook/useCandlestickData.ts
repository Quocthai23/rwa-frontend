/**
 * Hook: useCandlestickData
 * 
 * Manages candlestick data flow:
 * 1. Load initial historical data from GET /market-data/candles API
 * 2. Subscribe to real-time kline events via WebSocket (default namespace)
 * 3. Update chart when new candles arrive
 * 
 * Backend Flow:
 * OrderMatchingService → MarketDataService.recordTrade()
 *   ↓ (emit kline event to default namespace)
 *   ↓
 * FE receives via klineSocketStore
 *   ↓
 * onCandleUpdate callback fired
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { buildKlineStoreKey, useKlineSocketStore } from '@/store/klineSocketStore';

type CandleData = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  isClosed: boolean;
};

type UseCandlestickDataOptions = {
  assetId?: string;
  symbol: string;
  timeframe?: number; // in seconds (default: 3600 = 1h)
  autoLoad?: boolean; // auto-load initial data (default: true)
  autoConnect?: boolean; // auto-connect socket (default: true)
};

type UseCandlestickDataReturn = {
  candles: CandleData[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  currentCandle: CandleData | null;
  onCandleUpdate: (callback: (candle: CandleData) => void) => () => void;
};

export const useCandlestickData = (
  options: UseCandlestickDataOptions,
): UseCandlestickDataReturn => {
  const {
    assetId,
    symbol,
    timeframe = 3600, // 1 hour
    autoLoad = true,
    autoConnect = true,
  } = options;

  /** Prefer UUID so keys match server kline payloads that use assetId */
  const klineTopicId = assetId ?? symbol;

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null);

  // Get kline socket store
  const { connect, subscribe, unsubscribe, isConnected, klineData } = useKlineSocketStore();

  // Convert timeframe (seconds) to resolution (1m, 5m, 15m, 1h, 4h, 1d)
  const getResolution = (seconds: number): string => {
    const minutes = seconds / 60;
    if (minutes === 1) return '1m';
    if (minutes === 5) return '5m';
    if (minutes === 15) return '15m';
    if (seconds === 3600) return '1h';
    if (seconds === 14400) return '4h';
    if (seconds === 86400) return '1d';
    return '1h'; // default
  };

  // Load initial historical data from API
  const loadHistoricalData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate date range (last 30 days)
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

      const resolution = getResolution(timeframe);

      const effectiveAssetId = assetId ?? (symbol.includes('/') ? symbol.split('/')[0] : symbol);

      const params = new URLSearchParams({
        assetId: effectiveAssetId,
        resolution,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const url = `/api/market-data/candles?${params}`;
      console.log('[useCandlestickData] Loading from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.statusText}`);
      }

      const data = await response.json();

      // Support multiple response shapes:
      // 1) Array directly
      // 2) { candles: [...] }
      // 3) { data: [...] }  <-- backend uses this
      const rawArray = Array.isArray(data)
        ? data
        : data.candles ?? data.data ?? [];

      // Normalize each candle to our internal CandleData shape
      const toNumber = (v: unknown) => Number(String(v ?? 'NaN'));

      const candleArray = (rawArray as Array<Record<string, unknown>>)
        .map((c) => {
          const time = (c['timestamp'] ?? c['time'] ?? c['timeframeTimestamp'] ?? null) as unknown;
          let ts = typeof time === 'number' ? (time as number) : toNumber(time);
          if (ts && ts < 1e12) ts = ts * 1000; // assume seconds -> ms

          const open = toNumber(c['open'] ?? c['o']);
          const high = toNumber(c['high'] ?? c['h']);
          const low = toNumber(c['low'] ?? c['l']);
          const close = toNumber(c['close'] ?? c['c']);
          const volume = toNumber(c['volume'] ?? c['v'] ?? c['value']);

          if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
            return null;
          }

          return {
            open,
            high,
            low,
            close,
            volume,
            timestamp: ts || Date.now(),
            isClosed: (c['isClosed'] as boolean) ?? true,
          } as CandleData;
        })
        .filter((x): x is CandleData => x !== null);

      setCandles(candleArray);

      if (candleArray.length > 0) {
        setCurrentCandle(candleArray[candleArray.length - 1]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[useCandlestickData] Error loading historical data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, symbol, timeframe]);

  // Connect to socket and subscribe to real-time updates
  useEffect(() => {
    if (!autoConnect) return;

    // Connect to kline socket (default namespace /)
    connect();

    // Subscribe to symbol + timeframe
    const unsubscribe = subscribe(klineTopicId, timeframe, (newCandle) => {
      console.log(`[useCandlestickData] New kline received for ${klineTopicId}:`, newCandle);

      // Update current candle
      setCurrentCandle(newCandle);

      // Update candles array
      setCandles((prev) => {
        const lastCandle = prev[prev.length - 1];

        // If this is a new candle (different timestamp), append it
        if (lastCandle && newCandle.timestamp !== lastCandle.timestamp) {
          return [...prev, newCandle];
        }

        // If same timestamp, update the last candle (update in progress)
        if (lastCandle && newCandle.timestamp === lastCandle.timestamp) {
          return [...prev.slice(0, -1), newCandle];
        }

        // First candle
        return [newCandle];
      });
    });

    return unsubscribe;
  }, [klineTopicId, timeframe, autoConnect, connect, subscribe]);

  // Load initial data on mount
  useEffect(() => {
    if (autoLoad) {
      loadHistoricalData();
    }
  }, [symbol, timeframe, autoLoad, loadHistoricalData]);

  // Listen to real-time updates via klineData from store
  useEffect(() => {
    const realtimeCandle = klineData[buildKlineStoreKey(klineTopicId, timeframe)];

    if (realtimeCandle) {
      setCurrentCandle(realtimeCandle);

      // Update candles array if this is a new candle
      setCandles((prev) => {
        const lastCandle = prev[prev.length - 1];

        if (lastCandle && realtimeCandle.timestamp !== lastCandle.timestamp) {
          return [...prev, realtimeCandle];
        }

        if (lastCandle && realtimeCandle.timestamp === lastCandle.timestamp) {
          return [...prev.slice(0, -1), realtimeCandle];
        }

        return [realtimeCandle];
      });
    }
  }, [klineData, klineTopicId, timeframe]);

  return {
    candles,
    isLoading,
    isConnected,
    error,
    currentCandle,
    onCandleUpdate: (callback: (candle: CandleData) => void) => {
      // The kline store emits candles with a slightly different shape.
      type KlineCandle = {
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
        timestamp: number;
        isClosed?: boolean;
      };

      const wrapper = (c: KlineCandle) => {
        const mapped: CandleData = {
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume ?? 0,
          timestamp: c.timestamp,
          isClosed: c.isClosed ?? true,
        };
        callback(mapped);
      };

      subscribe(klineTopicId, timeframe, wrapper);
      return () => {
        try {
          unsubscribe(klineTopicId, timeframe, wrapper);
        } catch {
          // ignore
        }
      };
    },
  };
};
