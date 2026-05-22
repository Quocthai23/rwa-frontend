'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import { useInfinitePortfolioItems } from '@/hook/usePortfolio';
import { useToast } from '@/hook/useToast';
import { useClaimableDividends, useClaimDividend } from '@/hook/useDividends';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useGetData } from '@/context/GetdataContext';
import type { PortfolioItem } from '@/types/portfolio';
import { ArrowDown, ArrowUp, Check, Copy01, InfoCircle, Share04, X } from '@untitledui/icons';
import { Decimal } from 'decimal.js';
import {
  EmptyState,
  type RtBySymbol,
  type SortDir,
  SortHeader,
  TableLoadingState,
  formatDecimal,
  sideLabel,
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
  rtBySymbol: RtBySymbol;
  onSellClick?: (item: PortfolioItem, currentPrice: number) => void;
};

/**
 * Portfolio Tab - displays user's asset holdings for Spot trading
 * Replaces Position-based view with portfolio/asset management
 */
export default function PortfolioTabContent({
  accountId,
  rtBySymbol,
  onSellClick,
}: PortfolioTabContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
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

  const handleSellAsset = (item: PortfolioItem) => {
    // Navigate to trade panel with pre-filled sell order
    router.push(`/chart?symbol=${item.symbol}&side=SELL`);
  };

  if (isLoading) {
    return <TableLoadingState />;
  }

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Claimable Dividends Section */}
      {claimableDividends && claimableDividends.length > 0 && (
        <div className="border-border bg-card mb-4 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-primary-500/10 p-1.5 rounded-lg">
              <span className="text-primary-500 font-semibold text-lg">💰</span>
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
                    ${formatDecimal(div.amount, '-', 2)} <span className="text-xs text-muted-foreground font-normal">USDT</span>
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
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="px-2 py-2 text-left">
                  <SortHeader
                    label={t('portfolio.table.asset', { defaultValue: 'Asset' })}
                    sortKey="symbol"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-right">
                  <SortHeader
                    label={t('portfolio.table.quantity', { defaultValue: 'Quantity' })}
                    sortKey="quantity"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-right">
                  <SortHeader
                    label={t('portfolio.table.avgBuyPrice', { defaultValue: 'Avg Buy Price' })}
                    sortKey="averageBuyPrice"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-right">
                  <SortHeader
                    label={t('portfolio.table.currentPrice', { defaultValue: 'Current Price' })}
                    sortKey="currentPrice"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-right">
                  <SortHeader
                    label={t('portfolio.table.totalValue', { defaultValue: 'Total Value' })}
                    sortKey="totalValue"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-right">
                  <SortHeader
                    label={t('portfolio.table.profitLoss', { defaultValue: 'Profit/Loss' })}
                    sortKey="profitLoss"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-left">
                  <SortHeader
                    label={t('portfolio.table.category', { defaultValue: 'Category' })}
                    sortKey="category"
                    currentSortKey={sortState.sortKey}
                    currentSortDir={sortState.sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-2 py-2 text-center">
                  {t('portfolio.table.actions', { defaultValue: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPortfolioItems.map((item) => {
                const pnlNum = Number.parseFloat(item.profitLoss || '0');
                const pnlClass = pnlNum > 0 ? 'text-success-500' : pnlNum < 0 ? 'text-error-500' : '';

                return (
                  <tr key={item.assetId} className="border-border border-b hover:bg-muted/50">
                    <td className="px-2 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{item.symbol}</span>
                        {item.name && (
                          <span className="text-muted-foreground text-xs">({item.name})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      {formatDecimal(item.quantity, '-', 8)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      ${formatDecimal(item.averageBuyPrice, '-', 8)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      ${formatDecimal(item.currentPrice, '-', 8)}
                    </td>
                    <td className="px-2 py-3 text-right tabular-nums">
                      ${formatDecimal(item.totalValue, '-', 2)}
                    </td>
                    <td className={cn('px-2 py-3 text-right tabular-nums', pnlClass)}>
                      <div className="flex items-center justify-end gap-1">
                        {pnlNum >= 0 ? (
                          <ArrowUp size={16} className="text-success-500" />
                        ) : (
                          <ArrowDown size={16} className="text-error-500" />
                        )}
                        ${formatDecimal(Math.abs(pnlNum), '-', 2)}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-2 py-3 text-left text-xs">
                      {item.category || '-'}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <Button
                        variant="primary-outline"
                        onClick={() => handleSellAsset(item)}
                        title={t('portfolio.actions.sell', { defaultValue: 'Sell' })}
                      >
                        {t('portfolio.actions.sell', { defaultValue: 'Sell' })}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

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
        </>
      )}
    </div>
  );
}
