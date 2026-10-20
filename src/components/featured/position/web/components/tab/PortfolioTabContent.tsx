'use client';

import { useCallback, useMemo, useState } from 'react';
import { getIntlLocale } from '@/i18n/formatting';
import { cn } from '@/lib/utils';
import { getOwnershipPerformance } from '@/utils/ownershipPerformance';
import { useRouter } from 'next/navigation';
import { useAssetActionCounts } from '@/hook/useAssetActionCounts';
import { AssetActionBadge } from '@/features/asset-management/web/components/AssetActionBadge';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { useInfinitePortfolioItems } from '@/hook/usePortfolio';
import { useGetData } from '@/context/GetdataContext';
import {
  EmptyState,
  type SortDir,
  SortHeader,
  TableLoadingState,
  sortRows,
} from './PositionWebTableShared';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';

const PORTFOLIO_SORT_STORAGE_KEY = 'position:web:sort:portfolio';

type PortfolioSortKey =
  | 'symbol'
  | 'quantity'
  | 'currentPrice'
  | 'totalValue'
  | 'averageBuyPrice'
  | 'category';

type PortfolioSortState = {
  sortKey: PortfolioSortKey | null;
  sortDir: SortDir;
};

const DEFAULT_PORTFOLIO_SORT: PortfolioSortState = {
  sortKey: null,
  sortDir: 'asc',
};

function readPortfolioSort(storageKey: string): PortfolioSortState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PortfolioSortState>;
    const validKeys: PortfolioSortKey[] = [
      'symbol',
      'quantity',
      'currentPrice',
      'totalValue',
      'averageBuyPrice',
      'category',
    ];
    if (
      parsed.sortKey !== null &&
      parsed.sortKey !== undefined &&
      !validKeys.includes(parsed.sortKey)
    )
      return null;
    if (parsed.sortDir !== 'asc' && parsed.sortDir !== 'desc') return null;

    return { sortKey: parsed.sortKey ?? null, sortDir: parsed.sortDir };
  } catch {
    return null;
  }
}

function persistPortfolioSort(storageKey: string, value: PortfolioSortState) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

type PortfolioTabContentProps = {
  accountId: string;
};

/**
 * Displays real token balances from the account ledger as property ownership.
 */
