'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MiniChart from '@/components/featured/home/MiniChart';
import { Button } from '@/components/shared/atoms/button';
import type { MarketRowVM } from '@/features/market/shared/types';
import { useMiniChartData } from '@/hook/useMinichartData';
import { cn } from '@/lib/utils';
import type { Candle } from '@/services/marketService';
import { useGetData } from '@/context/GetdataContext';
import type { DecimalValue } from '@/types/decimal';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';

export type TradeWebMarketCategoryTab = {
  id: string;
  label: string;
};

type SortKey = 'symbol' | 'sellBuy' | 'chg';
type SortDir = 'asc' | 'desc';
type TopTab = 'favourites' | 'recent';

const KLINE_H1_SECONDS = 60 * 60;
const MARKET_ASIDE_KLINE_LIMIT = 15;
const MARKET_ASIDE_STATE_STORAGE_KEY = 'trade-web-market-aside-state-v1';
const MARKET_ASIDE_RECENT_SYMBOLS_STORAGE_KEY = 'trade-web-market-aside-recent-symbols-v1';
const MARKET_ASIDE_SKELETON_ROWS = 8;
const MARKET_ASIDE_RECENT_SYMBOLS_MAX = 30;

function readPersistedAsideState(): {
  topTab: TopTab;
  sortKey: SortKey | null;
  sortDir: SortDir;
} {
  if (typeof window === 'undefined') {
    return { topTab: 'recent', sortKey: null, sortDir: 'asc' };
  }
  try {
    const raw = window.sessionStorage.getItem(MARKET_ASIDE_STATE_STORAGE_KEY);
    if (!raw) return { topTab: 'recent', sortKey: null, sortDir: 'asc' };
    const parsed = JSON.parse(raw) as {
      topTab?: unknown;
      sortKey?: unknown;
      sortDir?: unknown;
    };
    const topTab: TopTab = parsed.topTab === 'favourites' ? 'favourites' : 'recent';
    const sortKey: SortKey | null =
      parsed.sortKey === 'symbol' || parsed.sortKey === 'sellBuy' || parsed.sortKey === 'chg'
        ? parsed.sortKey
        : null;
    const sortDir: SortDir = parsed.sortDir === 'desc' ? 'desc' : 'asc';
    return { topTab, sortKey, sortDir };
  } catch {
    return { topTab: 'recent', sortKey: null, sortDir: 'asc' };
  }
}

function readRecentSymbols(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(MARKET_ASIDE_RECENT_SYMBOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, MARKET_ASIDE_RECENT_SYMBOLS_MAX);
  } catch {
    return [];
  }
}

function persistRecentSymbols(symbols: string[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    MARKET_ASIDE_RECENT_SYMBOLS_STORAGE_KEY,
    JSON.stringify(symbols.slice(0, MARKET_ASIDE_RECENT_SYMBOLS_MAX)),
  );
}

function upsertRecentSymbol(symbols: string[], symbol: string): string[] {
  if (!symbol.trim()) return symbols;
  const next = [symbol, ...symbols.filter((item) => item !== symbol)];
  return next.slice(0, MARKET_ASIDE_RECENT_SYMBOLS_MAX);
}

function isStockCategory(categoryCode?: string): boolean {
  return (
    String(categoryCode ?? '')
      .trim()
      .toUpperCase() === 'STOCK'
  );
}

export function normalizeDigits(digit: number | undefined): number {
  if (!Number.isFinite(digit)) return 2;
  return Math.max(0, Math.min(12, Math.trunc(Number(digit))));
}

export function hashToPercent(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 2001;
  }
  return (hash - 1000) / 100;
}

function signedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatPrice(value: number, digit: number): string {
  const resolvedDigits = normalizeDigits(digit);
  if (!Number.isFinite(value)) return Number(0).toFixed(resolvedDigits);
  return value.toFixed(resolvedDigits);
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={direction === 'asc' ? 'text-primary-500' : 'text-muted-foreground'}
      >
        <polygon points="4,0 8,5 0,5" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={direction === 'desc' ? 'text-primary-500' : 'text-muted-foreground'}
      >
        <polygon points="4,5 0,0 8,0" />
      </svg>
    </div>
  );
}

