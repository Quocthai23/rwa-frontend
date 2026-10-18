'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGetListPopular } from '@/components/featured/market/hooks/useGetListPopular';
import { useGetData } from '@/context/GetdataContext';
import type { Asset } from '@/types';
import { useKlineSocketStore } from '@/store/klineSocketStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTheme } from '@/theme';
import { API_CHART_URL } from '@/constants/env';
import { toFiniteNumberFromNumberish } from './tradePanel/utils/tradePanelInputHelpers';

declare global {
  interface Window {
    TradingView?: any;
  }
}

type TvBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

const INITIAL_CHART_HISTORY_BARS = 120;
const MAX_HISTORY_BARS_PER_REQUEST = 1000;

function tradingViewPricescaleFromDigits(digits: number): number {
  const d = Math.min(Math.max(Math.floor(digits), 0), 8);
  return 10 ** d;
}

class HttpDatafeed {
  private readonly baseUrl: string;
  private readonly symbol: string;
  private readonly getAssets?: () => Asset[] | undefined;
  private readonly intervals: Record<string, number> = {};
  private initialChartHistoryLoaded = false;
  private historyPaginationUnlocked = false;
  private readonly subscribers: Record<
    string,
    {
      resolutionSeconds: number;
      onRealtimeCallback: (bar: TvBar) => void;
      lastBar?: TvBar;
    }
  > = {};

  constructor(baseUrl: string, symbol: string | undefined, getAssets?: () => Asset[] | undefined) {
    this.baseUrl = baseUrl;
    this.symbol = symbol ?? '';
    this.getAssets = getAssets;
  }

  unlockHistoryPagination() {
    this.historyPaginationUnlocked = true;
  }

