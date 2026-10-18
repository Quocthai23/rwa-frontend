'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

import { Button } from '@/components/shared/atoms/button';
import { useInfinitePortfolioItems } from '@/hook/usePortfolio';
import { useClaimableDividends, useClaimDividend } from '@/hook/useDividends';
import { useGetData } from '@/context/GetdataContext';
import {
  EmptyState,
  type SortDir,
  SortHeader,
  TableLoadingState,
  formatDecimal,
  sortRows,
} from './PositionWebTableShared';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';

const PORTFOLIO_SORT_STORAGE_KEY = 'position:web:sort:portfolio';

type PortfolioSortKey = 'symbol' | 'quantity' | 'currentPrice' | 'totalValue' | 'profitLoss' | 'averageBuyPrice' | 'category';

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
    const validKeys: PortfolioSortKey[] = ['symbol', 'quantity', 'currentPrice', 'totalValue', 'profitLoss', 'averageBuyPrice', 'category'];
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
export default function PortfolioTabContent({
  accountId,
}: PortfolioTabContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { assets } = useGetData();
  const [sortState, setSortState] = useState<PortfolioSortState>(
    () => readPortfolioSort(PORTFOLIO_SORT_STORAGE_KEY) ?? DEFAULT_PORTFOLIO_SORT,
  );

  const { data: claimableDividends } = useClaimableDividends();
  const claimDividendMutation = useClaimDividend();

  const { data: portfolioData, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useInfinitePortfolioItems(
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
    return sortRows(
      allPortfolioItems,
      sortState.sortKey,
      sortState.sortDir,
    );
  }, [allPortfolioItems, sortState]);

  const handleSort = useCallback(
    (key: string) => {
      const validKeys: PortfolioSortKey[] = [
        'symbol',
        'quantity',
        'currentPrice',
        'totalValue',
        'profitLoss',
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
    },
    [],
  );

  // (removed unused handleSellAsset)
  if (isLoading) {
    return <TableLoadingState />;
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Claimable Dividends Section */}
      {claimableDividends && claimableDividends.length > 0 && (
        <div className="border-border bg-card mb-4 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-primary-500/10 p-1.5 rounded-lg">
              <span className="text-primary-500 font-semibold text-lg">đŸ’°</span>
            </div>
            <div>
              <h3 className="text-body-large-semibold text-foreground">
                {t('dividends.sectionTitle', { defaultValue: 'Claimable Dividends' })}
              </h3>
              <p className="text-body-small-regular text-muted-foreground">
                {t('dividends.sectionDescription', { defaultValue: 'Real estate rental yields accumulated on your assets' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {claimableDividends.map((div) => (
              <div
                key={div.id}
                className="bg-muted/40 border-border flex items-center justify-between rounded-lg border p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-medium-semibold text-foreground truncate">
                      {div.distribution?.asset?.symbol || 'Asset'}
                    </span>
                    <span className="text-body-small-regular text-muted-foreground truncate">
                      {div.distribution?.asset?.name}
                    </span>
                  </div>
                  <div className="text-primary-500 text-h3-semibold mt-1">
                    VNĐ {formatDecimal(div.amount, '-', 2)} <span className="text-xs text-muted-foreground font-normal">VNDT</span>
                  </div>
                </div>
                <Button
                  variant="primary-contained"
                  disabled={claimDividendMutation.isPending}
                  onClick={() => claimDividendMutation.mutate(div.distributionId)}
                  className="px-4 py-2 text-sm font-semibold text-white dark:text-black shrink-0"
                >
                  {claimDividendMutation.isPending && claimDividendMutation.variables === div.distributionId
                    ? t('dividends.claiming', { defaultValue: 'Claiming...' })
                    : t('dividends.claim', { defaultValue: 'Claim' })}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  defaultValue: 'Ownership is calculated from token balances recorded in your account ledger.',
                })}
              </p>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {sortedPortfolioItems.length} {t('portfolio.ownership.properties', { defaultValue: 'properties' })}
            </span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-border border-b bg-muted/20">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.asset', { defaultValue: 'Property' })}
                    sortKey="symbol"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.quantity', { defaultValue: 'Tokens owned' })}
                    sortKey="quantity"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.avgBuyPrice', { defaultValue: 'Ownership share' })}
                    sortKey="averageBuyPrice"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.currentPrice', { defaultValue: 'Token valuation' })}
                    sortKey="currentPrice"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.totalValue', { defaultValue: 'Current property value' })}
                    sortKey="totalValue"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  <SortHeader
                    label={t('portfolio.table.profitLoss', { defaultValue: 'Est. annual income' })}
                    sortKey="profitLoss"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  {t('portfolio.table.actions', { defaultValue: 'Property actions' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPortfolioItems.map((item) => {
                const fullAsset = assets?.find(a => a.id === item.assetId || a.symbol === item.symbol);
                const quantity = Number.parseFloat(item.quantity || '0');
                const totalSupply = Number(fullAsset?.totalSupply || 0);
                const ownershipPercent = totalSupply > 0 ? (quantity / totalSupply) * 100 : 0;
                const expectedApy = Number(fullAsset?.expectedApy || 0);
                const annualIncome = Number(item.totalValue || 0) * expectedApy / 100;
                const gallery = Array.isArray(fullAsset?.gallery)
                  ? fullAsset.gallery
                  : typeof fullAsset?.gallery === 'string'
                    ? [fullAsset.gallery]
                    : [];
                const propertyImage = fullAsset?.logo || gallery[0];

                return (
                  <tr key={item.assetId} className="border-border border-b last:border-b-0 hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {propertyImage && (
                          <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-muted border border-border shrink-0">
                            <Image
                              src={propertyImage}
                              alt={item.name}
                              fill
                              unoptimized
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="font-semibold text-foreground text-base">{item.name}</span>
                          <span className="text-muted-foreground text-xs truncate max-w-[250px]">
                            {fullAsset?.location || item.symbol}
                          </span>
                          <span className="text-primary-500 mt-1 text-[11px] font-medium">
                            {fullAsset?.propertyType || 'Bất động sản token hóa'} · {item.symbol}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col tabular-nums">
                        <span className="font-semibold text-foreground">
                          {formatDecimal(item.quantity, '-', 2)} token
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums font-medium text-foreground">
                      {ownershipPercent.toLocaleString(undefined, { maximumFractionDigits: 4 })}%
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums font-semibold text-foreground">
                      {formatDecimal(item.currentPrice, '-', 0)} VNĐ
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums font-bold text-foreground">
                      {formatDecimal(item.totalValue, '-', 0)} VNĐ
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      <div className="font-medium text-foreground">
                        ≈ {formatDecimal(annualIncome, '-', 0)} VNĐ
                      </div>
                      <div className="text-muted-foreground text-xs">APY {expectedApy.toFixed(2)}%</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="neutral-outline"
                          className="h-8 rounded-lg border-primary/30 bg-primary/5 px-3 text-primary-500 hover:bg-primary/10"
                          onClick={() => router.push(`/asset-management/${item.assetId}`)}
                        >
                          {t('portfolio.actions.viewProperty', { defaultValue: 'View property' })}
                        </Button>
                        <Button
                          variant="primary-contained"
                          className="h-8 px-4 rounded-lg font-semibold"
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

          {isFetchingNextPage && <LoadingMoreTableSkeleton rows={3} columns={6} />}

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

