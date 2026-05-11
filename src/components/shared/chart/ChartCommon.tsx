'use client';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import SplashLogo from '@/components/shared/SplashLogo';
import { API_CHART_URL } from '@/constants/env';
import { useGetData } from '@/context/GetdataContext';
import { useInfiniteOrders } from '@/hook/useOrder';
import { useInfinitePositions } from '@/hook/usePosition';
import { buildKlineStoreKey, useKlineSocketStore } from '@/store/klineSocketStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import { formatQuantity } from '@/utils/currency';
import { useAppStore } from '@/store/useAppStore';
import { normalizeToSupportedLanguage } from '@/i18n';
import { ORDER_SIDES, type GetOrdersResponse, type OrderItem } from '@/types/orders';
import { candlesArrayFromMarketDataFetch } from '@/types/swagger';
import { Position } from '@/types/position';
import type {
  Asset,
  TradingViewChart,
  TradingViewDatafeedConfiguration,
  TradingViewHistoryMetadata,
  TradingViewOrderLine,
  TradingViewPeriodParams,
  TradingViewSearchResult,
  TradingViewStudy,
  TradingViewSymbolInfo,
  TradingViewWidget,
} from './types/types';

interface TradingViewNamespace {
  widget: new (config: TradingViewWidgetConfig) => TradingViewWidget;
}

interface TradingViewWidgetConfig {
  symbol: string;
  interval: string;
  container_id: string;
  datafeed: HttpDatafeed;
  library_path: string;
  custom_css_url: string;
  theme: string;
  locale: string;
  autosize: boolean;
  timezone: string;
  time_scale: {
    min_bar_spacing: number;
    right_offset?: number;
  };
  disabled_features: string[];
  enabled_features: string[];
  hide_top_toolbar: boolean;
  hide_side_toolbar: boolean;
  withdateranges: boolean;
  overrides: Record<string, unknown>;
}

type TvBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type LatestKlineApiRow = {
  timestamp?: number;
  time?: number;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume?: number | string;
};

function tradingViewPricescaleFromDigits(digits: number): number {
  const d = Math.min(Math.max(Math.floor(digits), 0), 8);
  return 10 ** d;
}

function toFiniteNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isValidPrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

class HttpDatafeed {
  private readonly baseUrl: string;
  private symbol: string;
  private readonly getAssets?: () => Asset[] | undefined;
  private initialChartHistoryLoadedByResolution: Record<string, boolean> = {};
  private firstHistoryBarDeferred: Record<
    string,
    { promise: Promise<TvBar | null>; resolve: (v: TvBar | null) => void }
  > = {};
  private historyPaginationUnlocked = false;
  private subscribers: Record<
    string,
    {
      resolutionSeconds: number;
      onRealtimeCallback: (bar: TvBar) => void;
      lastBar?: TvBar;
    }
  > = {};

  /** Latest kline per resolution (seconds) when TV has not registered realtime subs yet or lastBar unset */
  private latestKlineBarByResolution: Record<string, TvBar> = {};

  constructor(baseUrl: string, symbol: string | undefined, getAssets?: () => Asset[] | undefined) {
    this.baseUrl = baseUrl;
    this.symbol = symbol ?? '';
    this.getAssets = getAssets;
  }

  setSymbol(nextSymbol: string) {
    const normalizedNext = String(nextSymbol ?? '').trim();
    if (normalizedNext === this.symbol) return;
    this.symbol = normalizedNext;
    this.initialChartHistoryLoadedByResolution = {};
    this.firstHistoryBarDeferred = {};
    this.historyPaginationUnlocked = false;
    this.subscribers = {};
    this.latestKlineBarByResolution = {};
  }

  private ensureFirstHistoryDeferred(resolutionKey: string) {
    if (!this.firstHistoryBarDeferred[resolutionKey]) {
      let resolve!: (v: TvBar | null) => void;
      const promise = new Promise<TvBar | null>((r) => {
        resolve = r;
      });
      this.firstHistoryBarDeferred[resolutionKey] = { promise, resolve };
    }
    return this.firstHistoryBarDeferred[resolutionKey];
  }

  private resolveFirstHistoryBar(resolutionKey: string, bar: TvBar | null) {
    this.ensureFirstHistoryDeferred(resolutionKey).resolve(bar);
  }

  waitForFirstHistoryBar(resolutionSeconds: number): Promise<TvBar | null> {
    return this.ensureFirstHistoryDeferred(String(resolutionSeconds)).promise;
  }

  unlockHistoryPagination() {
    this.historyPaginationUnlocked = true;
  }

