'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Decimal from 'decimal.js';
import type { DecimalValue } from '@/types/decimal';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import MiniChart from '@/components/featured/home/MiniChart';
import { useMarketViewModel } from '@/features/market/shared/hooks/useMarketViewModel';
import type { MarketRowVM } from '@/features/market/shared/types';
import { Button } from '@/components/shared/atoms/button';
import { Checkbox } from '@/components/shared/atoms/checkbox';
import {
  DataTable,
  type DataTableColumn,
  type DataTableSortState,
} from '@/components/shared/atoms/data-table';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset/ToggleFavouriteAsset';
import { useMiniChartData } from '@/hook/useMinichartData';
import { useAssetsMarketData } from '@/hook/useAssetsMarketData';
import { useSymbols } from '@/hook/useSymbols';
import { cn } from '@/lib/utils';
import type { Candle } from '@/services/marketService';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { isCategoryOpenByOtcRule } from '@/components/featured/market/web/helpers/marketOpenRule';
import type { AssetMarketData } from '@/types/assets';

const MARKET_WEB_DEFAULT_TAB = 'popular';
const MARKET_EQUAL_COLUMN_WIDTH = 'w-[10%]';
const MARKET_WEB_KLINE_H1_SECONDS = 60 * 60;
const MARKET_WEB_MINI_CHART_LIMIT = 15;
type SortColumn =
  | 'symbol'
  | 'sellPrice'
  | 'buyPrice'
  | 'spread'
  | 'volume'
  | 'sellPercent'
  | 'buyPercent'
  | 'changePercent'
  | 'low'
  | 'high';

type MarketTicker = {
  ask?: DecimalValue;
  bid?: DecimalValue;
  buyPercent?: DecimalValue;
  changePercent?: DecimalValue;
  sellPercent?: DecimalValue;
  volume?: DecimalValue;
  takerBuyRatio24h?: DecimalValue;
  takerBuyVolume24h?: DecimalValue;
  takerSellVolume24h?: DecimalValue;
  sessionStats?: {
    high?: DecimalValue;
    low?: DecimalValue;
  };
};

type ResolvedMarketRow = {
  ask?: DecimalValue;
  bid?: DecimalValue;
  buyPercent?: number;
  changePercent?: number;
  high?: DecimalValue;
  low?: DecimalValue;
  row: MarketRowVM;
  sellPercent?: number;
  spread?: number;
  volume: number;
};

type MarketTableColumn = DataTableColumn<ResolvedMarketRow, SortColumn> & {
  getSortValue: (data: ResolvedMarketRow) => number | string;
};
type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