function MarketAsideKlineMini({ candles, positive }: { candles: Candle[]; positive: boolean }) {
  if (candles.length < 2) {
    return <div className="h-7.5 w-15 shrink-0" aria-hidden />;
  }
  return (
    <div className="h-7.5 w-15 shrink-0" aria-hidden>
      <MiniChart candles={candles} height={30} isPositive={positive} strokeWidth={1.2} width={60} />
    </div>
  );
}

type RtTicker = {
  bid?: DecimalValue;
  ask?: DecimalValue;
  changePercent?: DecimalValue;
};

export type TradeWebMarketAsideProps = {
  expanded: boolean;
  categoryTabs: TradeWebMarketCategoryTab[];
  leftTab: string;
  onLeftTabChange: (tab: string) => void;
  displayRows: MarketRowVM[];
  rtBySymbol: Record<string, RtTicker> | undefined;
  initialSymbol: string;
  onSymbolSelect: (symbol: string) => void;
};

export const TradeWebMarketAside = memo(function TradeWebMarketAside({
  expanded,
  categoryTabs,
  leftTab,
  onLeftTabChange,
  displayRows,
  rtBySymbol,
  initialSymbol,
  onSymbolSelect,
}: TradeWebMarketAsideProps) {
  const { t } = useTranslation();
  const { isLoadingAssets } = useGetData();
  const persistedState = readPersistedAsideState();
  const [topTab, setTopTab] = useState<TopTab>(persistedState.topTab);
  const [sortKey, setSortKey] = useState<SortKey | null>(persistedState.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(persistedState.sortDir);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [recentSymbols, setRecentSymbols] = useState<string[]>(() => readRecentSymbols());

  useEffect(() => {
    setSelectedSymbol(initialSymbol);
  }, [initialSymbol]);

  useEffect(() => {
    if (!initialSymbol) return;
    setRecentSymbols((prev) => {
      const next = upsertRecentSymbol(prev, initialSymbol);
      persistRecentSymbols(next);
      return next;
    });
  }, [initialSymbol]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      MARKET_ASIDE_STATE_STORAGE_KEY,
      JSON.stringify({ topTab, sortKey, sortDir }),
    );
  }, [topTab, sortDir, sortKey]);

  const visibleRows = useMemo(() => {
    if (topTab === 'favourites') {
      return displayRows.filter((row) => row.isFavorite);
    }
    return displayRows;
  }, [displayRows, topTab]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return visibleRows;

    const sorted = [...visibleRows].sort((a, b) => {
      if (sortKey === 'symbol') {
        return a.symbol.localeCompare(b.symbol);
      }

      if (sortKey === 'sellBuy') {
        const aTicker = rtBySymbol?.[a.symbol];
        const bTicker = rtBySymbol?.[b.symbol];
        const aBid = toFiniteNumberFromNumberish(aTicker?.bid) ?? a.bidValue;
        const bBid = toFiniteNumberFromNumberish(bTicker?.bid) ?? b.bidValue;
        if (aBid !== bBid) return aBid - bBid;
        return a.symbol.localeCompare(b.symbol);
      }

      const aTicker = rtBySymbol?.[a.symbol];
      const bTicker = rtBySymbol?.[b.symbol];
      const aChg = toFiniteNumberFromNumberish(aTicker?.changePercent) ?? hashToPercent(a.symbol);
      const bChg = toFiniteNumberFromNumberish(bTicker?.changePercent) ?? hashToPercent(b.symbol);
      if (aChg !== bChg) return aChg - bChg;
      return a.symbol.localeCompare(b.symbol);
    });

    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [sortDir, sortKey, rtBySymbol, visibleRows]);

  const displaySortedRows = useMemo(() => {
    if (topTab !== 'recent' || sortKey) {
      return sortedRows;
    }

    if (recentSymbols.length === 0) {
      return sortedRows;
    }

    const recentIndexBySymbol = new Map(
      recentSymbols.map((symbol, index) => [symbol, index] as const),
    );

    return [...sortedRows].sort((a, b) => {
      const aIdx = recentIndexBySymbol.get(a.symbol);
      const bIdx = recentIndexBySymbol.get(b.symbol);
      const aIsRecent = aIdx != null;
      const bIsRecent = bIdx != null;

      if (aIsRecent && bIsRecent) return aIdx - bIdx;
      if (aIsRecent) return -1;
      if (bIsRecent) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [recentSymbols, sortKey, sortedRows, topTab]);

  const symbolsForMiniCharts = useMemo(
    () =>
      Array.from(
        new Set(
          sortedRows
            .filter((row) => Boolean(row.symbol) && !isStockCategory(row.categoryCode))
            .map((row) => row.symbol),
        ),
      ),
    [sortedRows],
  );

  const { data: miniChartData = [] } = useMiniChartData({
    enabled: false, // Disabled for RWA context
    limit: MARKET_ASIDE_KLINE_LIMIT,
    symbols: symbolsForMiniCharts,
    timeframe: KLINE_H1_SECONDS,
  });

  const miniChartBySymbol = useMemo(
    () => new Map(miniChartData.map((item) => [item.symbol, item.candles] as const)),
    [miniChartData],
  );

  const handleSortToggle = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }
    setSortKey(null);
    setSortDir('asc');
  };

  const isEmpty = displaySortedRows.length === 0;
  const isDataLoading = isLoadingAssets;

  return (
    <aside
      className={cn(
        'bg-background border-border flex h-full min-h-0 min-w-0 flex-col border-r transition-opacity duration-200',
        expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <div className="shrink-0 px-2 pt-3 pb-5">
        <div className="mb-3 flex items-center gap-4">
          <Button
            type="button"
            variant="white-contained"
            onClick={() => setTopTab('favourites')}
            className={`h-auto bg-transparent p-0 transition-colors hover:bg-transparent ${topTab === 'favourites' ? 'dark:text-primary-500 text-primary-500 !text-body-large-semibold' : '!text-body-large-regular text-neutral-500 dark:text-neutral-400'} `}
          >
            {t('trade.web.marketAside.favourites')}
          </Button>
          <Button
            type="button"
            variant="white-contained"
            onClick={() => setTopTab('recent')}
            className={`h-auto bg-transparent p-0 transition-colors hover:bg-transparent ${topTab === 'recent' ? 'dark:text-primary-500 text-primary-500 !text-body-large-semibold' : '!text-body-large-regular text-neutral-500 dark:text-neutral-400'} `}
          >
            {t('trade.web.marketAside.recently')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onLeftTabChange(tab.id)}
              className={`cursor-pointer rounded border-0 px-3 py-1 leading-5 ring-0 transition-colors ${
                leftTab === tab.id
                  ? 'bg-muted text-body-small-medium text-primary-500'
                  : 'text-foreground hover:text-primary-500 text-body-small-medium'
              } `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!isEmpty && (
        <div className="shrink-0 px-2 pb-3">
          <div
            className="text-body-small-regular text-muted-foreground grid grid-cols-[minmax(0,1fr)_104px_76px] items-center px-1"
            role="row"
          >
            <button
              type="button"
              onClick={() => handleSortToggle('symbol')}
              className="flex cursor-pointer items-center justify-start gap-1 border-0 bg-transparent p-0 text-left outline-none select-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
              aria-label={t('trade.web.marketAside.sortBySymbol')}
            >
              <span
                className={`text-body-small-medium ${sortKey === 'symbol' ? 'text-primary-500' : 'text-muted-foreground'}`}
              >
                {t('trade.web.marketAside.symbol')}
              </span>
              <SortIcon direction={sortKey === 'symbol' ? sortDir : null} />
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('sellBuy')}
              className="flex cursor-pointer items-center justify-end gap-1 border-0 bg-transparent p-0 text-right outline-none select-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
              aria-label={t('trade.web.marketAside.sortBySellBuy')}
            >
              <div className="flex items-center justify-end gap-1 text-right">
                <span
                  className={`text-body-small-medium ${sortKey === 'sellBuy' ? 'text-primary-500' : 'text-muted-foreground'}`}
                >
                  {t('trade.web.marketAside.sellBuy')}
                </span>
                <div>
                  <SortIcon direction={sortKey === 'sellBuy' ? sortDir : null} />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('chg')}
              className="flex cursor-pointer items-center justify-end gap-1 border-0 bg-transparent p-0 text-right outline-none select-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
            >
              <span
                className={`text-body-small-medium ${sortKey === 'chg' ? 'text-primary-500' : 'text-muted-foreground'}`}
              >
                {t('trade.web.marketAside.changePercent')}
              </span>
              <SortIcon direction={sortKey === 'chg' ? sortDir : null} />
            </button>
          </div>
        </div>
      )}

      <div className="scrollbar-neutral-slim flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isDataLoading ? (
          <div className="flex flex-col px-2 py-2" aria-hidden>
            {Array.from({ length: MARKET_ASIDE_SKELETON_ROWS }).map((_, index) => (
              <div
                key={`market-aside-skeleton-${index}`}
                className="flex w-full items-center gap-x-2 px-2 py-2"
              >
                <span className="flex w-1/3 flex-col gap-1.5">
                  <span className="bg-muted h-3.5 w-16 animate-pulse rounded" />
                  <span className="bg-muted h-3 w-20 animate-pulse rounded" />
                </span>
                <span className="flex w-1/3 flex-col items-end gap-1.5">
                  <span className="bg-muted h-3.5 w-14 animate-pulse rounded" />
                  <span className="bg-muted h-3.5 w-14 animate-pulse rounded" />
                </span>
                <span className="flex w-1/3 flex-col items-end gap-1.5">
                  <span className="bg-muted h-3 w-12 animate-pulse rounded" />
                </span>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <p className="text-body-small-regular text-muted-foreground">
              {t('search.noAssetsFound', { defaultValue: 'No assets found' })}
            </p>
          </div>
        ) : (
          displaySortedRows.map((row) => {
            const ticker = rtBySymbol?.[row.symbol];
            const rtBid = toFiniteNumberFromNumberish(ticker?.bid);
            const rtAsk = toFiniteNumberFromNumberish(ticker?.ask);
            const rowBid = rtBid ?? row.bidValue;
            const rowAsk = rtAsk ?? row.askValue;
            const rowChg =
              toFiniteNumberFromNumberish(ticker?.changePercent) ?? hashToPercent(row.symbol);
            const rowBidText = rtBid == null ? '--' : formatPrice(rowBid, row.digit);
            const rowAskText = rtAsk == null ? '--' : formatPrice(rowAsk, row.digit);
            const up = rowChg >= 0;
            const priceChgColor = up ? 'text-green-500' : 'text-red-500';

            return (
              <button
                key={row.id || row.symbol}
                type="button"
                onClick={() => {
                  setSelectedSymbol(row.symbol);
                  setRecentSymbols((prev) => {
                    const next = upsertRecentSymbol(prev, row.symbol);
                    persistRecentSymbols(next);
                    return next;
                  });
                  onSymbolSelect(row.symbol);
                }}
                className={cn(
                  'hover:bg-muted/70 border-border flex w-full items-center gap-x-2 border-b px-2 py-2 text-left transition-colors',
                  row.symbol === selectedSymbol && 'bg-muted/80',
                )}
              >
                <span className="flex w-1/3 flex-col">
                  <span className="text-body-small-medium text-foreground block" title={row.symbol}>
                    {row.symbol}
                  </span>
                  <span className="text-muted-foreground block text-[12px]" title={row.name}>
                    {row.name}
                  </span>
                </span>
                <span
                  className={cn(
                    'flex w-1/3 flex-col items-end justify-end gap-1 text-right tabular-nums',
                  )}
                >
                  <span className="text-body-small-medium text-red-500">{rowAskText}</span>
                  <span className="text-body-small-medium text-green-500">{rowBidText}</span>
                </span>
                <span className="flex w-1/3 flex-col items-end">
                  <span className={`text-caption-medium text-right tabular-nums ${priceChgColor}`}>
                    {signedPercent(rowChg)}
                  </span>
                  {/*  */}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
});
