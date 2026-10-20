'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DecimalValue } from '@/types/decimal';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
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
import { useAssetsMarketData } from '@/hook/useAssetsMarketData';
import { useSymbols } from '@/hook/useSymbols';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import type { AssetMarketData } from '@/types/assets';
import { useClaimableDividends, useClaimDividend } from '@/hook/useDividends';
import { useAuthStore } from '@/store/authStore';

const MARKET_WEB_DEFAULT_TAB = 'popular';
const MARKET_SYMBOL_COLUMN_WIDTH = 'w-[24%] min-w-[260px]';
const MARKET_VALUE_COLUMN_WIDTH = 'w-[8.44%] min-w-[104px]';
const MARKET_VALUE_CELL_CLASS = 'overflow-hidden whitespace-nowrap tabular-nums';
type SortColumn =
  | 'symbol'
  | 'lastPrice'
  | 'sellPrice'
  | 'buyPrice'
  | 'spread'
  | 'volume'
  | 'quoteVolume'
  | 'changePercent'
  | 'low'
  | 'high'
  | 'monthlyRent'
  | 'expectedApy'
  | 'rentalStatus'
  | 'dueDay'
  | 'buyoutProgress'
  | 'buyoutMonthlyReturn'
  | 'buyoutPremium'
  | 'buyoutNextPayment'
  | 'buyoutNextDate'
  | 'buyoutBuyer';

type MarketTicker = {
  ask?: DecimalValue;
  bid?: DecimalValue;
  changePercent?: DecimalValue;
  lastPrice?: DecimalValue;
  quoteVolume?: DecimalValue;
  volume?: DecimalValue;
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
  changePercent?: number;
  high?: DecimalValue;
  lastPrice?: DecimalValue;
  low?: DecimalValue;
  quoteVolume: number;
  row: MarketRowVM;
  spread?: number;
  volume: number;
};

type MarketTableColumn = DataTableColumn<ResolvedMarketRow, SortColumn> & {
  getSortValue: (data: ResolvedMarketRow) => number | string;
};
type TranslateFn = (
  key: string,
  options?: { defaultValue?: string; [key: string]: unknown },
) => string;

function getPercentClass(value: number | undefined): string {
  const safe = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(safe)) return 'text-muted-foreground';
  if (safe > 0) return 'text-green-500';
  if (safe < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

function normalizePropertyType(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getPropertyTypeClass(value?: string): string {
  const normalized = normalizePropertyType(value);
  if (normalized.includes('van phong') || normalized.includes('office')) {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
  }
  if (
    normalized.includes('can ho') ||
    normalized.includes('nha o') ||
    normalized.includes('residential') ||
    normalized.includes('villa') ||
    normalized.includes('biet thu')
  ) {
    return 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300';
  }
  if (
    normalized.includes('khach san') ||
    normalized.includes('nghi duong') ||
    normalized.includes('hotel') ||
    normalized.includes('hospitality')
  ) {
    return 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300';
  }
  if (
    normalized.includes('cong nghiep') ||
    normalized.includes('kho') ||
    normalized.includes('industrial') ||
    normalized.includes('logistics')
  ) {
    return 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300';
  }
  if (
    normalized.includes('ban le') ||
    normalized.includes('thuong mai') ||
    normalized.includes('retail')
  ) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300';
  }
  if (normalized.includes('dat') || normalized.includes('land')) {
    return 'bg-stone-100 text-stone-700 dark:bg-stone-500/15 dark:text-stone-300';
  }
  return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300';
}

function getTradingStatusLabel(status: MarketRowVM['tradingStatus'], t: TranslateFn): string {
  if (status === 'OPEN') return t('market.assetStatus.open', { defaultValue: 'Trading' });
  if (status === 'BUYOUT_ACTIVE')
    return t('market.assetStatus.buyoutActive', { defaultValue: 'Buyout active' });
  if (status === 'PAUSED') return t('market.assetStatus.paused', { defaultValue: 'Paused' });
  return t('market.assetStatus.closed', { defaultValue: 'Closed' });
}

function getTradingStatusClass(status: MarketRowVM['tradingStatus']): string {
  if (status === 'OPEN') {
    return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
  }
  if (status === 'PAUSED') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  }
  if (status === 'BUYOUT_ACTIVE') {
    return 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300';
  }
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300';
}