  onReady(callback: (config: TradingViewDatafeedConfiguration) => void) {
    const configuration: TradingViewDatafeedConfiguration = {
      supported_resolutions: ['1', '5', '15', '60', '240', 'D'],
      supports_search: true,
    };
    setTimeout(() => callback(configuration), 0);
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: TradingViewSymbolInfo) => void,
    onResolveErrorCallback: (reason: string) => void,
  ) {
    try {
      const assets = this.getAssets?.() ?? [];
      const asset = assets.find((a) => String(a?.symbol ?? '') === symbolName);
      const digitCount = Math.min(Math.max(asset?.digit ?? 5, 0), 8);
      const pricescale = tradingViewPricescaleFromDigits(digitCount);

      const symbolInfo: TradingViewSymbolInfo = {
        name: symbolName,
        ticker: symbolName,
        full_name: symbolName,
        description: symbolName,
        type: 'forex',
        session: '24x7',
        timezone: 'Etc/UTC',
        minmov: 1,
        pricescale,
        has_intraday: true,
        visible_plots_set: 'ohlcv',
        supported_resolutions: ['1', '5', '15', '60', '240', 'D'],
        volume_precision: 2,
        data_status: 'streaming',
      };

      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch (error) {
      console.error('resolveSymbol error', error);
      onResolveErrorCallback('resolveSymbol error');
    }
  }

  searchSymbols(
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResultReadyCallback: (results: TradingViewSearchResult[]) => void,
  ) {
    try {
      const q = (userInput ?? '').trim().toLowerCase();
      const assets = this.getAssets?.() ?? [];

      const results: TradingViewSearchResult[] = (Array.isArray(assets) ? assets : [])
        .filter((a: Asset) => {
          if (!q) return true;
          const symbol = String(a?.symbol ?? '').toLowerCase();
          const name = String(a?.name ?? a?.description ?? '').toLowerCase();
          return symbol.includes(q) || name.includes(q);
        })
        .slice(0, 50)
        .map((a: Asset): TradingViewSearchResult => {
          const symbol = String(a?.symbol ?? '');
          const name = String(a?.name ?? a?.description ?? symbol);
          const categoryCode = String(a?.category?.code ?? '').toUpperCase();
          return {
            symbol,
            ticker: symbol,
            full_name: symbol,
            description: name,
            exchange: categoryCode || 'ALL',
            type: 'forex',
          };
        });

      onResultReadyCallback(results);
    } catch (error) {
      console.error('searchSymbols error', error);
      onResultReadyCallback([]);
    }
  }

  private resolutionToSeconds(resolution: string): number {
    const r = String(resolution ?? '')
      .trim()
      .toUpperCase();
    if (r === 'D' || r === '1D') return 86400;
    const num = Number.parseInt(resolution, 10);
    if (!Number.isFinite(num) || num <= 0) return 60;
    return num * 60;
  }

  async getBars(
    _symbolInfo: TradingViewSymbolInfo,
    resolution: string,
    periodParams: TradingViewPeriodParams,
    onHistoryCallback: (bars: TvBar[], meta: TradingViewHistoryMetadata) => void,
    onErrorCallback: (error: string) => void,
  ) {
    try {
      const firstReq = periodParams?.firstDataRequest as boolean | undefined;
      const timeframeSeconds = this.resolutionToSeconds(resolution);
      const resolutionKey = String(timeframeSeconds);

      const getResolutionEnum = (seconds: number) => {
        if (seconds <= 60) return '1m';
        if (seconds <= 300) return '5m';
        if (seconds <= 900) return '15m';
        if (seconds <= 3600) return '1h';
        if (seconds <= 14400) return '4h';
        if (seconds <= 86400) return '1d';
        return '1w';
      };

      if (firstReq === true && !this.initialChartHistoryLoadedByResolution[resolutionKey]) {
        try {
          const nowSec = Math.floor(Date.now() / 1000);
          // TradingView passes periodParams.from/to for the *visible* slice. On remount that
          // window can be as tight as the current bar, so the candles API returns one bar and
          // older candles disappear. Always load a full back-history on the first request; TV
          // will pan/zoom to the right edge.
          const fromTs = nowSec - 365 * 86400;
          const toTs = Math.max(nowSec, Number(periodParams?.to) || 0);

          const assets = this.getAssets?.() ?? [];
          const asset = assets.find((a) => String(a?.symbol ?? '') === this.symbol);
          const effectiveAssetId = asset?.id || this.symbol;

          const params = new URLSearchParams({
            assetId: effectiveAssetId,
            resolution: getResolutionEnum(timeframeSeconds),
            from: new Date(fromTs * 1000).toISOString(),
            to: new Date(toTs * 1000).toISOString(),
          });
          const url = `/api/market-data/candles?${params.toString()}`;

          const res = await fetch(url);
          if (!res.ok) throw new Error(String(res.status));

          const responseData = await res.json();
          const candles = candlesArrayFromMarketDataFetch(responseData) as Record<
            string,
            unknown
          >[];

          let bars: TvBar[] = candles
            .map((k): TvBar | null => {
              let time = Number(k.time ?? k.timestamp);
              time = time < 1e12 ? time * 1000 : time;
              const open = toFiniteNumber(k.open as number);
              const high = toFiniteNumber(k.high as number);
              const low = toFiniteNumber(k.low as number);
              const close = toFiniteNumber(k.close as number);
              const volume = toFiniteNumber(k.volume as number);
              
              if (
                !Number.isFinite(time) ||
                open == null ||
                high == null ||
                low == null ||
                close == null
              ) {
                return null;
              }
              return {
                time,
                open,
                high,
                low,
                close,
                ...(volume != null ? { volume } : null),
              };
            })
            .filter((b): b is TvBar => b !== null);

          bars = [...bars].sort((a, b) => a.time - b.time);

          if (!bars.length) {
            this.resolveFirstHistoryBar(resolutionKey, null);
            onHistoryCallback([], { noData: true });
            return;
          }

          this.initialChartHistoryLoadedByResolution[resolutionKey] = true;
          this.resolveFirstHistoryBar(resolutionKey, bars[bars.length - 1]);
          onHistoryCallback(bars, { noData: false });
        } catch (error) {
          console.error('getBars error', error);
          this.resolveFirstHistoryBar(resolutionKey, null);
          onErrorCallback((error as Error).message ?? 'getBars error');
        }
        return;
      }

      if (!this.historyPaginationUnlocked) {
        onHistoryCallback([], { noData: false });
        return;
      }

      const fromTs = periodParams?.from as number | undefined;
      const toTs = periodParams?.to as number | undefined;

      const assets = this.getAssets?.() ?? [];
      const asset = assets.find((a) => String(a?.symbol ?? '') === this.symbol);
      const effectiveAssetId = asset?.id || this.symbol;

      const params = new URLSearchParams({
        assetId: effectiveAssetId,
        resolution: getResolutionEnum(timeframeSeconds),
        from: fromTs != null ? new Date(fromTs * 1000).toISOString() : new Date((Math.floor(Date.now() / 1000) - 30 * 86400) * 1000).toISOString(),
        to: toTs != null ? new Date(toTs * 1000).toISOString() : new Date().toISOString(),
      });
      const url = `/api/market-data/candles?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));

      const responseData = await res.json();
      const candles = candlesArrayFromMarketDataFetch(responseData) as Record<
        string,
        unknown
      >[];

      let bars: TvBar[] = candles
        .map((k): TvBar | null => {
          let time = Number(k.time ?? k.timestamp);
          time = time < 1e12 ? time * 1000 : time;
          const open = toFiniteNumber(k.open as number);
          const high = toFiniteNumber(k.high as number);
          const low = toFiniteNumber(k.low as number);
          const close = toFiniteNumber(k.close as number);
          const volume = toFiniteNumber(k.volume as number);
          
          if (
            !Number.isFinite(time) ||
            open == null ||
            high == null ||
            low == null ||
            close == null
          ) {
            return null;
          }
          return {
            time,
            open,
            high,
            low,
            close,
            ...(volume != null ? { volume } : null),
          };
        })
        .filter((b): b is TvBar => b !== null);

      bars = [...bars].sort((a, b) => a.time - b.time);

      if (fromTs != null && toTs != null && Number.isFinite(fromTs) && Number.isFinite(toTs)) {
        const fromMs = fromTs * 1000;
        const toMs = toTs * 1000;
        const inWindow = bars.filter((b) => b.time >= fromMs && b.time <= toMs);
        const keepClip =
          inWindow.length > 0 &&
          inWindow.length >= Math.min(bars.length, Math.max(3, Math.floor(bars.length * 0.4)));
        if (keepClip) {
          bars = inWindow;
        }
      }

      if (!bars.length) {
        onHistoryCallback([], { noData: true });
        return;
      }

      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.error('getBars error', error);
      onErrorCallback((error as Error).message ?? 'getBars error');
    }
  }

  subscribeBars(
    _symbolInfo: TradingViewSymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: TvBar) => void,
    subscriberUID: string,
  ) {
    const timeframeSeconds = this.resolutionToSeconds(resolution);

    this.subscribers[subscriberUID] = {
      resolutionSeconds: timeframeSeconds,
      onRealtimeCallback,
    };

    void (async () => {
      try {
        const bar = await this.waitForFirstHistoryBar(timeframeSeconds);
        if (!bar) return;

        const sub = this.subscribers[subscriberUID];
        if (!sub) return;
        sub.lastBar = bar;
        sub.onRealtimeCallback(bar);

        const key = String(timeframeSeconds);
        const pending = this.latestKlineBarByResolution[key];
        if (pending && pending.time >= bar.time) {
          sub.lastBar = pending;
          sub.onRealtimeCallback(pending);
        }
      } catch (error) {
        console.error('subscribeBars seed error', error);
      }
    })();
  }

  unsubscribeBars(subscriberUID: string) {
    delete this.subscribers[subscriberUID];
  }

  updateWithPrice(price: number, timeMs: number = Date.now()) {
    if (!Number.isFinite(price)) return;

    for (const sub of Object.values(this.subscribers)) {
      const bucketMs = sub.resolutionSeconds * 1000;
      const barTime = Math.floor(timeMs / bucketMs) * bucketMs;

      const last = sub.lastBar;
      let next: TvBar;

      if (!last || barTime > last.time) {
        next = {
          time: barTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: last?.volume ?? 0,
        };
      } else {
        next = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
        };
      }

      sub.lastBar = next;
      sub.onRealtimeCallback(next);
    }
  }

  /** Push server kline OHLCV into TradingView realtime stream (matches `timeframe` in seconds). */
  updateWithKlineBar(
    resolutionSeconds: number,
    candle: {
      open: number;
      high: number;
      low: number;
      close: number;
      volume?: number;
      timestamp: number;
    },
  ) {
    if (!Number.isFinite(resolutionSeconds) || resolutionSeconds <= 0) return;

    const { open, high, low, close, volume, timestamp } = candle;
    if (![open, high, low, close].every((n) => Number.isFinite(n))) return;

    let tsMs = timestamp;
    if (tsMs < 1e12) tsMs = tsMs * 1000;
    if (!Number.isFinite(tsMs)) return;

    const bucketMs = resolutionSeconds * 1000;
    const barTime = Math.floor(tsMs / bucketMs) * bucketMs;

    const next: TvBar = {
      time: barTime,
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    };
    this.latestKlineBarByResolution[String(resolutionSeconds)] = next;

    for (const sub of Object.values(this.subscribers)) {
      if (sub.resolutionSeconds !== resolutionSeconds) continue;

      const last = sub.lastBar;
      if (last && barTime < last.time) {
        continue;
      }

      if (!last) {
        continue;
      }

      const merged: TvBar =
        barTime > last.time
          ? next
          : {
              time: barTime,
              open,
              high,
              low,
              close,
              volume: volume ?? last.volume ?? 0,
            };

      sub.lastBar = merged;
      sub.onRealtimeCallback(merged);
    }
  }
}
const INITIAL_CHART_HISTORY_BARS = 360;
const MAX_HISTORY_BARS_PER_REQUEST = 1000;

const CHART_BAR_SPACING_MIN = 2;
const CHART_BAR_SPACING_MAX = 50;
/** Default bar spacing on load — higher = fewer candles visible = more zoomed in */
const CHART_DEFAULT_BAR_SPACING = 4.5;
const CHART_MAX_FUTURE_BARS = 3;

const CHART_CANDLE_UP = '#12b76a';
const CHART_CANDLE_DOWN = '#f04438';

type StoredStudy = { name: string; isOverlay: boolean };
type StoredStudiesPayload =
  | StoredStudy[]
  | {
      studies?: StoredStudy[];
      timeframe?: number;
      timeframeBySymbol?: Record<string, number>;
    };

function resolveDefaultTimeframe(isChartMini?: boolean) {
  return isChartMini ? 60 : 3600;
}

function parseTvResolutionToSeconds(resolution: unknown): number | null {
  const r = String(resolution ?? '')
    .trim()
    .toUpperCase();
  if (!r) return null;
  if (r === 'D' || r === '1D') return 86400;
  const num = Number.parseInt(r, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num * 60;
}

function timeframeSecondsToTvResolution(timeframeSeconds: number): string {
  if (timeframeSeconds >= 86400 && timeframeSeconds % 86400 === 0) return 'D';
  return String(Math.max(1, Math.floor(timeframeSeconds / 60)));
}

function normalizeSymbolKey(symbol: string): string {
  return String(symbol ?? '')
    .trim()
    .toUpperCase();
}

function getStoredTradeScreenTimeframe(symbol: string, defaultTimeframe: number): number {
  if (typeof window === 'undefined') return defaultTimeframe;
  try {
    const raw = localStorage.getItem('tv_studies:trade_screen');
    if (!raw) return defaultTimeframe;
    const parsed = JSON.parse(raw) as StoredStudiesPayload;
    if (Array.isArray(parsed)) return defaultTimeframe;
    const symbolKey = normalizeSymbolKey(symbol);
    const tfBySymbol = parsed?.timeframeBySymbol?.[symbolKey];
    const tfFromSymbol = Number(tfBySymbol);
    if (Number.isFinite(tfFromSymbol) && tfFromSymbol > 0) {
      return tfFromSymbol;
    }
    const tf = Number(parsed?.timeframe);
    return Number.isFinite(tf) && tf > 0 ? tf : defaultTimeframe;
  } catch {
    return defaultTimeframe;
  }
}

function getStoredSymbolTimeframe(symbol: string, defaultTimeframe: number): number {
  if (typeof window === 'undefined') return defaultTimeframe;
  const symbolKey = normalizeSymbolKey(symbol);
  if (!symbolKey) return defaultTimeframe;

  try {
    const rawBySymbol = localStorage.getItem(`tv_studies:${symbolKey}`);
    if (rawBySymbol) {
      const parsedBySymbol = JSON.parse(rawBySymbol) as StoredStudiesPayload;
      if (!Array.isArray(parsedBySymbol)) {
        const tf = Number(parsedBySymbol?.timeframe);
        if (Number.isFinite(tf) && tf > 0) return tf;
      }
    }
  } catch {}

  return getStoredTradeScreenTimeframe(symbol, defaultTimeframe);
}

function ChartCommon({
  isTradeScreen = false,
  ohlcCb,
  setSymbol,
  symbol,
  isChartMini,
  isPositionPanelExpanded,
}: {
  readonly isChartMini?: boolean;
  readonly isTradeScreen?: boolean;
  readonly ohlcCb?: (ohlc: { close: number; high: number; low: number; open: number }) => void;
  readonly setSymbol?: (sym: string) => void;
  readonly symbol: string;
  readonly isPositionPanelExpanded?: boolean;
}) {
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [ohlc, setOhlc] = useState({ close: 0, high: 0, low: 0, open: 0 });
  useEffect(() => {
    setCurrentSymbol((prev) => (prev === symbol ? prev : symbol));
  }, [symbol]);
  const subscribe = useKlineSocketStore((s) => s.subscribe);
  const unsubscribe = useKlineSocketStore((s) => s.unsubscribe);
  const bid = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.bid);
  const ask = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.ask);
  const bidNumber = toFiniteNumber(bid as number | string | null | undefined);
  const askNumber = toFiniteNumber(ask as number | string | null | undefined);
  const [isKlineClosed, setIsKlineClosed] = useState(false);
  const isMarketClosedOrPaused = (bid == null && ask == null) || isKlineClosed;
  const [isChartReady, setIsChartReady] = useState(false);
  const defaultTimeframe = resolveDefaultTimeframe(isChartMini);
  const [timeframe, setTimeframe] = useState<number>(() =>
    getStoredSymbolTimeframe(symbol, defaultTimeframe),
  );
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const paginationUnlockAcRef = useRef<AbortController | null>(null);
  const [tvWidget, setTvWidget] = useState<TradingViewWidget | null>(null);
  const tvContainerIdRef = useRef(`tv_chart_container_${Math.random().toString(36).slice(2, 10)}`);
  const tvInitIdRef = useRef(0);
  const chartRef = useRef<TradingViewChart | null>(null);
  const [isTvChartReady, setIsTvChartReady] = useState(false);
  const appliedTvSymbolRef = useRef<string>('');
  const appliedTvResolutionRef = useRef<string>('');
  const miniIndicatorStorageKeyRef = useRef<string>('');
  const lastNonOverlayStudyIdRef = useRef<string | null>(null);
  const datafeedRef = useRef<HttpDatafeed | null>(null);
  const bidLineRef = useRef<TradingViewOrderLine | null>(null);
  const askLineRef = useRef<TradingViewOrderLine | null>(null);
  const lastBidRef = useRef<number | null>(null);
  const lastAskRef = useRef<number | null>(null);
  const orderLineCreateQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastKlineCloseRef = useRef<number | null>(null);
  const positionLinesRef = useRef<Record<string, TradingViewOrderLine>>({});
  const orderLinesRef = useRef<Record<string, TradingViewOrderLine>>({});
  const lastPositionsRef = useRef<Record<string, Position[]>>({});
  const lastOrdersRef = useRef<Record<string, OrderItem[]>>({});
  const studiesAutosaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const activeAccount = selectedAccount;
  const shouldFetchTradeData = Boolean(isChartReady && activeAccount?.id && currentSymbol);
  const { assets: contextAssets } = useGetData();
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';
  const appLanguage = useAppStore((s) => s.language);
  const tvLocale = normalizeToSupportedLanguage(appLanguage);
  const assetsRef = useRef<Asset[] | undefined>(contextAssets);
  const [hasInitialOhlc, setHasInitialOhlc] = useState(false);

  useEffect(() => {
    assetsRef.current = contextAssets;
  }, [contextAssets]);

  useEffect(() => {
    const next = getStoredSymbolTimeframe(currentSymbol, defaultTimeframe);
    setTimeframe((prev) => (prev === next ? prev : next));
  }, [currentSymbol, defaultTimeframe]);

  useEffect(() => {
    if (!isTradeScreen) return;
    if (typeof window === 'undefined') return;
    try {
      const key = 'tv_studies:trade_screen';
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as StoredStudiesPayload) : null;
      const symbolKey = normalizeSymbolKey(currentSymbol);
      const prevBySymbol =
        parsed && !Array.isArray(parsed) && parsed.timeframeBySymbol
          ? parsed.timeframeBySymbol
          : {};

      const nextBySymbol = {
        ...prevBySymbol,
        [symbolKey]: timeframe,
      };

      const nextPayload = Array.isArray(parsed)
        ? { studies: parsed, timeframe, timeframeBySymbol: nextBySymbol }
        : {
            studies: parsed?.studies ?? [],
            timeframe,
            timeframeBySymbol: nextBySymbol,
          };

      localStorage.setItem(key, JSON.stringify(nextPayload));
    } catch {}
  }, [isTradeScreen, currentSymbol, timeframe]);

  const { data: dataOrder } = useInfiniteOrders({
    accountId: shouldFetchTradeData ? activeAccount?.id || '' : '',
    symbol: shouldFetchTradeData ? currentSymbol : '',
  });

  const ordersData: OrderItem[] = useMemo(
    () => dataOrder?.pages.flatMap((page: { data: OrderItem[] }) => page.data) || [],
    [dataOrder],
  );

  const { data: dataPositions } = useInfinitePositions({
    accountId: shouldFetchTradeData ? activeAccount?.id || '' : '',
    symbol: shouldFetchTradeData ? currentSymbol : '',
  });

  const apiPositions: Position[] = useMemo(
    () => dataPositions?.pages.flatMap((page: { data: Position[] }) => page.data) || [],
    [dataPositions],
  );

  const ordersList: OrderItem[] = Array.isArray(ordersData)
    ? ordersData
    : ((ordersData as GetOrdersResponse | undefined)?.data ?? []);
  const currentSymbolOrdersRaw = useMemo(
    () => ordersList.filter((o) => o.symbol === currentSymbol),
    [ordersList, currentSymbol],
  );

  const currentSymbolPositionsRaw = useMemo(
    () => apiPositions?.filter((p) => p.symbol === currentSymbol) ?? [],
    [apiPositions, currentSymbol],
  );

  const positionsForChart =
    isMarketClosedOrPaused && currentSymbol
      ? (lastPositionsRef.current[currentSymbol] ?? currentSymbolPositionsRaw)
      : currentSymbolPositionsRaw;

  const ordersForChart =
    isMarketClosedOrPaused && currentSymbol
      ? (lastOrdersRef.current[currentSymbol] ?? currentSymbolOrdersRaw)
      : currentSymbolOrdersRaw;

  useEffect(() => {
    if (isValidPrice(bidNumber)) lastBidRef.current = bidNumber;
  }, [bidNumber]);

  useEffect(() => {
    if (isValidPrice(askNumber)) lastAskRef.current = askNumber;
  }, [askNumber]);

  useEffect(() => {
    if (!currentSymbol) return;
    if (!isMarketClosedOrPaused) {
      lastPositionsRef.current[currentSymbol] = currentSymbolPositionsRaw;
    }
  }, [currentSymbol, isMarketClosedOrPaused, currentSymbolPositionsRaw]);

  useEffect(() => {
    if (!currentSymbol) return;
    if (!isMarketClosedOrPaused) {
      lastOrdersRef.current[currentSymbol] = currentSymbolOrdersRaw;
    }
  }, [currentSymbol, isMarketClosedOrPaused, currentSymbolOrdersRaw]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.TradingView) {
      setIsChartReady(true);
      return;
    }

    const scriptId = 'tradingview-charting-library-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (!isMountedRef.current) return;
      setIsChartReady(true);
    };

    if (existingScript) {
      if (existingScript.getAttribute('data-loaded') === 'true') {
        handleLoaded();
      } else {
        existingScript.addEventListener('load', handleLoaded);
      }
      return () => {
        existingScript.removeEventListener('load', handleLoaded);
      };
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '/tradingview/charting_library.standalone.js';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      handleLoaded();
    };
    script.onerror = () => {
      console.error('Failed to load TradingView charting_library script');
      if (!isMountedRef.current) return;
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [setIsChartReady]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isChartReady) return;
    if (!window.TradingView) return;

    const container = chartContainerRef.current;
    if (!container) return;

    const tvSymbol = currentSymbol ?? '';

    const widgetContainerId = tvContainerIdRef.current;
    container.id = widgetContainerId;
    setIsTvChartReady(false);
    container.innerHTML = '';

    let widget: TradingViewWidget | null = null;
    const initId = (tvInitIdRef.current += 1);
    try {
      const datafeed = new HttpDatafeed(
        API_CHART_URL ?? '',
        tvSymbol || '',
        () => assetsRef.current,
      );
      datafeedRef.current = datafeed;

      const disabledFeaturesBase = ['vert_touch_drag_scroll'];

      const disabled_features = isChartMini
        ? [
            ...disabledFeaturesBase,
            'header_widget',
            'left_toolbar',
            'timeframes_toolbar',
            'header_symbol_search',
            'header_resolutions',
            'header_undo_redo',
            'header_saveload',
          ]
        : [
            ...disabledFeaturesBase,
            'timeframes_toolbar',
            'header_symbol_search',
            'header_undo_redo',
            'header_compare',
            'header_screenshot',
          ];

      const enabled_features = isChartMini
        ? ['fix_right_edge']
        : ['hide_left_toolbar_by_default', 'fix_right_edge'];

      const upColor = CHART_CANDLE_UP;
      const downColor = CHART_CANDLE_DOWN;
      const isDarkTheme = mode === 'dark';
      const tvTheme = isDarkTheme ? 'Dark' : 'Light';
      const chartVisualOverrides = isDarkTheme
        ? {
            'paneProperties.backgroundType': 'solid',
            'paneProperties.background': '#0D0C0C',
            'paneProperties.backgroundGradientStartColor': '#0D0C0C',
            'paneProperties.backgroundGradientEndColor': '#0D0C0C',
            'paneProperties.vertGridProperties.color': '#1f2937',
            'paneProperties.horzGridProperties.color': '#1f2937',
            'scalesProperties.backgroundColor': '#0D0C0C',
            'scalesProperties.textColor': '#e5e7eb',
          }
        : {
            'paneProperties.backgroundType': 'solid',
            'paneProperties.background': '#ffffff',
            'paneProperties.backgroundGradientStartColor': '#ffffff',
            'paneProperties.backgroundGradientEndColor': '#ffffff',
            'paneProperties.vertGridProperties.color': '#f1f5f9',
            'paneProperties.horzGridProperties.color': '#f1f5f9',
            'scalesProperties.backgroundColor': '#ffffff',
            'scalesProperties.textColor': '#111827',
          };

      widget = new (window.TradingView as TradingViewNamespace).widget({
        symbol: tvSymbol,
        interval: timeframeSecondsToTvResolution(timeframe),
        container_id: widgetContainerId,
        datafeed,
        library_path: '/tradingview/',
        custom_css_url: '/tradingview/custom-overrides.css',
        theme: tvTheme,
        locale: tvLocale,
        autosize: true,
        timezone: 'Etc/UTC',
        time_scale: {
          min_bar_spacing: CHART_BAR_SPACING_MIN,
          right_offset: CHART_MAX_FUTURE_BARS,
        },
        disabled_features,
        enabled_features,
        hide_top_toolbar: Boolean(isChartMini),
        hide_side_toolbar: Boolean(isChartMini),
        withdateranges: true,
        overrides: {
          ...chartVisualOverrides,
          ...(upColor
            ? {
                'mainSeriesProperties.candleStyle.upColor': upColor,
                'mainSeriesProperties.candleStyle.borderUpColor': upColor,
                'mainSeriesProperties.candleStyle.wickUpColor': upColor,
              }
            : null),
          ...(downColor
            ? {
                'mainSeriesProperties.candleStyle.downColor': downColor,
                'mainSeriesProperties.candleStyle.borderDownColor': downColor,
                'mainSeriesProperties.candleStyle.wickDownColor': downColor,
              }
            : null),
          'mainSeriesProperties.showPriceLine': false,
          'mainSeriesProperties.priceAxisProperties.alignLabels': false,
          'scalesProperties.showSeriesLastValue': false,
          'scalesProperties.showRightScalePriceLabels': false,
          'scalesProperties.showStudyLastValue': false,
          'scalesProperties.showStudyPlotLabels': false,
          'paneProperties.legendProperties.showLegend': true,
          'paneProperties.legendProperties.showSeriesTitle': true,
          'paneProperties.legendProperties.showSeriesOHLC': true,
          'paneProperties.legendProperties.showStudyTitles': true,
          'paneProperties.legendProperties.showStudyArguments': true,
          'paneProperties.legendProperties.showStudyValues': true,
          'paneProperties.legendProperties.showBarChange': true,
        },
      });

      widget.onChartReady(() => {
        if (tvInitIdRef.current !== initId) return;
        const widgetInstance = widget;
        if (!widgetInstance) return;
        const chart = widgetInstance.activeChart?.() ?? widgetInstance.chart?.();
        chartRef.current = chart ?? null;

        if (typeof window === 'undefined') return;
        if (!chart) return;

        paginationUnlockAcRef.current?.abort();
        const paginationAc = new AbortController();
        paginationUnlockAcRef.current = paginationAc;
        const chartHost = chartContainerRef.current;
        if (chartHost) {
          const unlockPagination = () => {
            datafeed.unlockHistoryPagination();
          };
          const disableTradingViewAnchors = () => {
            const anchors = chartHost.querySelectorAll('a[href*="tradingview.com"]');
            anchors.forEach((anchor) => {
              const node = anchor as HTMLAnchorElement;
              node.style.pointerEvents = 'none';
              node.style.cursor = 'default';
              node.setAttribute('tabindex', '-1');
              node.setAttribute('aria-disabled', 'true');
            });
          };
          const preventExternalNavigationOnChart = (event: Event) => {
            const target = event.target as HTMLElement | null;
            const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
            if (!anchor) return;
            const href = String(anchor.getAttribute('href') ?? '');
            if (!href) return;

            // Prevent TradingView attribution/logo from navigating out of app.
            if (href.includes('tradingview.com')) {
              event.preventDefault();
              event.stopPropagation();
              (
                event as Event & { stopImmediatePropagation?: () => void }
              ).stopImmediatePropagation?.();
            }
          };
          disableTradingViewAnchors();
          const tvAnchorObserver = new MutationObserver(() => {
            disableTradingViewAnchors();
          });
          tvAnchorObserver.observe(chartHost, { childList: true, subtree: true });
          paginationAc.signal.addEventListener('abort', () => tvAnchorObserver.disconnect(), {
            once: true,
          });
          chartHost.addEventListener('wheel', unlockPagination, {
            passive: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('pointerdown', unlockPagination, {
            passive: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('click', preventExternalNavigationOnChart, {
            capture: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('auxclick', preventExternalNavigationOnChart, {
            capture: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('mousedown', preventExternalNavigationOnChart, {
            capture: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('pointerdown', preventExternalNavigationOnChart, {
            capture: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('touchstart', preventExternalNavigationOnChart, {
            capture: true,
            passive: false,
            signal: paginationAc.signal,
          });
        }

        try {
          const onVisibleRangeChanged = chart.onVisibleRangeChanged?.();
          if (onVisibleRangeChanged?.subscribe) {
            const chartReadyAt = Date.now();
            let prevRangeFrom: number | null = null;
            const onVisibleRange = (range: { from: number; to: number }) => {
              if (!range || typeof range.from !== 'number') return;
              if (Date.now() - chartReadyAt < 800) {
                prevRangeFrom = range.from;
                return;
              }
              if (prevRangeFrom !== null && range.from < prevRangeFrom) {
                datafeed.unlockHistoryPagination();
              }
              prevRangeFrom = range.from;
            };
            onVisibleRangeChanged.subscribe(null, onVisibleRange);
          }
        } catch {}

        const mapTvSymbolToAppSymbol = (raw: string) => {
          const tvRaw = String(raw ?? '').trim();
          if (!tvRaw) return '';
          return tvRaw.includes(':') ? (tvRaw.split(':').at(-1) ?? tvRaw) : tvRaw;
        };

        try {
          const symbolChanged = chart.onSymbolChanged?.();
          if (symbolChanged?.subscribe) {
            symbolChanged.subscribe(null, (symbolInfo: TradingViewSymbolInfo) => {
              const incomingRaw = String(
                symbolInfo?.name ?? symbolInfo?.ticker ?? symbolInfo?.full_name ?? '',
              ).trim();
              const nextSymbol = mapTvSymbolToAppSymbol(incomingRaw);
              if (!nextSymbol) return;

              setCurrentSymbol((prev) => (prev === nextSymbol ? prev : nextSymbol));
              setSymbol?.(nextSymbol);
            });
          }
        } catch (error) {
          console.error('Failed to subscribe symbol changed event', error);
        }

        try {
          const timeScale = chart.getTimeScale?.();
          if (timeScale?.barSpacingChanged && timeScale.setBarSpacing && timeScale.barSpacing) {
            const clampBarSpacing = () => {
              const s = timeScale.barSpacing();
              if (typeof s !== 'number' || !Number.isFinite(s)) return;
              if (s < CHART_BAR_SPACING_MIN) timeScale.setBarSpacing(CHART_BAR_SPACING_MIN);
              else if (s > CHART_BAR_SPACING_MAX) timeScale.setBarSpacing(CHART_BAR_SPACING_MAX);
            };
            clampBarSpacing();
            timeScale.barSpacingChanged().subscribe(null, clampBarSpacing);
            try {
              const lo = CHART_BAR_SPACING_MIN;
              const hi = CHART_BAR_SPACING_MAX;
              const t = isChartMini ? 4 : CHART_DEFAULT_BAR_SPACING;
              timeScale.setBarSpacing(Math.max(lo, Math.min(t, hi)));
            } catch {}
          }

          if (timeScale?.setRightOffset && timeScale?.rightOffset) {
            const clampRightOffset = () => {
              const ro = timeScale.rightOffset?.();
              if (typeof ro !== 'number' || !Number.isFinite(ro)) return;
              if (ro > CHART_MAX_FUTURE_BARS) {
                timeScale.setRightOffset?.(CHART_MAX_FUTURE_BARS);
              }
            };
            clampRightOffset();
            timeScale.rightOffsetChanged?.().subscribe(null, clampRightOffset);
          }
        } catch {}

        try {
          if (widgetInstance) {
            widgetInstance.applyOverrides?.({
              ...chartVisualOverrides,
              'mainSeriesProperties.candleStyle.upColor': CHART_CANDLE_UP,
              'mainSeriesProperties.candleStyle.borderUpColor': CHART_CANDLE_UP,
              'mainSeriesProperties.candleStyle.wickUpColor': CHART_CANDLE_UP,
              'mainSeriesProperties.candleStyle.downColor': CHART_CANDLE_DOWN,
              'mainSeriesProperties.candleStyle.borderDownColor': CHART_CANDLE_DOWN,
              'mainSeriesProperties.candleStyle.wickDownColor': CHART_CANDLE_DOWN,
              'mainSeriesProperties.priceAxisProperties.alignLabels': false,
              'scalesProperties.showSeriesLastValue': false,
              'scalesProperties.showRightScalePriceLabels': false,
              'scalesProperties.showStudyLastValue': false,
              'scalesProperties.showStudyPlotLabels': false,
              'paneProperties.legendProperties.showLegend': true,
              'paneProperties.legendProperties.showSeriesTitle': true,
              'paneProperties.legendProperties.showSeriesOHLC': true,
              'paneProperties.legendProperties.showStudyTitles': true,
              'paneProperties.legendProperties.showStudyArguments': true,
              'paneProperties.legendProperties.showStudyValues': true,
              'paneProperties.legendProperties.showBarChange': true,
            });
          }
        } catch {}

        setIsTvChartReady(true);

        const studiesStorageKey = isTradeScreen
          ? `tv_studies:${normalizeSymbolKey(currentSymbol)}`
          : `tv_studies:${normalizeSymbolKey(currentSymbol)}`;
        const studiesStorageKeyFallback = isTradeScreen
          ? 'tv_studies:trade_screen'
          : `tv_studies:${tvSymbol}`;

        const safeGetAllStudies = (): TradingViewStudy[] => {
          try {
            const studies = chart.getAllStudies?.();
            if (!Array.isArray(studies)) return [];
            return studies.filter((s: TradingViewStudy) => s && typeof s.name === 'string');
          } catch {
            return [];
          }
        };

        const saveStudiesToStorage = () => {
          try {
            const studies = safeGetAllStudies()
              .filter((s) => Boolean(s?.name))
              .map(
                (s) =>
                  ({ name: String(s.name), isOverlay: Boolean(s.isOverlay) }) satisfies StoredStudy,
              );
            const payload = JSON.stringify({ studies, timeframe });
            localStorage.setItem(studiesStorageKey, payload);
          } catch {}
        };

        let saveTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleSaveStudies = () => {
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            saveTimer = null;
            saveStudiesToStorage();
          }, 250);
        };

        const restoreStudiesFromStorage = async () => {
          try {
            const stored =
              localStorage.getItem(studiesStorageKey) ??
              localStorage.getItem(studiesStorageKeyFallback);

            const defaultStudies: StoredStudy[] = [
              { name: 'Moving Average Triple', isOverlay: false },
            ];

            const raw = stored ?? JSON.stringify(defaultStudies);
            if (stored == null) {
              try {
                localStorage.setItem(
                  studiesStorageKey,
                  JSON.stringify({ studies: defaultStudies, timeframe }),
                );
              } catch {}
            }

            const parsedPayload = JSON.parse(raw) as StoredStudiesPayload;
            const parsed = Array.isArray(parsedPayload)
              ? parsedPayload
              : Array.isArray(parsedPayload?.studies)
                ? parsedPayload.studies
                : defaultStudies;

            const existing = safeGetAllStudies();
            const keyOf = (name: unknown, isOverlay: unknown) =>
              `${String(name)}|${Boolean(isOverlay)}`;

            const desiredSet = new Set(parsed.map((s) => keyOf(s?.name, s?.isOverlay)));

            for (const s of existing) {
              if (!s?.name || !s?.id) continue;
              const k = keyOf(s.name, s.isOverlay);
              if (desiredSet.has(k)) continue;
              try {
                chart.removeEntity?.(s.id);
              } catch {}
            }

            for (const st of parsed) {
              if (!st?.name) continue;
              const key = keyOf(st.name, st.isOverlay);
              const stillExists = safeGetAllStudies().some(
                (s) => Boolean(s?.name) && keyOf(s.name, s.isOverlay) === key,
              );
              if (stillExists) continue;
              try {
                await chart.createStudy?.(st.name, Boolean(st.isOverlay), false);
              } catch {}
            }
          } catch {}
        };

        let lastSavedPayload = '';
        const autosaveTick = () => {
          try {
            const studies = safeGetAllStudies()
              .filter((s) => Boolean(s?.name))
              .map(
                (s) =>
                  ({ name: String(s.name), isOverlay: Boolean(s.isOverlay) }) satisfies StoredStudy,
              );
            const payload = JSON.stringify({ studies, timeframe });
            if (payload === lastSavedPayload) return;
            lastSavedPayload = payload;
            localStorage.setItem(studiesStorageKey, payload);
          } catch {}
        };

        if (studiesAutosaveIntervalRef.current) {
          clearInterval(studiesAutosaveIntervalRef.current);
        }
        studiesAutosaveIntervalRef.current = setInterval(autosaveTick, 1000);

        void restoreStudiesFromStorage().finally(() => {
          scheduleSaveStudies();
          autosaveTick();
        });

        try {
          const intervalChanged = (
            chart as unknown as {
              onIntervalChanged?: () => {
                subscribe: (context: null, callback: (interval: unknown) => void) => void;
              };
            }
          ).onIntervalChanged?.();
          if (intervalChanged?.subscribe) {
            intervalChanged.subscribe(null, (nextResolution: unknown) => {
              const nextTimeframe = parseTvResolutionToSeconds(nextResolution);
              if (!nextTimeframe) return;
              setTimeframe((prev) => (prev === nextTimeframe ? prev : nextTimeframe));
            });
          }
        } catch (error) {
          console.error('Failed to subscribe interval changed event', error);
        }

        if (isChartMini) {
          miniIndicatorStorageKeyRef.current = isTradeScreen
            ? 'tv_single_bottom_study:trade_screen'
            : `tv_single_bottom_study:${currentSymbol}`;

          const safeGetNonOverlayStudies = (): TradingViewStudy[] => {
            try {
              const studies = chart.getAllStudies?.();
              if (!Array.isArray(studies)) return [];
              return studies.filter((s: TradingViewStudy) => s && s.isOverlay === false);
            } catch {
              return [];
            }
          };

          const safeRemoveStudy = (id: string | number | undefined) => {
            if (id == null) return;
            try {
              chart.removeEntity?.(id);
            } catch {}
          };

          const enforceSingleNonOverlayStudy = (preferredId?: string | number) => {
            const nonOverlay = safeGetNonOverlayStudies();
            if (nonOverlay.length <= 1) return;

            const keep =
              (preferredId != null
                ? nonOverlay.find((s) => String(s.id) === String(preferredId))
                : null) ?? nonOverlay.at(-1);

            nonOverlay.forEach((s) => {
              if (!keep) return;
              if (String(s.id) === String(keep.id)) return;
              safeRemoveStudy(s.id);
            });

            if (keep?.id != null) lastNonOverlayStudyIdRef.current = String(keep.id);
            if (keep?.name) {
              try {
                localStorage.setItem(miniIndicatorStorageKeyRef.current, keep.name);
              } catch {}
            }

            scheduleSaveStudies();
          };

          try {
            const existing = safeGetNonOverlayStudies();
            if (existing.length > 0) {
              enforceSingleNonOverlayStudy(existing.at(-1)?.id);
            } else {
              const saved = localStorage.getItem(miniIndicatorStorageKeyRef.current);
              if (saved) {
                try {
                  const createdIdPromise = chart.createStudy?.(saved, false, false);
                  if (createdIdPromise) {
                    void createdIdPromise.then((createdId) => {
                      enforceSingleNonOverlayStudy(createdId);
                    });
                  }
                } catch {}
              }
            }
          } catch {}

          try {
            const onStudyCreated = chart.onStudyCreated?.();
            if (onStudyCreated?.subscribe) {
              onStudyCreated.subscribe(null, (id: string | number) => {
                lastNonOverlayStudyIdRef.current = id != null ? String(id) : null;
                enforceSingleNonOverlayStudy(id);
                scheduleSaveStudies();
              });
            }
          } catch {}

          try {
            const onStudyRemoved = chart.onStudyRemoved?.();
            if (onStudyRemoved?.subscribe) {
              onStudyRemoved.subscribe(null, () => {
                scheduleSaveStudies();
              });
            }
          } catch {}
        }
      });

      setTvWidget(widget);
    } catch (error) {
      console.error('Failed to initialize TradingView widget', error);
    }

    return () => {
      try {
        if (widget && typeof widget.remove === 'function') widget.remove();
      } catch (error) {
        console.error('Error while disposing TradingView widget', error);
      } finally {
        paginationUnlockAcRef.current?.abort();
        paginationUnlockAcRef.current = null;
        if (studiesAutosaveIntervalRef.current) {
          clearInterval(studiesAutosaveIntervalRef.current);
          studiesAutosaveIntervalRef.current = null;
        }
        setIsTvChartReady(false);
        chartRef.current = null;
        datafeedRef.current = null;
        bidLineRef.current = null;
        askLineRef.current = null;
        positionLinesRef.current = {};
        orderLinesRef.current = {};
        setTvWidget(null);
      }
    };
  }, [isChartReady, isChartMini, mode, tvLocale, isTradeScreen]);

  useEffect(() => {
    if (!isTvChartReady) return;
    if (!currentSymbol) return;
    const chart = chartRef.current;
    if (!chart) return;

    const nextSymbol = String(currentSymbol).trim();
    if (!nextSymbol) return;
    const nextResolution = timeframeSecondsToTvResolution(timeframe);
    const symbolChanged = appliedTvSymbolRef.current !== nextSymbol;
    const resolutionChanged = appliedTvResolutionRef.current !== nextResolution;

    if (!symbolChanged && !resolutionChanged) return;

    if (symbolChanged) {
      datafeedRef.current?.setSymbol(nextSymbol);
      if (bidLineRef.current) {
        try {
          bidLineRef.current.remove?.();
        } catch {}
        bidLineRef.current = null;
      }
      if (askLineRef.current) {
        try {
          askLineRef.current.remove?.();
        } catch {}
        askLineRef.current = null;
      }
      lastBidRef.current = null;
      lastAskRef.current = null;
    }

    const afterApply = () => {
      appliedTvSymbolRef.current = nextSymbol;
      appliedTvResolutionRef.current = nextResolution;
    };

    if (symbolChanged && typeof chart.setSymbol === 'function') {
      try {
        chart.setSymbol(nextSymbol, () => {
          if (typeof chart.setResolution === 'function') {
            chart.setResolution(nextResolution, afterApply);
            return;
          }
          afterApply();
        });
      } catch (error) {
        console.error('Failed to update TradingView symbol', error);
      }
      return;
    }

    if (resolutionChanged && typeof chart.setResolution === 'function') {
      try {
        chart.setResolution(nextResolution, afterApply);
      } catch (error) {
        console.error('Failed to update TradingView resolution', error);
      }
      return;
    }

    afterApply();
  }, [currentSymbol, timeframe, isTvChartReady]);

  useEffect(() => {
    const df = datafeedRef.current;
    if (!df || !isValidPrice(bidNumber)) return;
    df.updateWithPrice(bidNumber);
  }, [bidNumber]);

  useEffect(() => {
    if (isPositionPanelExpanded === undefined) return;
    if (typeof window === 'undefined') return;
    if (!isTvChartReady) return;

    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [isPositionPanelExpanded, isTvChartReady]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Wait until TradingView has finished init (onChartReady) before seeding OHLC / subscribing
  // to kline. Otherwise, on client-side navigation the effect can run before the datafeed has
  // received its first getBars response — waitForFirstHistoryBar never completes, the splash
  // never clears, and kline subscription never runs until a full remount (reload).
  useEffect(() => {
    if (!isChartReady || !isTvChartReady) return;
    if (!currentSymbol) return;
    const symbol = currentSymbol;
    const assets = assetsRef.current ?? [];
    const asset = assets.find((a) => String(a?.symbol ?? '') === symbol);
    const klineTopicId = asset?.id ?? symbol;

    let cancelled = false;
    setIsKlineClosed(false);

    interface KlineUpdate {
      isClosed?: boolean;
      close: number | string;
      high: number | string;
      low: number | string;
      open: number | string;
      volume?: number | string;
      timestamp?: number;
    }

    const handleKlineUpdate = (candle: KlineUpdate) => {
      if (cancelled) return;

      if (!isMountedRef.current) return;

      if (typeof candle?.isClosed === 'boolean') {
        setIsKlineClosed(candle.isClosed);
      }

      const close = toFiniteNumber(candle.close);
      const high = toFiniteNumber(candle.high);
      const low = toFiniteNumber(candle.low);
      const open = toFiniteNumber(candle.open);
      const vol = toFiniteNumber(candle.volume);
      let ts = typeof candle.timestamp === 'number' ? candle.timestamp : Number.NaN;
      if (!Number.isFinite(ts)) {
        ts = Date.now();
      } else if (ts > 0 && ts < 1e12) {
        ts = ts * 1000;
      }

      setOhlc((prev) => ({
        close: close ?? prev.close,
        high: high ?? prev.high,
        low: low ?? prev.low,
        open: open ?? prev.open,
      }));
      if (close != null) {
        lastKlineCloseRef.current = close;
      }
      setHasInitialOhlc(true);

      const df = datafeedRef.current;
      if (!df) return;

      if (open != null && high != null && low != null && close != null) {
        df.updateWithKlineBar(timeframe, {
          open,
          high,
          low,
          close,
          ...(vol != null ? { volume: vol } : {}),
          timestamp: ts,
        });
      } else if (close != null) {
        df.updateWithPrice(close, ts);
      }
    };

    (async () => {
      try {
        const df = datafeedRef.current;
        if (!df) {
          console.error('ChartCommon: datafeed not ready for OHLC seed');
          return;
        }
        const latestBar = await df.waitForFirstHistoryBar(timeframe);
        if (cancelled) return;
        if (!latestBar) throw new Error('No candles');

        setOhlc({
          close: latestBar.close,
          high: latestBar.high,
          low: latestBar.low,
          open: latestBar.open,
        });
        if (Number.isFinite(latestBar.close)) {
          lastKlineCloseRef.current = latestBar.close;
        }
        setHasInitialOhlc(true);

        if (cancelled) return;
        subscribe(klineTopicId, timeframe, handleKlineUpdate);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe(klineTopicId, timeframe, handleKlineUpdate);
    };
  }, [timeframe, isChartReady, isTvChartReady, currentSymbol, subscribe, unsubscribe, tvWidget, contextAssets]);

  // If kline already updated the global store before this chart subscribed, replay once into the datafeed.
  useEffect(() => {
    if (!isChartReady || !isTvChartReady) return;
    if (!currentSymbol) return;
    const df = datafeedRef.current;
    if (!df) return;
    const assets = assetsRef.current ?? [];
    const asset = assets.find((a) => String(a?.symbol ?? '') === currentSymbol);
    const klineTopicId = asset?.id ?? currentSymbol;
    const key = buildKlineStoreKey(klineTopicId, timeframe);
    const candle = useKlineSocketStore.getState().klineData[key];
    if (!candle) return;
    const { open, high, low, close, volume, timestamp } = candle;
    if (![open, high, low, close].every((n) => Number.isFinite(n))) return;
    let ts = timestamp;
    if (ts > 0 && ts < 1e12) ts = ts * 1000;
    df.updateWithKlineBar(timeframe, {
      open,
      high,
      low,
      close,
      volume,
      timestamp: ts,
    });
  }, [isChartReady, isTvChartReady, currentSymbol, timeframe, tvWidget, contextAssets]);

  const createOrderLineWithRetry = useMemo(
    () =>
      async (chart: TradingViewChart): Promise<TradingViewOrderLine> => {
        const maxAttempts = 8;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            return await chart.createOrderLine();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const isRetryableNullError = /value is null/i.test(message);
            if (!isRetryableNullError || attempt === maxAttempts) {
              throw error;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 120 * attempt));
          }
        }
        throw new Error('Failed to create order line');
      },
    [],
  );

  useEffect(() => {
    if (!tvWidget) return;
    if (!isTvChartReady) return;
    let cancelled = false;

    const ohlcFallback = Number.isFinite(ohlc.close) ? ohlc.close : null;
    const klineFallback = ohlcFallback ?? lastKlineCloseRef.current;
    const effectiveBid = bidNumber ?? lastBidRef.current ?? klineFallback;
    const effectiveAsk = askNumber ?? lastAskRef.current ?? klineFallback;
    if (!isValidPrice(effectiveBid) && !isValidPrice(effectiveAsk)) {
      if (bidLineRef.current) {
        try {
          bidLineRef.current.remove?.();
        } catch {}
        bidLineRef.current = null;
      }
      if (askLineRef.current) {
        try {
          askLineRef.current.remove?.();
        } catch {}
        askLineRef.current = null;
      }
      return;
    }

    const chart = chartRef.current;
    if (!chart) return;

    const supportsOrderLines = typeof chart.createOrderLine === 'function';
    const resetPriceScale = () => {
      try {
        // Best-effort: different TradingView builds expose different APIs
        (chart as unknown as { resetPriceScale?: () => void }).resetPriceScale?.();
        const panes = (chart as unknown as { getPanes?: () => Array<unknown> }).getPanes?.();
        const firstPane = Array.isArray(panes) ? panes[0] : undefined;
        const ps = (firstPane as any)?.getMainSourcePriceScale?.();
        ps?.setAutoScale?.(true);
      } catch {}
    };

    const isRetryableNullError = (error: unknown) =>
      /value is null/i.test(error instanceof Error ? error.message : String(error));

    const runCreateLineJob = <T,>(job: () => Promise<T>): Promise<T> => {
      const result = orderLineCreateQueueRef.current.catch(() => {}).then(job);
      orderLineCreateQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };

    const ensureBidLine = async (price: number) => {
      if (!supportsOrderLines) return;

      if (!bidLineRef.current) {
        try {
          const line = await runCreateLineJob(() => createOrderLineWithRetry(chart));
          if (!line) return;
          if (cancelled) {
            line.remove?.();
            return;
          }
          line.setQuantity?.('');
          line.setText?.('');
          line.setLineColor?.(CHART_CANDLE_UP);
          line.setLineStyle?.(2);
          line.setBodyBackgroundColor?.('rgba(0,0,0,0)');
          line.setBodyTextColor?.('rgba(0,0,0,0)');
          line.setCancelButtonVisible?.(false);
          line.setModifyButtonVisible?.(false);
          line.setReverseButtonVisible?.(false);
          line.setCloseButtonVisible?.(false);

          bidLineRef.current = line;
        } catch (error) {
          if (!isRetryableNullError(error)) {
            console.error('Failed to create Bid order line', error);
          }
          return;
        }
      }

      if (bidLineRef.current) {
        bidLineRef.current.setPrice?.(price);
      }
    };

    const ensureAskLine = async (price: number) => {
      if (!supportsOrderLines) return;

      if (!askLineRef.current) {
        try {
          const line = await runCreateLineJob(() => createOrderLineWithRetry(chart));
          if (!line) return;
          if (cancelled) {
            line.remove?.();
            return;
          }
          line.setQuantity?.('');
          line.setText?.('');
          line.setLineColor?.(CHART_CANDLE_DOWN);
          line.setLineStyle?.(2);
          line.setBodyBackgroundColor?.('rgba(0,0,0,0)');
          line.setBodyTextColor?.('rgba(0,0,0,0)');
          line.setCancelButtonVisible?.(false);
          line.setModifyButtonVisible?.(false);
          line.setReverseButtonVisible?.(false);
          line.setCloseButtonVisible?.(false);

          askLineRef.current = line;
        } catch (error) {
          if (!isRetryableNullError(error)) {
            console.error('Failed to create Ask order line', error);
          }
          return;
        }
      }

      if (askLineRef.current) {
        askLineRef.current.setPrice?.(price);
      }
    };

    if (isValidPrice(effectiveBid)) {
      void ensureBidLine(effectiveBid);
    } else if (bidLineRef.current) {
      try {
        bidLineRef.current.remove?.();
      } catch {}
      bidLineRef.current = null;
    }

    if (isValidPrice(effectiveAsk)) {
      void ensureAskLine(effectiveAsk);
    } else if (askLineRef.current) {
      try {
        askLineRef.current.remove?.();
      } catch {}
      askLineRef.current = null;
    }

    resetPriceScale();
    return () => {
      cancelled = true;
    };
  }, [
    bidNumber,
    askNumber,
    currentSymbol,
    ohlc.close,
    tvWidget,
    isChartReady,
    isTvChartReady,
    isMarketClosedOrPaused,
    createOrderLineWithRetry,
  ]);

  useEffect(() => {
    if (!tvWidget) return;
    if (!isTvChartReady) return;
    const chart = chartRef.current;
    if (!chart) return;

    const supportsOrderLines = typeof chart.createOrderLine === 'function';
    if (!supportsOrderLines) return;

    const currentIds = new Set(positionsForChart.map((p: Position) => String(p.id)));

    for (const [id, line] of Object.entries(positionLinesRef.current)) {
      if (!currentIds.has(id)) {
        try {
          if (line) {
            line.remove?.();
          }
        } catch (error) {
          console.error('Failed to remove position line', error);
        } finally {
          delete positionLinesRef.current[id];
        }
      }
    }

    const ensurePositionLine = async (position: Position) => {
      const id = String(position.id);
      const price = Number(position.openPrice);
      if (!Number.isFinite(price)) return;

      let line = positionLinesRef.current[id];
      if (!line) {
        try {
          line = await createOrderLineWithRetry(chart);

          const isBuy =
            position.side === ORDER_SIDES.BUY || String(position.side).toLowerCase?.() === 'buy';

          const color = isBuy ? '#0158FF' : CHART_CANDLE_DOWN;

          line.setQuantity?.('');
          line.setText?.(`${isBuy ? 'BUY' : 'SELL'} ${formatQuantity(position.quantity ?? '')}`);
          line.setLineStyle?.(2);
          line.setLineColor?.(color);
          line.setBodyBackgroundColor?.('rgba(0,0,0,0)');
          line.setBodyBorderColor?.('rgba(0,0,0,0)');
          line.setBodyTextColor?.(color);
          line.setTextAlignment?.('left');
          line.setCancelButtonVisible?.(false);
          line.setModifyButtonVisible?.(false);
          line.setReverseButtonVisible?.(false);
          line.setCloseButtonVisible?.(false);

          positionLinesRef.current[id] = line;
        } catch (error) {
          console.error('Failed to create position line', error);
          return;
        }
      }

      if (line) {
        line.setPrice?.(price);
      }
    };

    positionsForChart.forEach((p: Position) => {
      void ensurePositionLine(p);
    });
  }, [
    positionsForChart,
    tvWidget,
    isChartReady,
    isTvChartReady,
    currentSymbol,
    createOrderLineWithRetry,
  ]);

  useEffect(() => {
    if (!tvWidget) return;
    if (!isTvChartReady) return;
    const chart = chartRef.current;
    if (!chart) return;

    const supportsOrderLines = typeof chart.createOrderLine === 'function';
    if (!supportsOrderLines) return;

    const limitOrders = (ordersForChart ?? []).filter((o: OrderItem) => Number(o?.orderType) === 1);
    const currentIds = new Set(limitOrders.map((o: OrderItem) => String(o.id)));

    for (const [id, line] of Object.entries(orderLinesRef.current)) {
      if (!currentIds.has(id)) {
        try {
          if (line) {
            line.remove?.();
          }
        } catch (error) {
          console.error('Failed to remove order line', error);
        } finally {
          delete orderLinesRef.current[id];
        }
      }
    }

    const ensureOrderLine = async (order: OrderItem) => {
      const id = String(order.id);
      const price = Number(order.price);
      if (!Number.isFinite(price)) return;

      let line = orderLinesRef.current[id];
      if (!line) {
        try {
          line = await createOrderLineWithRetry(chart);

          const isBuy =
            order.side === ORDER_SIDES.BUY ||
            order.side === 0 ||
            String(order.side).toLowerCase?.() === 'buy';

          const color = isBuy ? '#0158FF' : CHART_CANDLE_DOWN;

          line.setQuantity?.('');
          line.setText?.(`LIMIT ${isBuy ? 'BUY' : 'SELL'} ${formatQuantity(order.quantity ?? '')}`);
          line.setLineStyle?.(1);
          line.setLineColor?.(color);
          line.setBodyBackgroundColor?.('rgba(0,0,0,0)');
          line.setBodyBorderColor?.('rgba(0,0,0,0)');
          line.setBodyTextColor?.(color);
          line.setTextAlignment?.('left');
          line.setCancelButtonVisible?.(false);
          line.setModifyButtonVisible?.(false);
          line.setReverseButtonVisible?.(false);
          line.setCloseButtonVisible?.(false);

          orderLinesRef.current[id] = line;
        } catch (error) {
          console.error('Failed to create order line', error);
          return;
        }
      }

      if (line) {
        line.setPrice?.(price);
      }
    };

    limitOrders.forEach((o: OrderItem) => {
      void ensureOrderLine(o);
    });
  }, [
    ordersForChart,
    tvWidget,
    isChartReady,
    isTvChartReady,
    currentSymbol,
    createOrderLineWithRetry,
  ]);

  useEffect(() => {
    if (ohlcCb && ohlc) {
      ohlcCb(ohlc);
    }
  }, [ohlc, ohlcCb]);

  const showSplash = !tvWidget || !isTvChartReady || !hasInitialOhlc;

  return (
    <div
      className={
        isPositionPanelExpanded !== undefined
          ? 'relative h-full min-h-0'
          : 'relative min-h-0 flex-1'
      }
    >
      {showSplash && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${isDarkMode ? 'bg-[#0D0C0C]' : 'bg-white'}`}
        >
          <SplashLogo size={240} fullScreen={false} showBackground={false} />
        </div>
      )}
      <div
        ref={chartContainerRef}
        className={`${
          isPositionPanelExpanded !== undefined
            ? 'h-full min-h-0'
            : isTradeScreen
              ? 'h-[1090px] max-h-[calc(100dvh-150px)]'
              : 'h-[550px] max-h-[calc(100dvh-150px)]'
        } w-full`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-auto absolute bottom-8 left-4 z-20 h-9 w-9"
      />
    </div>
  );
}

export default memo(ChartCommon);