export default function PortfolioTabContent({ accountId }: PortfolioTabContentProps) {
  const { t, i18n } = useTranslation();
  const formatNumber = (value: string | number, decimals = 0) =>
    Number(value).toLocaleString(getIntlLocale(i18n.resolvedLanguage ?? i18n.language), {
      maximumFractionDigits: decimals,
    });
  const router = useRouter();
  const { data: actionCounts } = useAssetActionCounts();
  const { assets } = useGetData();
  const [sortState, setSortState] = useState<PortfolioSortState>(
    () => readPortfolioSort(PORTFOLIO_SORT_STORAGE_KEY) ?? DEFAULT_PORTFOLIO_SORT,
  );

  const {
    data: portfolioData,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfinitePortfolioItems(
    {
      accountId,
      sortBy: sortState.sortKey || 'symbol',
      sortDir: sortState.sortDir,
    },
    20,
  );

  const allPortfolioItems = useMemo(
    () => portfolioData?.pages.flatMap((page) => page.data) ?? [],
    [portfolioData],
  );

  const sortedPortfolioItems = useMemo(() => {
    return sortRows(allPortfolioItems, sortState.sortKey, sortState.sortDir);
  }, [allPortfolioItems, sortState]);

  const handleSort = useCallback((key: string) => {
    const validKeys: PortfolioSortKey[] = [
      'symbol',
      'quantity',
      'currentPrice',
      'totalValue',
      'averageBuyPrice',
      'category',
    ];
    if (!validKeys.includes(key as PortfolioSortKey)) return;
    const typedKey = key as PortfolioSortKey;

    setSortState((prev) => {
      const newState: PortfolioSortState = {
        sortKey: typedKey,
        sortDir: prev.sortKey === typedKey && prev.sortDir === 'asc' ? 'desc' : 'asc',
      };
      persistPortfolioSort(PORTFOLIO_SORT_STORAGE_KEY, newState);
      return newState;
    });
  }, []);

  // (removed unused handleSellAsset)
  if (isLoading) {
    return <TableLoadingState />;
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {sortedPortfolioItems.length === 0 ? (
        <EmptyState
          title={t('portfolio.empty.title', { defaultValue: 'No Assets' })}
          description={t('portfolio.empty.description', {
            defaultValue: 'Start trading to build your portfolio',
          })}
        />
      ) : (
        <div className="overflow-hidden">
          <div className="border-border flex items-center justify-between border-b px-3 py-3">
            <div>
              <h2 className="text-foreground text-sm font-semibold">
                {t('portfolio.ownership.title', { defaultValue: 'Owned properties' })}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t('portfolio.ownership.description', {
                  defaultValue:
                    'Ownership is calculated from token balances recorded in your account ledger.',
                })}
              </p>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {sortedPortfolioItems.length}{' '}
              {t('portfolio.ownership.properties', { defaultValue: 'properties' })}
            </span>
          </div>
          <div className="scrollbar-neutral-slim overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-border bg-muted/20 border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                    <SortHeader
                      label={t('portfolio.table.asset', { defaultValue: 'Property' })}
                      sortKey="symbol"
                      currentSortKey={sortState.sortKey}
                      currentSortDir={sortState.sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                    <SortHeader
                      label={t('portfolio.table.quantity', { defaultValue: 'Tokens owned' })}
                      sortKey="quantity"
                      currentSortKey={sortState.sortKey}
                      currentSortDir={sortState.sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                    <SortHeader
                      label={t('portfolio.table.avgBuyPrice', { defaultValue: 'Ownership share' })}
                      sortKey="averageBuyPrice"
                      currentSortKey={sortState.sortKey}
                      currentSortDir={sortState.sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                    <SortHeader
                      label={t('portfolio.table.currentPrice', { defaultValue: 'Token valuation' })}
                      sortKey="currentPrice"
                      currentSortKey={sortState.sortKey}
                      currentSortDir={sortState.sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                    <SortHeader
                      label={t('portfolio.table.totalValue', {
                        defaultValue: 'Current property value',
                      })}
                      sortKey="totalValue"
                      currentSortKey={sortState.sortKey}
                      currentSortDir={sortState.sortDir}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                    {t('portfolio.table.actions', { defaultValue: 'Property actions' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPortfolioItems.map((item) => {
                  const fullAsset = assets?.find(
                    (a) => a.id === item.assetId || a.symbol === item.symbol,
                  );
                  const quantity = Number.parseFloat(item.quantity || '0');
                  const totalSupply = Number(fullAsset?.totalSupply || 0);
                  const ownershipPercent = totalSupply > 0 ? (quantity / totalSupply) * 100 : 0;
                  const performance = getOwnershipPerformance(item);
                  return (
                    <tr
                      key={item.assetId}
                      className="border-border hover:bg-muted/30 group border-b transition-colors last:border-b-0"
                    >
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-foreground text-sm font-semibold">{item.name}</span>
                          <span className="text-muted-foreground mt-1 max-w-[360px] truncate text-xs">
                            {item.symbol} · {fullAsset?.location || fullAsset?.propertyType || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col tabular-nums">
                          <span className="text-foreground font-semibold">
                            {formatNumber(item.quantity, 2)} token
                          </span>
                        </div>
                      </td>
                      <td className="text-foreground px-4 py-4 text-right font-medium tabular-nums">
                        {ownershipPercent.toLocaleString(undefined, { maximumFractionDigits: 4 })}%
                      </td>
                      <td className="text-foreground px-4 py-4 text-right font-semibold tabular-nums">
                        {formatNumber(item.currentPrice)} VND
                      </td>
                      <td
                        className={cn(
                          'px-4 py-4 text-right tabular-nums',
                          performance.percent == null || performance.percent === 0
                            ? 'text-foreground'
                            : performance.percent > 0
                              ? 'text-green-500'
                              : 'text-red-500',
                        )}
                      >
                        <p className="font-bold">{formatNumber(item.totalValue)} VND</p>
                        <p
                          className="mt-1 text-xs font-medium"
                          title={t('portfolio.ownership.returnBasis')}
                        >
                          {performance.percent == null
                            ? t('portfolio.ownership.noCostBasis')
                            : t('portfolio.ownership.returnSincePurchase', {
                                percent: performance.percent.toLocaleString(
                                  getIntlLocale(i18n.resolvedLanguage ?? i18n.language),
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                    signDisplay: 'exceptZero',
                                  },
                                ),
                              })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="neutral-outline"
                            className="h-8 rounded-md px-3"
                            onClick={() => router.push(`/asset-management/${item.assetId}`)}
                          >
                            {t('portfolio.actions.viewProperty', { defaultValue: 'View property' })}
                            <AssetActionBadge count={actionCounts?.[item.assetId]?.total} />
                          </Button>
                          <Button
                            variant="neutral-outline"
                            className="h-8 rounded-md px-3"
                            onClick={() => router.push(`/trade/${item.symbol}`)}
                          >
                            {t('portfolio.actions.trade', { defaultValue: 'Buy / Sell' })}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isFetchingNextPage && <LoadingMoreTableSkeleton rows={3} columns={5} />}

          {hasNextPage && (
            <Button
              variant="neutral-outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-4 w-full"
            >
              {isFetchingNextPage
                ? t('common.loading', { defaultValue: 'Loading...' })
                : t('common.loadMore', { defaultValue: 'Load More' })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