function normalizeDigits(digit: number | undefined): number {
  if (!Number.isFinite(digit)) return 2;
  return Math.max(0, Math.min(12, Math.trunc(Number(digit))));
}

function formatPrice(value: DecimalValue | undefined, digit: number): string {
  const resolvedDigits = normalizeDigits(digit);
  const safe = toFiniteNumberFromNumberish(value);
  if (safe == null) return '--';
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits,
  });
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
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits,
  });
}

function formatVolume(value: number | undefined): string {
  if (!Number.isFinite(value)) return '-';
  const safe = Number(value);
  if (safe >= 1_000_000_000) return `${(safe / 1_000_000_000).toFixed(2)}B`;
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(2)}M`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(2)}K`;
  return safe.toFixed(2);
}

function formatVnd(value: number | undefined): string {
  if (!Number.isFinite(value)) return '—';
  return `${Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND`;
}

function calculateSpread(
  ask: DecimalValue | undefined,
  bid: DecimalValue | undefined,
): number | undefined {
  const safeAsk = toFiniteNumberFromNumberish(ask);
  const safeBid = toFiniteNumberFromNumberish(bid);
  if (safeAsk == null || safeBid == null) return undefined;
  return Math.abs(safeAsk - safeBid);
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
  const hasTakerVolume = Number.isFinite(takerBuyVolume24h) || Number.isFinite(takerSellVolume24h);
  const totalVolume = hasTakerVolume
    ? (takerBuyVolume24h ?? 0) + (takerSellVolume24h ?? 0)
    : (tickerVolume ?? toFiniteNumberFromNumberish(marketData?.volume) ?? 0);
  const lastPrice =
    toFiniteNumberFromNumberish(ticker?.lastPrice) ??
    (row.lastPriceValue > 0 ? row.lastPriceValue : undefined);
  const quoteVolume =
    toFiniteNumberFromNumberish(ticker?.quoteVolume) ?? totalVolume * (lastPrice ?? 0);
  const spread = toFiniteNumberFromNumberish(marketData?.spread);

  return {
    ask: resolvedAsk,
    bid: resolvedBid,
    changePercent: resolvedChangePercent,
    high: resolvedHigh,
    lastPrice,
    low: resolvedLow,
    quoteVolume,
    row,
    spread: spread ?? calculateSpread(resolvedAsk, resolvedBid),
    volume: totalVolume,
  };
}