  onReady(callback: (config: any) => void) {
    const configuration = {
      supported_resolutions: ['1', '5', '15', '60', '240', 'D'],
    };
    setTimeout(() => callback(configuration), 0);
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: any) => void,
    onResolveErrorCallback: (reason: string) => void,
  ) {
    try {
      const assets = this.getAssets?.() ?? [];
      const asset = assets.find((a) => String(a?.symbol ?? '') === symbolName);
      const digitCount = Math.min(Math.max(asset?.digit ?? 5, 0), 8);
      const pricescale = tradingViewPricescaleFromDigits(digitCount);

      const symbolInfo = {
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
        has_no_volume: false,
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
    _symbolInfo: any,
    resolution: string,
    periodParams: any,
    onHistoryCallback: (bars: TvBar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: string) => void,
  ) {
    try {
      const firstReq = periodParams?.firstDataRequest as boolean | undefined;
      const deferPagination =
        !this.historyPaginationUnlocked && this.initialChartHistoryLoaded && firstReq !== true;

      if (deferPagination) {
        onHistoryCallback([], { noData: false });
        return;
      }

      const timeframeSeconds = this.resolutionToSeconds(resolution);
      const countBack = periodParams?.countBack ?? 100;
      const treatAsInitialLoad = !this.initialChartHistoryLoaded;
      const maxBars = treatAsInitialLoad
        ? INITIAL_CHART_HISTORY_BARS
        : MAX_HISTORY_BARS_PER_REQUEST;
      const limit = Math.min(countBack, maxBars);
      const from = periodParams?.from as number | undefined;
      const to = periodParams?.to as number | undefined;

      const params = new URLSearchParams({
        timeframe: String(timeframeSeconds),
        limit: String(limit),
        includeActive: 'true',
      });
      if (to != null && Number.isFinite(to)) {
        params.set('endTime', String(to));
      }
      const url = `${this.baseUrl}/api/v1/market/klines/${this.symbol}?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));

      const data = await res.json();
      const candles = (data.candles ?? []) as any[];

      let bars: TvBar[] = candles.map((k) => ({
        time: ((k.timestamp ?? k.time) as number) * 1000,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume ?? 0,
      }));

      if (from != null && to != null && Number.isFinite(from) && Number.isFinite(to)) {
        const fromMs = from * 1000;
        const toMs = to * 1000;
        bars = bars
          .filter((b) => b.time >= fromMs && b.time < toMs)
          .sort((a, b) => a.time - b.time);
      } else {
        bars = [...bars].sort((a, b) => a.time - b.time);
      }

      if (!bars.length) {
        onHistoryCallback([], { noData: true });
        return;
      }

      if (treatAsInitialLoad && bars.length > 0) {
        this.initialChartHistoryLoaded = true;
      }

      onHistoryCallback(bars, { noData: false });
    } catch (error) {
      console.error('getBars error', error);
      onErrorCallback((error as Error).message ?? 'getBars error');
    }
  }

  subscribeBars(
    _symbolInfo: any,
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
        const url = `${this.baseUrl}/api/v1/market/klines/${this.symbol}?timeframe=${timeframeSeconds}&limit=1&includeActive=true`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const latest = (data.candles ?? [])[0];
        if (!latest) return;

        const bar: TvBar = {
          time: ((latest.timestamp ?? latest.time) as number) * 1000,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
          volume: latest.volume ?? 0,
        };

        const sub = this.subscribers[subscriberUID];
        if (!sub) return;
        sub.lastBar = bar;
        sub.onRealtimeCallback(bar);
      } catch (error) {
        console.error('subscribeBars seed error', error);
      }
    })();
  }

  unsubscribeBars(subscriberUID: string) {
    const id = this.intervals[subscriberUID];
    if (id) {
      clearInterval(id);
      delete this.intervals[subscriberUID];
    }
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
}

function resolveCssColor(color: string | undefined): string | undefined {
  if (!color) return color;
  if (typeof window === 'undefined') return color;
  if (!color.includes('var(')) return color;

  const m = color.match(/var\(\s*(--[^),\s]+)\s*(?:,[^)]+)?\)/);
  const varName = m?.[1];
  if (!varName) return color;

  const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return resolved || color;
}

function MiniBidAskChart({
  ohlcCb,
  symbol,
  isChartMini: _isChartMini,
}: {
  readonly isChartMini?: boolean;
  readonly ohlcCb?: (ohlc: { close: number; high: number; low: number; open: number }) => void;
  readonly symbol: string;
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
  const bidValue = useMemo(() => toFiniteNumberFromNumberish(bid), [bid]);
  const askValue = useMemo(() => toFiniteNumberFromNumberish(ask), [ask]);
  const { listPopular } = useGetListPopular(currentSymbol);
  const { assets: contextAssets } = useGetData();
  const assetsRef = useRef<Asset[] | undefined>(contextAssets);
  useEffect(() => {
    assetsRef.current = contextAssets;
  }, [contextAssets]);
  const tvSymbol = useMemo(() => {
    const popularItem = listPopular.find(
      (item) => item.symbol === currentSymbol || item.stats?.symbol === currentSymbol,
    );
    return popularItem?.symbolTradingView ?? currentSymbol ?? '';
  }, [listPopular, currentSymbol]);
  const [isChartReady, setIsChartReady] = useState(false);
  const timeframe = 60;
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const paginationUnlockAcRef = useRef<AbortController | null>(null);
  const [tvWidget, setTvWidget] = useState<any | null>(null);
  const tvContainerIdRef = useRef(`tv_chart_container_${Math.random().toString(36).slice(2, 10)}`);
  const datafeedRef = useRef<HttpDatafeed | null>(null);
  const chartRef = useRef<any | null>(null);
  const bidLineRef = useRef<any | null>(null);
  const askLineRef = useRef<any | null>(null);
  const isMountedRef = useRef(true);
  const { colors, mode } = useTheme();
  const chartPositiveColor = colors.chartPositive ?? colors.green500;
  const chartNegativeColor = colors.chartNegative ?? colors.red500;
  const upColor = resolveCssColor(chartPositiveColor);
  const downColor = resolveCssColor(chartNegativeColor);
  const isDarkMode = mode === 'dark';
  const tvTheme = isDarkMode ? 'Dark' : 'Light';
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

    const widgetContainerId = tvContainerIdRef.current;
    container.id = widgetContainerId;

    let widget: any | null = null;
    try {
      const datafeed = new HttpDatafeed(
        API_CHART_URL ?? '',
        tvSymbol || '',
        () => assetsRef.current,
      );
      datafeedRef.current = datafeed;

      const disabled_features = [
        'use_localstorage_for_settings',
        'header_widget',
        'left_toolbar',
        'timeframes_toolbar',
        'header_symbol_search',
        'header_resolutions',
        'header_undo_redo',
        'header_saveload',
        'header_fullscreen_button',
        'header_chart_type',
        'header_compare',
        'header_settings',
        'branding',
      ];

      const enabled_features: string[] = [];

      widget = new window.TradingView.widget({
        symbol: tvSymbol,
        interval: '1',
        container,
        datafeed,
        library_path: '/tradingview/',
        custom_css_url: '/tradingview/custom-overrides.css',
        locale: 'en',
        autosize: true,
        timezone: 'Etc/UTC',
        theme: tvTheme,
        disabled_features,
        enabled_features,
        hide_top_toolbar: true,
        hide_side_toolbar: true,
        withdateranges: true,
        overrides: {
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
          'paneProperties.backgroundType': 'solid',
          'paneProperties.background': isDarkMode ? '#010308' : '#FFFFFF',
          'paneProperties.backgroundGradientStartColor': isDarkMode ? '#010308' : '#FFFFFF',
          'paneProperties.backgroundGradientEndColor': isDarkMode ? '#010308' : '#FFFFFF',
          'paneProperties.vertGridProperties.color': isDarkMode
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(16,24,40,0.08)',
          'paneProperties.horzGridProperties.color': isDarkMode
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(16,24,40,0.08)',
          'scalesProperties.textColor': isDarkMode ? '#98A2B3' : '#475467',
          'paneProperties.legendProperties.showLegend': false,
          'paneProperties.legendProperties.showSeriesTitle': false,
          'paneProperties.legendProperties.showSeriesOHLC': false,
          'paneProperties.legendProperties.showStudyTitles': false,
          'paneProperties.legendProperties.showStudyArguments': false,
          'paneProperties.legendProperties.showBarChange': false,
        },
      });

      widget.onChartReady(() => {
        const chart = widget.activeChart?.() ?? widget.chart?.();
        chartRef.current = chart ?? null;

        paginationUnlockAcRef.current?.abort();
        const paginationAc = new AbortController();
        paginationUnlockAcRef.current = paginationAc;
        const chartHost = chartContainerRef.current;
        if (chartHost) {
          const unlockPagination = () => {
            datafeed.unlockHistoryPagination();
          };
          chartHost.addEventListener('wheel', unlockPagination, {
            passive: true,
            signal: paginationAc.signal,
          });
          chartHost.addEventListener('pointerdown', unlockPagination, {
            passive: true,
            signal: paginationAc.signal,
          });
        }

        try {
          const onVisibleRangeChanged = (chart as any).onVisibleRangeChanged?.();
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
        } catch {
          // ignore
        }

        try {
          widget.applyOverrides?.({
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
            'paneProperties.backgroundType': 'solid',
            'paneProperties.background': isDarkMode ? '#101828' : '#FFFFFF',
            'paneProperties.backgroundGradientStartColor': isDarkMode ? '#101828' : '#FFFFFF',
            'paneProperties.backgroundGradientEndColor': isDarkMode ? '#101828' : '#FFFFFF',
            'paneProperties.vertGridProperties.color': isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(16,24,40,0.08)',
            'paneProperties.horzGridProperties.color': isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(16,24,40,0.08)',
            'scalesProperties.textColor': isDarkMode ? '#98A2B3' : '#475467',
            'mainSeriesProperties.priceAxisProperties.alignLabels': false,
          });
        } catch {
          // ignore
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
        chartRef.current = null;
        bidLineRef.current = null;
        askLineRef.current = null;
        datafeedRef.current = null;
        setTvWidget(null);
      }
    };
  }, [isChartReady, tvSymbol, mode]);

  useEffect(() => {
    const df = datafeedRef.current;
    if (!df || bidValue == null || !Number.isFinite(bidValue)) return;
    df.updateWithPrice(bidValue);
  }, [bidValue]);

  useEffect(() => {
    if (!tvWidget) return;
    if (bidValue == null && askValue == null) return;

    const chart = chartRef.current;
    if (!chart) return;

    const supportsOrderLines = typeof (chart as any).createOrderLine === 'function';
    if (!supportsOrderLines) return;

    const ensureBidLine = async (price: number) => {
      if (!supportsOrderLines) return;

      if (!bidLineRef.current) {
        try {
          const line = await (chart as any).createOrderLine();
          (line as any)
            ?.setQuantity('')
            ?.setText?.('')
            ?.setLineColor?.('#12B76A')
            ?.setLineStyle?.(2)
            ?.setBodyBackgroundColor?.('rgba(0,0,0,0)')
            ?.setBodyTextColor?.('rgba(0,0,0,0)')
            ?.setCancelButtonVisible?.(false)
            ?.setModifyButtonVisible?.(false)
            ?.setReverseButtonVisible?.(false)
            ?.setCloseButtonVisible?.(false);

          bidLineRef.current = line;
        } catch (error) {
          console.error('Failed to create Bid order line', error);
          return;
        }
      }

      if (bidLineRef.current && typeof (bidLineRef.current as any).setPrice === 'function') {
        (bidLineRef.current as any).setPrice(price);
      }
    };

    const ensureAskLine = async (price: number) => {
      if (!supportsOrderLines) return;

      if (!askLineRef.current) {
        try {
          const line = await (chart as any).createOrderLine();
          (line as any)
            ?.setQuantity('')
            ?.setText?.('')
            ?.setLineColor?.('#F04438')
            ?.setLineStyle?.(2)
            ?.setBodyBackgroundColor?.('rgba(0,0,0,0)')
            ?.setBodyTextColor?.('rgba(0,0,0,0)')
            ?.setCancelButtonVisible?.(false)
            ?.setModifyButtonVisible?.(false)
            ?.setReverseButtonVisible?.(false)
            ?.setCloseButtonVisible?.(false);

          askLineRef.current = line;
        } catch (error) {
          console.error('Failed to create Ask order line', error);
          return;
        }
      }

      if (askLineRef.current && typeof (askLineRef.current as any).setPrice === 'function') {
        (askLineRef.current as any).setPrice(price);
      }
    };

    if (bidValue != null) {
      void ensureBidLine(bidValue);
    }

    if (askValue != null) {
      void ensureAskLine(askValue);
    }
  }, [bidValue, askValue, tvWidget, isChartReady]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentSymbol) return;

    const asset = contextAssets?.find((a) => String(a?.symbol ?? '') === currentSymbol);
    const klineTopicId = asset?.id ?? currentSymbol;

    let cancelled = false;

    const handleKlineUpdate = (candle: any) => {
      if (cancelled) return;

      if (!isMountedRef.current) return;

      setOhlc({
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
      });
    };

    const run = async () => {
      try {
        const url = `${API_CHART_URL}/api/v1/market/klines/${currentSymbol}?timeframe=${timeframe}&limit=100&includeActive=true`;

        const res = await fetch(url);
        if (cancelled) return;

        if (!res.ok) throw new Error(`${res.status}`);

        const data = await res.json();
        if (cancelled) return;

        const candles = (data.candles ?? []).map((k: any) => ({
          close: k.close,
          high: k.high,
          low: k.low,
          open: k.open,
          time: k.timestamp,
        }));

        if (candles.length === 0) throw new Error('No candles');

        const latest = candles.at(-1);

        setOhlc({
          close: latest.close,
          high: latest.high,
          low: latest.low,
          open: latest.open,
        });

        if (cancelled) return;
        subscribe(klineTopicId, timeframe, handleKlineUpdate);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
      }
    };

    void run();

    return () => {
      cancelled = true;
      unsubscribe(klineTopicId, timeframe, handleKlineUpdate);
    };
  }, [timeframe, currentSymbol, subscribe, unsubscribe, contextAssets]);

  useEffect(() => {
    if (ohlcCb && ohlc) {
      ohlcCb(ohlc);
    }
  }, [ohlc, ohlcCb]);

  return (
    <div className="flex-1">
      <div ref={chartContainerRef} className="h-44.5 max-h-[calc(100dvh-200px)] w-full" />
    </div>
  );
}

export default MiniBidAskChart;