function getPercentClass(value: number | undefined): string {
  const safe = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(safe)) return 'text-muted-foreground';
  if (safe > 0) return 'text-green-500';
  if (safe < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function normalizeDigits(digit: number | undefined): number {
  if (!Number.isFinite(digit)) return 2;
  return Math.max(0, Math.min(12, Math.trunc(Number(digit))));
}

function formatPrice(value: DecimalValue | undefined, digit: number): string {
  const resolvedDigits = normalizeDigits(digit);
  const safe = toFiniteNumberFromNumberish(value);
  if (safe == null) return '--';
  return safe.toFixed(resolvedDigits);
}

function formatSignedPercent(value: DecimalValue | undefined): string {
  const safe = toFiniteNumberFromNumberish(value);
  if (safe == null) return '--';
  if (safe > 0) return `+${safe.toFixed(2)}%`;
  if (safe < 0) return `-${Math.abs(safe).toFixed(2)}%`;
  return '0.00%';
}

function formatStatValue(value: DecimalValue | undefined, digit: number): string {
  const resolvedDigits = normalizeDigits(digit);
  const safe = toFiniteNumberFromNumberish(value);
  if (safe == null) return '--';
  return safe.toFixed(resolvedDigits);
}

function formatVolume(value: number | undefined): string {
  if (!Number.isFinite(value)) return '-';
  const safe = Number(value);
  if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(2)}B`;
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(2)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(2)}K`;
  return safe.toFixed(2);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function calculateSpread(
  ask: DecimalValue | undefined,
  bid: DecimalValue | undefined,
  digit: number,
): number | undefined {
  const safeAsk = toFiniteNumberFromNumberish(ask);
  const safeBid = toFiniteNumberFromNumberish(bid);
  if (safeAsk == null || safeBid == null) return undefined;
  const factor = new Decimal(10).pow(digit);
  const askTicks = new Decimal(safeAsk).mul(factor).round();
  const bidTicks = new Decimal(safeBid).mul(factor).round();
  return askTicks.sub(bidTicks).abs().toNumber();
}

function resolveRowMetrics(
  row: MarketRowVM,
  ticker?: MarketTicker,
  marketData?: AssetMarketData,
): ResolvedMarketRow {
  const initialHigh = row.initialHigh;
  const initialLow = row.initialLow;
  const ask = toFiniteNumberFromNumberish(ticker?.ask);
  const bid = toFiniteNumberFromNumberish(ticker?.bid);
  const marketAsk = toFiniteNumberFromNumberish(marketData?.buyPrice);
  const marketBid = toFiniteNumberFromNumberish(marketData?.sellPrice);
  const changePercent =
    toFiniteNumberFromNumberish(ticker?.changePercent) ??
    toFiniteNumberFromNumberish(marketData?.chgPercent);
  const high = toFiniteNumberFromNumberish(ticker?.sessionStats?.high);
  const low =
    toFiniteNumberFromNumberish(ticker?.sessionStats?.low) ??
    toFiniteNumberFromNumberish(marketData?.low);
  const resolvedAsk = ask ?? marketAsk ?? (row.askValue > 0 ? row.askValue : undefined);
  const resolvedBid = bid ?? marketBid ?? (row.bidValue > 0 ? row.bidValue : undefined);
  const resolvedChangePercent = changePercent;
  const resolvedHigh = high ?? (initialHigh > 0 ? initialHigh : undefined);
  const resolvedLow = low ?? (initialLow > 0 ? initialLow : undefined);
  const takerBuyVolume24h = toFiniteNumberFromNumberish(ticker?.takerBuyVolume24h);
  const takerSellVolume24h = toFiniteNumberFromNumberish(ticker?.takerSellVolume24h);
  const tickerVolume = toFiniteNumberFromNumberish(ticker?.volume);
  const takerBuyRatio24h = toFiniteNumberFromNumberish(ticker?.takerBuyRatio24h);
  const hasTakerVolume =
    Number.isFinite(takerBuyVolume24h) || Number.isFinite(takerSellVolume24h);
  const totalVolume = hasTakerVolume
    ? (takerBuyVolume24h ?? 0) + (takerSellVolume24h ?? 0)
    : (tickerVolume ?? toFiniteNumberFromNumberish(marketData?.volume) ?? 0);
  const marketBuyPercent =
    toFiniteNumberFromNumberish(ticker?.buyPercent) ??
    toFiniteNumberFromNumberish(marketData?.buyPercent);
  const marketSellPercent =
    toFiniteNumberFromNumberish(ticker?.sellPercent) ??
    toFiniteNumberFromNumberish(marketData?.sellPercent);
  const buyPercentRaw =
    takerBuyRatio24h != null
      ? takerBuyRatio24h
      : marketBuyPercent != null
        ? marketBuyPercent
        : hasTakerVolume && totalVolume > 0
          ? ((takerBuyVolume24h ?? 0) / totalVolume) * 100
          : undefined;
  const buyPercent = buyPercentRaw == null ? undefined : clampPercent(buyPercentRaw);
  const sellPercentRaw =
    marketSellPercent != null
      ? marketSellPercent
      : buyPercent == null
        ? undefined
        : 100 - buyPercent;
  const sellPercent = sellPercentRaw == null ? undefined : clampPercent(sellPercentRaw);
  const spread = toFiniteNumberFromNumberish(marketData?.spread);

  return {
    ask: resolvedAsk,
    bid: resolvedBid,
    buyPercent,
    changePercent: resolvedChangePercent,
    high: resolvedHigh,
    low: resolvedLow,
    row,
    sellPercent,
    spread: spread ?? calculateSpread(resolvedAsk, resolvedBid, row.digit),
    volume: totalVolume,
  };
}

function MarketChangeMiniChart({ candles, positive }: { candles: Candle[]; positive: boolean }) {
  if (candles.length < 2) {
    return <div className="h-7.5 w-15 shrink-0" aria-hidden />;
  }

  return (
    <div className="h-7.5 w-15 shrink-0" aria-hidden>
      <MiniChart candles={candles} height={30} isPositive={positive} strokeWidth={1.2} width={60} />
    </div>
  );
}

function getMarketTableColumns(
  t: TranslateFn,
  miniChartBySymbol: Map<string, Candle[]>,
): MarketTableColumn[] {
  return [
    {
      key: 'symbol',
      label: t('market.columns.symbol', { defaultValue: 'Symbol' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'left',
      getSortValue: (data) => data.row.name || data.row.symbol,
      renderCell: (data) => (
        <div className="flex min-w-0 items-center gap-2">
          <ToggleFavouriteAsset
            assetId={data.row.id}
            size={16}
            className="h-4 w-4 shrink-0 p-0"
            defaultIsFavorite={data.row.isFavorite}
          />
          <div className="ml-1 min-w-0 flex-1">
            <p className="text-body-small-medium text-foreground py-1">{data.row.symbol}</p>
            <div className="flex items-center gap-0">
              <p className="text-body-caption-medium text-muted-foreground min-w-0 flex-1">
                {data.row.name}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'sellPrice',
      label: t('market.columns.sellPrice', { defaultValue: 'Sell Price' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.bid ?? -1,
      renderCell: (data) => formatPrice(data.bid, data.row.digit),
    },
    {
      key: 'buyPrice',
      label: t('market.columns.buyPrice', { defaultValue: 'Buy Price' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.ask ?? -1,
      renderCell: (data) => formatPrice(data.ask, data.row.digit),
    },
    {
      key: 'spread',
      label: t('market.spread', { defaultValue: 'Spread' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.spread ?? -1,
      renderCell: (data) => (data.spread == null ? '--' : String(data.spread)),
    },
    {
      key: 'volume',
      label: t('market.columns.volume', { defaultValue: 'Volume' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.volume,
      renderCell: (data) => formatVolume(data.volume),
    },
    {
      key: 'sellPercent',
      label: t('market.columns.sellPercent', { defaultValue: 'Sell%' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.sellPercent ?? -1,
      renderCell: (data) => (
        <span className={cn(data.sellPercent == null ? 'text-muted-foreground' : 'text-red-500')}>
          {data.sellPercent == null
            ? '--'
            : data.sellPercent === 0
              ? '0.00%'
              : `${data.sellPercent.toFixed(2)}%`}
        </span>
      ),
    },
    {
      key: 'buyPercent',
      label: t('market.columns.buyPercent', { defaultValue: 'Buy%' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.buyPercent ?? -1,
      renderCell: (data) => (
        <span className={cn(data.buyPercent == null ? 'text-muted-foreground' : 'text-green-500')}>
          {data.buyPercent == null
            ? '--'
            : data.buyPercent === 0
              ? '0.00%'
              : `${data.buyPercent.toFixed(2)}%`}
        </span>
      ),
    },
    {
      key: 'changePercent',
      label: t('market.columns.changePercent', { defaultValue: 'Chg%' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.changePercent ?? -1,
      renderCell: (data) => (
        <span className="flex flex-col items-end">
          <span className={cn('tabular-nums', getPercentClass(data.changePercent))}>
            {formatSignedPercent(data.changePercent)}
          </span>
          <MarketChangeMiniChart
            candles={miniChartBySymbol.get(data.row.symbol) || []}
            positive={(data.changePercent ?? 0) >= 0}
          />
        </span>
      ),
    },
    {
      key: 'low',
      label: t('market.columns.low', { defaultValue: 'Low' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.low ?? -1,
      renderCell: (data) => formatStatValue(data.low, data.row.digit),
    },
    {
      key: 'high',
      label: t('market.columns.high', { defaultValue: 'High' }),
      widthClass: MARKET_EQUAL_COLUMN_WIDTH,
      align: 'right',
      getSortValue: (data) => data.high ?? -1,
      renderCell: (data) => formatStatValue(data.high, data.row.digit),
    },
  ];
}

export default function MarketWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useMarketViewModel();

  const [activeTab, setActiveTab] = useState(MARKET_WEB_DEFAULT_TAB);
  const [marketOpenOnly, setMarketOpenOnly] = useState(true);
  const [sortState, setSortState] = useState<DataTableSortState<SortColumn> | undefined>(undefined);
  const handleSortChange = useCallback((next: DataTableSortState<SortColumn>) => {
    setSortState((previous) => {
      if (
        previous &&
        previous.column === next.column &&
        previous.direction === 'desc' &&
        next.direction === 'asc'
      ) {
        return undefined;
      }

      return next;
    });
  }, []);

  const resolvedActiveTab = useMemo(() => {
    if (vm.tabs.length === 0) return MARKET_WEB_DEFAULT_TAB;
    return vm.tabs.some((tab) => tab.id === activeTab) ? activeTab : vm.tabs[0].id;
  }, [activeTab, vm.tabs]);

  const rows = useMemo(
    () => vm.getRowsByTab(resolvedActiveTab, { marketOpenOnly: false, search: '' }),
    [resolvedActiveTab, vm],
  );
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const visibleSymbols = useMemo(
    () => rows.map((row) => ({ symbol: row.symbol, id: row.id })).filter((s) => Boolean(s.symbol)),
    [rows],
  );
  const visibleAssetIds = useMemo(
    () => rows.map((row) => row.id).filter((id): id is string => Boolean(id)),
    [rows],
  );
  const { data: marketDataById = {} } = useAssetsMarketData(
    visibleAssetIds,
    visibleAssetIds.length > 0,
  );
  useSymbols(visibleSymbols, visibleSymbols.length > 0);
  const symbolsForMiniCharts = useMemo(
    () => Array.from(new Set(rows.map((row) => row.symbol).filter(Boolean))),
    [rows],
  );
  const { data: miniChartData = [] } = useMiniChartData({
    enabled: symbolsForMiniCharts.length > 0,
    limit: MARKET_WEB_MINI_CHART_LIMIT,
    symbols: symbolsForMiniCharts,
    timeframe: MARKET_WEB_KLINE_H1_SECONDS,
  });
  const miniChartBySymbol = useMemo(
    () => new Map(miniChartData.map((item) => [item.symbol, item.candles] as const)),
    [miniChartData],
  );
  const marketTableColumns = useMemo(
    () => getMarketTableColumns(t, miniChartBySymbol),
    [miniChartBySymbol, t],
  );
  const resolvedRows = useMemo(
    () =>
      rows
        .map((row) =>
          resolveRowMetrics(row, rtBySymbol?.[row.symbol], marketDataById[row.id]),
        )
        .filter((resolved) => {
          if (!marketOpenOnly) return true;
          return isCategoryOpenByOtcRule(resolved.row.categoryCode);
        }),
    [marketDataById, marketOpenOnly, rows, rtBySymbol],
  );
  const sortedRows = useMemo(() => {
    if (!sortState) {
      return resolvedRows;
    }

    const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;
    const selectedColumn = marketTableColumns.find((column) => column.key === sortState.column);

    if (!selectedColumn) {
      return resolvedRows;
    }

    return [...resolvedRows].sort((left, right) => {
      const leftValue = selectedColumn.getSortValue(left);
      const rightValue = selectedColumn.getSortValue(right);

      if (typeof leftValue === 'string' && typeof rightValue === 'string') {
        return leftValue.localeCompare(rightValue) * directionMultiplier;
      }

      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return 0;

      return (leftNumber - rightNumber) * directionMultiplier;
    });
  }, [marketTableColumns, resolvedRows, sortState]);
  return (
    <div className="mx-auto w-full">
      <div className="bg-background sticky top-[72px] z-20 mb-2 flex items-center justify-between gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
        <div className="no-scrollbar flex min-w-0 items-center gap-4 overflow-x-auto">
          {vm.tabs.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant="white-contained"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-body-large-medium h-auto shrink-0 cursor-pointer rounded-none border-b-2 bg-transparent py-3 capitalize shadow-none',
                resolvedActiveTab === tab.id
                  ? 'border-primary-500 text-primary-500 dark:text-primary-500 font-semibold'
                  : 'hover:text-primary-500 dark:hover:text-primary-500 !text-muted-foreground border-transparent',
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-3 py-2">
          <label className="text-body-large-medium inline-flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={marketOpenOnly}
              onCheckedChange={(checked) => setMarketOpenOnly(Boolean(checked))}
              className="border-neutral-300"
            />
            {t('market.statusOptions.marketOpen', { defaultValue: 'Market Open' })}
          </label>
          {/* <Button
            type="button"
            variant="white-contained"
            className="text-muted-foreground hover:text-foreground h-auto rounded-none bg-transparent p-0 shadow-none"
          >
            <Settings03 className="text-muted-foreground size-5" />
          </Button>
          <Button
            type="button"
            variant="white-contained"
            className="text-muted-foreground hover:text-foreground h-auto rounded-none bg-transparent p-0 shadow-none"
          >
            <LinkExternal01 className="text-muted-foreground size-5" />
          </Button> */}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="scrollbar-neutral-slim overflow-x-auto overflow-y-visible px-2 pr-3">
          <div
            data-slot="table-container"
            className="relative h-[calc(100dvh-135px)] min-h-0 w-full overflow-x-auto overflow-y-auto pb-3"
          >
            <DataTable
              columns={marketTableColumns}
              data={sortedRows}
              loading={vm.isLoading}
              loadingRowCount={10}
              sortState={sortState}
              onSortChange={handleSortChange}
              headerCellClassName="bg-background sticky top-0 z-10"
              tableClassName="table-fixed w-full min-w-[1220px] has-[table]:p-4"
              rowKey={(rowData) => rowData.row.id || rowData.row.symbol}
              onRowClick={(rowData) => {
                const symbol = rowData.row.symbol;
                if (!symbol) return;

                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('lastTradeSymbol', symbol);
                }
                router.push(`/trade/${encodeURIComponent(symbol)}`);
              }}
              emptyContent={t('market.noDataAvailable', { defaultValue: 'No data available' })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