function getMarketTableColumns(t: TranslateFn): MarketTableColumn[] {
  return [
    {
      key: 'symbol',
      label: t('market.columns.symbol', { defaultValue: 'Symbol' }),
      widthClass: MARKET_SYMBOL_COLUMN_WIDTH,
      cellClassName: 'overflow-hidden',
      align: 'left',
      getSortValue: (data) => data.row.name || data.row.symbol,
      renderCell: (data) => (
        <div className="flex min-w-0 items-center gap-2 py-1">
          <ToggleFavouriteAsset
            assetId={data.row.id}
            size={16}
            className="h-4 w-4 shrink-0 p-0"
            defaultIsFavorite={data.row.isFavorite}
          />
          <div className="ml-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className="text-body-small-medium text-foreground truncate"
                title={data.row.symbol}
              >
                {data.row.symbol}
              </p>
            </div>
            <p
              className="text-body-caption-medium text-muted-foreground truncate"
              title={data.row.name}
            >
              {data.row.name} · NAV {formatPrice(data.row.referencePriceValue, data.row.digit)}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              {data.row.propertyType && (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    getPropertyTypeClass(data.row.propertyType),
                  )}
                >
                  {data.row.propertyType}
                </span>
              )}
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  getTradingStatusClass(data.row.tradingStatus),
                )}
              >
                {getTradingStatusLabel(data.row.tradingStatus, t)}
              </span>
              {data.row.buyoutPremiumPercent !== undefined && (
                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  {t('market.buyout.premiumBadge', {
                    defaultValue: 'Buyout +{{premium}}% · {{months}}m',
                    premium: data.row.buyoutPremiumPercent,
                    months: data.row.buyoutMonthsRemaining ?? 0,
                  })}
                </span>
              )}
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  data.ask != null && data.bid != null
                    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
                )}
              >
                {data.ask != null && data.bid != null
                  ? t('market.liquidity.available', { defaultValue: 'Liquid' })
                  : t('market.liquidity.low', { defaultValue: 'Low liquidity' })}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'lastPrice',
      label: t('market.columns.lastPrice', { defaultValue: 'Last' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.lastPrice ?? -1,
      renderCell: (data) => formatPrice(data.lastPrice, data.row.digit),
    },
    {
      key: 'sellPrice',
      label: t('market.columns.bestBid', { defaultValue: 'Best Bid' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.bid ?? -1,
      renderCell: (data) => formatPrice(data.bid, data.row.digit),
    },
    {
      key: 'buyPrice',
      label: t('market.columns.bestAsk', { defaultValue: 'Best Ask' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.ask ?? -1,
      renderCell: (data) => formatPrice(data.ask, data.row.digit),
    },
    {
      key: 'spread',
      label: t('market.spread', { defaultValue: 'Spread' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.spread ?? -1,
      renderCell: (data) => formatPrice(data.spread, data.row.digit),
    },
    {
      key: 'volume',
      label: t('market.columns.volume', { defaultValue: 'Volume' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.volume,
      renderCell: (data) => formatVolume(data.volume),
    },
    {
      key: 'quoteVolume',
      label: t('market.columns.turnover', { defaultValue: 'Turnover' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.quoteVolume,
      renderCell: (data) => formatVolume(data.quoteVolume),
    },
    {
      key: 'changePercent',
      label: t('market.columns.changePercent', { defaultValue: 'Chg%' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.changePercent ?? -1,
      renderCell: (data) => (
        <span className="flex flex-col items-end">
          <span className={cn('tabular-nums', getPercentClass(data.changePercent))}>
            {formatSignedPercent(data.changePercent)}
          </span>
        </span>
      ),
    },
    {
      key: 'low',
      label: t('market.columns.low', { defaultValue: 'Low' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.low ?? -1,
      renderCell: (data) => formatStatValue(data.low, data.row.digit),
    },
    {
      key: 'high',
      label: t('market.columns.high', { defaultValue: 'High' }),
      widthClass: MARKET_VALUE_COLUMN_WIDTH,
      cellClassName: MARKET_VALUE_CELL_CLASS,
      align: 'right',
      getSortValue: (data) => data.high ?? -1,
      renderCell: (data) => formatStatValue(data.high, data.row.digit),
    },
  ];
}

function getRentalTableColumns(t: TranslateFn): MarketTableColumn[] {
  return [
    getMarketTableColumns(t)[0],
    {
      key: 'rentalStatus',
      label: t('market.rental.status', { defaultValue: 'Trạng thái thuê' }),
      widthClass: 'w-[14%] min-w-[150px]',
      align: 'left',
      getSortValue: (data) => data.row.rentalStatus ?? '',
      renderCell: (data) => (
        <span
          className={cn(
            'inline-flex rounded px-2 py-1 text-xs font-medium',
            data.row.rentalStatus === 'RENTED'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : data.row.rentalStatus === 'VOTING'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : data.row.rentalStatus === 'PENDING_FUNDING'
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          )}
        >
          {t(`market.rental.statuses.${data.row.rentalStatus}`, {
            defaultValue:
              data.row.rentalStatus === 'RENTED'
                ? 'Đang cho thuê'
                : data.row.rentalStatus === 'VOTING'
                  ? 'Đang biểu quyết'
                  : data.row.rentalStatus === 'PENDING_FUNDING'
                    ? 'Chờ nạp tiền'
                    : 'Đang nhận hồ sơ',
          })}
        </span>
      ),
    },
    {
      key: 'monthlyRent',
      label: t('market.rental.monthlyRent', { defaultValue: 'Tiền thuê / tháng' }),
      widthClass: 'w-[16%] min-w-[180px]',
      align: 'right',
      getSortValue: (data) => data.row.monthlyRentVnd ?? -1,
      renderCell: (data) => formatVnd(data.row.monthlyRentVnd),
    },
    {
      key: 'expectedApy',
      label: t('market.rental.expectedApy', { defaultValue: 'Lợi suất dự kiến' }),
      widthClass: 'w-[12%] min-w-[135px]',
      align: 'right',
      getSortValue: (data) => data.row.expectedApy ?? -1,
      renderCell: (data) =>
        data.row.expectedApy ? `${data.row.expectedApy.toFixed(2)}% / năm` : '—',
    },
    {
      key: 'dueDay',
      label: t('market.rental.paymentCycle', { defaultValue: 'Chu kỳ thanh toán' }),
      widthClass: 'w-[14%] min-w-[160px]',
      align: 'right',
      getSortValue: (data) => data.row.rentalDueDay ?? -1,
      renderCell: (data) =>
        data.row.rentalDueDay
          ? t('market.rental.dueDay', {
              day: data.row.rentalDueDay,
              defaultValue: 'Ngày {{day}} hàng tháng',
            })
          : '—',
    },
    {
      key: 'lastPrice',
      label: t('market.columns.lastPrice', { defaultValue: 'Giá token' }),
      widthClass: 'w-[14%] min-w-[150px]',
      align: 'right',
      getSortValue: (data) => data.lastPrice ?? -1,
      renderCell: (data) => `${formatPrice(data.lastPrice, data.row.digit)} VND`,
    },
  ];
}

function getBuyoutTableColumns(t: TranslateFn, locale: string): MarketTableColumn[] {
  return [
    {
      key: 'symbol',
      label: t('market.columns.symbol', { defaultValue: 'Tài sản' }),
      widthClass: 'w-[24%] min-w-[260px]',
      cellClassName: 'overflow-hidden',
      align: 'left',
      getSortValue: (data) => data.row.name || data.row.symbol,
      renderCell: (data) => (
        <div className="min-w-0 py-1">
          <p className="text-foreground truncate text-sm font-semibold">{data.row.symbol}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {data.row.name}
            {data.row.location ? ` · ${data.row.location}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'buyoutBuyer',
      label: t('market.buyout.buyer', { defaultValue: 'Người thâu tóm' }),
      widthClass: 'w-[12%] min-w-[130px]',
      align: 'left',
      getSortValue: (data) => data.row.buyoutBuyerGuestNumber ?? -1,
      renderCell: (data) =>
        t('market.buyout.guestBuyer', {
          number: data.row.buyoutBuyerGuestNumber ?? '—',
          defaultValue: 'Guest {{number}}',
        }),
    },
    {
      key: 'lastPrice',
      label: t('market.buyout.lockedPrice', { defaultValue: 'Giá đã khóa' }),
      widthClass: 'w-[13%] min-w-[155px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutPrincipalUnitPrice ?? -1,
      renderCell: (data) => formatVnd(data.row.buyoutPrincipalUnitPrice),
    },
    {
      key: 'buyoutMonthlyReturn',
      label: t('market.buyout.monthlyReturn', { defaultValue: 'Quyền lợi / tháng' }),
      widthClass: 'w-[12%] min-w-[145px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutMonthlyWaitingRatePercent ?? -1,
      renderCell: (data) =>
        data.row.buyoutMonthlyWaitingRatePercent == null
          ? '—'
          : `+${data.row.buyoutMonthlyWaitingRatePercent.toFixed(2)}%`,
    },
    {
      key: 'buyoutPremium',
      label: t('market.buyout.totalPremium', { defaultValue: 'Thưởng toàn kỳ' }),
      widthClass: 'w-[11%] min-w-[130px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutPremiumPercent ?? -1,
      renderCell: (data) =>
        data.row.buyoutPremiumPercent == null
          ? '—'
          : `${data.row.buyoutPremiumPercent.toFixed(2)}%`,
    },
    {
      key: 'buyoutProgress',
      label: t('market.buyout.progress', { defaultValue: 'Tiến độ' }),
      widthClass: 'w-[13%] min-w-[150px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutMonthsCompleted ?? -1,
      renderCell: (data) => {
        const completed = data.row.buyoutMonthsCompleted ?? 0;
        const total = data.row.buyoutTotalMonths ?? 0;
        const percent = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
        return (
          <div className="ml-auto w-28">
            <span className="text-foreground block text-xs tabular-nums">
              {t('market.buyout.progressValue', {
                completed,
                total,
                defaultValue: '{{completed}}/{{total}} tháng',
              })}
            </span>
            <span className="bg-muted mt-1 block h-1 overflow-hidden">
              <span className="bg-primary block h-full" style={{ width: `${percent}%` }} />
            </span>
          </div>
        );
      },
    },
    {
      key: 'buyoutNextPayment',
      label: t('market.buyout.nextPayment', { defaultValue: 'Kỳ trả tiếp theo' }),
      widthClass: 'w-[14%] min-w-[170px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutNextPaymentVnd ?? -1,
      renderCell: (data) => formatVnd(data.row.buyoutNextPaymentVnd),
    },
    {
      key: 'buyoutNextDate',
      label: t('market.buyout.nextDate', { defaultValue: 'Ngày chốt kỳ' }),
      widthClass: 'w-[12%] min-w-[145px]',
      align: 'right',
      getSortValue: (data) => data.row.buyoutNextRecordAt ?? '',
      renderCell: (data) =>
        data.row.buyoutNextRecordAt
          ? new Date(data.row.buyoutNextRecordAt).toLocaleDateString(locale)
          : '—',
    },
  ];
}

export default function MarketWebScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const vm = useMarketViewModel();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: rentalClaims = [] } = useClaimableDividends('RENTAL_INCOME', isAuthenticated);
  const claimRentalIncome = useClaimDividend();

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
  const isRentalTab = resolvedActiveTab === 'rental';
  const isBuyoutTab = resolvedActiveTab === 'buyout';
  const locale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US';
  const marketTableColumns = useMemo(
    () =>
      isRentalTab
        ? getRentalTableColumns(t)
        : isBuyoutTab
          ? getBuyoutTableColumns(t, locale)
          : getMarketTableColumns(t),
    [isBuyoutTab, isRentalTab, locale, t],
  );
  const resolvedRows = useMemo(
    () =>
      rows
        .map((row) => resolveRowMetrics(row, rtBySymbol?.[row.symbol], marketDataById[row.id]))
        .filter((resolved) => {
          if (!marketOpenOnly) return true;
          return (
            resolved.row.isActive && ['OPEN', 'BUYOUT_ACTIVE'].includes(resolved.row.tradingStatus)
          );
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

      {isRentalTab && (
        <div className="border-border mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <div>
            <h2 className="text-foreground text-sm font-semibold">
              {t('market.rental.title', { defaultValue: 'Tài sản cho thuê' })}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t('market.rental.description', {
                defaultValue:
                  'Tiền thuê được người thuê nộp theo tháng, sau đó chia theo tỷ lệ token tại thời điểm chốt sổ.',
              })}
            </p>
          </div>
          {rentalClaims.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-muted-foreground text-xs">
                {t('market.rental.claimable', { defaultValue: 'Thu nhập có thể nhận' })}
              </span>
              {rentalClaims.map((claim) => (
                <Button
                  key={claim.id}
                  type="button"
                  variant="primary-contained"
                  disabled={claimRentalIncome.isPending}
                  onClick={() => claimRentalIncome.mutate(claim.distributionId)}
                  className="h-8 px-3 text-xs"
                >
                  {claimRentalIncome.isPending &&
                  claimRentalIncome.variables === claim.distributionId
                    ? t('dividends.claiming', { defaultValue: 'Đang nhận...' })
                    : `${t('dividends.claim', { defaultValue: 'Nhận' })} ${formatVnd(Number(claim.amount))}`}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {isBuyoutTab && (
        <div className="border-border mx-4 mb-3 flex items-end justify-between gap-3 border-b py-3">
          <div>
            <h2 className="text-foreground text-sm font-semibold">
              {t('market.buyout.title', { defaultValue: 'Tài sản đang được thâu tóm' })}
            </h2>
            <p className="text-muted-foreground mt-0.5 max-w-3xl text-xs">
              {t('market.buyout.description', {
                defaultValue:
                  'Giá mua đã được khóa. Cổ đông còn lại vẫn có thể giao dịch và nhận quyền lợi chờ theo từng kỳ.',
              })}
            </p>
          </div>
        </div>
      )}

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
              tableClassName="table-fixed w-full min-w-[1320px] has-[table]:p-4"
              rowKey={(rowData) => rowData.row.id || rowData.row.symbol}
              onRowClick={(rowData) => {
                const symbol = rowData.row.symbol;
                if (!symbol) return;

                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('lastTradeSymbol', symbol);
                }
                router.push(
                  isRentalTab
                    ? `/rentals/${encodeURIComponent(symbol)}`
                    : isBuyoutTab
                      ? `/buyout-trading/${encodeURIComponent(symbol)}`
                      : `/trade/${encodeURIComponent(symbol)}`,
                );
              }}
              emptyContent={t('market.noDataAvailable', { defaultValue: 'No data available' })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
