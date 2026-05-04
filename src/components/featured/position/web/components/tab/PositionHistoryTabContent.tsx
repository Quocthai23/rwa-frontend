'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Dialog, DialogContent } from '@/components/shared/atoms/dialog';
import { useInfinitePositions } from '@/hook/usePosition';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme/ThemeProvider';
import type { Position } from '@/types/position';
import { Check, Copy01, InfoCircle } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { CLOSED_BY, ORDER_SIDES, OrderStatus } from '@/types/orders';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';
import {
  EmptyState,
  type SortDir,
  SortHeader,
  SidePill,
  TableLoadingState,
  formatDateTime,
  formatDecimal,
} from './PositionWebTableShared';
import { getClosedByMap } from '../../../utils/mapping';
import { formatPositionDateTime } from '@/utils/dateUtils';
import type { HistoryRangeValue } from '@/components/featured/position/web/components/shared/HistoryDateRangePicker';
import { Button } from '@/components/shared/atoms/button';

const POSITION_HISTORY_SORT_STORAGE_KEY = 'position:web:sort:position-history';

type PositionHistorySortKey =
  | 'openedAt'
  | 'closedAt'
  | 'quantity'
  | 'symbol'
  | 'side'
  | 'realizedPnl';

type PositionHistorySortState = {
  sortKey: PositionHistorySortKey | null;
  sortDir: SortDir;
};

const DEFAULT_POSITION_HISTORY_SORT: PositionHistorySortState = {
  sortKey: null,
  sortDir: 'desc',
};

function readPositionHistorySort(storageKey: string): PositionHistorySortState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PositionHistorySortState>;
    const validKeys: PositionHistorySortKey[] = [
      'openedAt',
      'closedAt',
      'quantity',
      'symbol',
      'side',
      'realizedPnl',
    ];
    if (
      parsed.sortKey !== null &&
      parsed.sortKey !== undefined &&
      !validKeys.includes(parsed.sortKey)
    )
      return null;
    if (parsed.sortDir !== 'asc' && parsed.sortDir !== 'desc') return null;

    if (parsed.sortKey === null || parsed.sortKey === undefined) {
      return {
        sortKey: null,
        sortDir: DEFAULT_POSITION_HISTORY_SORT.sortDir,
      };
    }

    return { sortKey: parsed.sortKey, sortDir: parsed.sortDir };
  } catch {
    return null;
  }
}

function persistPositionHistorySort(storageKey: string, value: PositionHistorySortState) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function PositionHistoryTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onOpenDetail,
}: {
  rows: Position[];
  sortKey?: string | null;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  onOpenDetail?: (position: Position) => void;
}) {
  const { t } = useTranslation();
  const displayRows = rows;

  // Column width mappings: percentage-based
  const columnWidths = {
    symbol: 8,
    side: 7,
    lots: 10,
    openPrice: 12,
    closePrice: 12,
    fee: 10,
    swap: 10,
    pnl: 10,
    closedTime: 18,
  };

  const getColumnStyle = (columnKey: keyof typeof columnWidths) => {
    const width = columnWidths[columnKey];
    return { width: `${width}%` };
  };

  if (displayRows.length === 0)
    return (
      <EmptyState
        label={t('position.modal.positionHistory', { defaultValue: 'position history' })}
      />
    );

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };
  return (
    <table
      className="dark:bg-background min-w-280 flex-1 border-separate border-spacing-0 bg-white"
      style={{ tableLayout: 'fixed' }}
    >
      <thead className="dark:bg-card sticky top-0 z-10 bg-white">
        <tr className="text-body-small-regular border-border [&>th]:bg-muted border-b [&>th]:sticky [&>th]:top-0 [&>th]:z-20">
          <th className="px-2 py-2 text-left" style={getColumnStyle('symbol')}>
            {onSort ? (
              <SortHeader
                label={t('position.modal.symbol', { defaultValue: 'Symbol' })}
                sortKey="symbol"
                currentSortKey={sortKey || null}
                currentSortDir={sortDir || 'asc'}
                onSort={handleSort}
              />
            ) : (
              <span className="text-muted-foreground">
                {t('position.modal.symbol', { defaultValue: 'Symbol' })}
              </span>
            )}
          </th>
          {/* <th className="px-2 py-2 text-left font-normal text-neutral-500">Position ID</th> */}
          <th className="px-2 py-2 text-right" style={getColumnStyle('side')}>
            {onSort ? (
              <SortHeader
                label={t('position.modal.side', { defaultValue: 'Side' })}
                sortKey="side"
                currentSortKey={sortKey || null}
                currentSortDir={sortDir || 'asc'}
                onSort={handleSort}
              />
            ) : (
              <span className="text-muted-foreground">
                {t('position.modal.type', { defaultValue: 'Type' })}
              </span>
            )}
          </th>
          <th className="px-2 py-2 text-right" style={getColumnStyle('lots')}>
            {onSort ? (
              <SortHeader
                label={t('position.modal.lots', { defaultValue: 'Lot(s)' })}
                sortKey="quantity"
                currentSortKey={sortKey || null}
                currentSortDir={sortDir || 'asc'}
                onSort={handleSort}
              />
            ) : (
              <span className="text-muted-foreground">
                {t('position.modal.lots', { defaultValue: 'Lot(s)' })}
              </span>
            )}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('openPrice')}
          >
            {t('position.modal.openPrice', { defaultValue: 'Open Price' })}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('closePrice')}
          >
            {t('position.modal.closePrice', { defaultValue: 'Close Price' })}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('fee')}
          >
            {t('position.modal.fee', { defaultValue: 'Fee' })}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('swap')}
          >
            {t('position.modal.swap', { defaultValue: 'Swap' })}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('pnl')}
          >
            {onSort ? (
              <SortHeader
                label={t('position.modal.netPnl', { defaultValue: 'PnL' })}
                sortKey="realizedPnl"
                currentSortKey={sortKey || null}
                currentSortDir={sortDir || 'asc'}
                onSort={handleSort}
              />
            ) : (
              <span className="text-muted-foreground">
                {t('position.modal.netPnl', { defaultValue: 'PnL' })}
              </span>
            )}
          </th>
          <th
            className="text-muted-foreground px-2 py-2 text-right font-normal"
            style={getColumnStyle('closedTime')}
          >
            {onSort ? (
              <SortHeader
                label={t('position.modal.closedTime', { defaultValue: 'Closed Time' })}
                sortKey="closedAt"
                currentSortKey={sortKey || null}
                currentSortDir={sortDir || 'asc'}
                onSort={handleSort}
              />
            ) : (
              <span className="text-muted-foreground">
                {t('position.modal.closedTime', { defaultValue: 'Closed Time' })}
              </span>
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {displayRows.map((position) => (
          <tr
            key={position.id}
            className="text-body-small-medium border-border hover:bg-muted border-b transition-colors"
          >
            <td className="px-2 py-2" style={getColumnStyle('symbol')}>
              <div className="inline-flex items-center gap-1.5">
                <Button
                  variant="white-contained"
                  onClick={() => onOpenDetail?.(position)}
                  className="text-muted-foreground hover:text-primary-500 cursor-pointer transition-colors"
                >
                  <InfoCircle size={19} />
                </Button>
                <span>{position.symbol}</span>
                <span className="text-caption-regular dark:bg-primary-900 rounded bg-blue-50 px-1.5 py-0.5 text-blue-500 dark:text-blue-200">
                  {position.leverage}X
                </span>
              </div>
            </td>
            {/* <td className="px-2 py-2 text-neutral-700"># {position.id}</td> */}
            <td className="px-2 py-2 text-right" style={getColumnStyle('side')}>
              <SidePill side={position.side} />
            </td>
            <td className="px-2 py-2 text-right" style={getColumnStyle('lots')}>
              {formatDecimal(position.initialQuantity)}
            </td>
            <td className="px-2 py-2 text-right" style={getColumnStyle('openPrice')}>
              {formatDecimal(position.openPrice)}
            </td>
            <td className="px-2 py-2 text-right" style={getColumnStyle('closePrice')}>
              {formatDecimal(position.closePrice)}
            </td>
            <td className="px-2 py-2 text-right" style={getColumnStyle('fee')}>
              {formatDecimal(position.realizedFees)}
            </td>
            <td className="px-2 py-2 text-right" style={getColumnStyle('swap')}>
              {formatDecimal(position.realizedSwap)}
            </td>
            <td
              className={cn(
                'px-2 py-2 text-right tabular-nums',
                Number(position.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500',
              )}
              style={getColumnStyle('pnl')}
            >
              {formatDecimal(position.realizedPnl, '-', 2)}
            </td>
            <td
              className="text-muted-foreground px-2 py-2 text-right"
              style={getColumnStyle('closedTime')}
            >
              {formatDateTime(position.closedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type PositionHistoryTabContentProps = {
  accountId: string;
  dateRange: HistoryRangeValue;
};

function PositionHistoryTabContent({ accountId, dateRange }: PositionHistoryTabContentProps) {
  const sortStorageKey = `${POSITION_HISTORY_SORT_STORAGE_KEY}:${accountId}`;
  const [sortKey, setSortKey] = useState<PositionHistorySortKey | null>(
    () => readPositionHistorySort(sortStorageKey)?.sortKey ?? DEFAULT_POSITION_HISTORY_SORT.sortKey,
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => readPositionHistorySort(sortStorageKey)?.sortDir ?? DEFAULT_POSITION_HISTORY_SORT.sortDir,
  );
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedPositionId, setCopiedPositionId] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const { colors } = useTheme();

  useEffect(() => {
    const persisted = readPositionHistorySort(sortStorageKey);
    setSortKey(persisted?.sortKey ?? DEFAULT_POSITION_HISTORY_SORT.sortKey);
    setSortDir(persisted?.sortDir ?? DEFAULT_POSITION_HISTORY_SORT.sortDir);
  }, [sortStorageKey]);

  useEffect(() => {
    persistPositionHistorySort(sortStorageKey, { sortKey, sortDir });
  }, [sortDir, sortKey, sortStorageKey]);

  const handleOpenDetailModal = (position: Position) => {
    setSelectedPosition(position);
    setCopiedPositionId(false);
    setIsDetailModalOpen(true);
  };

  const handleCopyPositionId = async () => {
    if (!selectedPosition?.id) return;
    try {
      await navigator.clipboard.writeText(selectedPosition.id.toString());
      setCopiedPositionId(true);
      if (copiedTimeout) clearTimeout(copiedTimeout);
      const timeout = setTimeout(() => setCopiedPositionId(false), 2000);
      setCopiedTimeout(timeout);
    } catch {
      // Handle copy error silently or show toast
    }
  };

  const {
    data: historyPositionsData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePositions(
    {
      accountId,
      status: [OrderStatus.FILLED, OrderStatus.PARTIALLY_FILLED],
      sortBy: sortKey ?? 'closedAt',
      sortDir: sortKey ? sortDir : 'desc',
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    },
    30,
    'history',
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => historyPositionsData?.pages.flatMap((page: { data: Position[] }) => page.data) ?? [],
    [historyPositionsData],
  );

  const handleSort = (key: string) => {
    const validKeys: PositionHistorySortKey[] = [
      'openedAt',
      'closedAt',
      'quantity',
      'symbol',
      'side',
      'realizedPnl',
    ];
    const typedKey = key as PositionHistorySortKey;
    if (!validKeys.includes(typedKey)) return;

    if (sortKey !== typedKey) {
      setSortKey(typedKey);
      setSortDir('asc');
      return;
    }

    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }

    setSortKey(null);
    setSortDir(DEFAULT_POSITION_HISTORY_SORT.sortDir);
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasNextPage || isFetchingNextPage) return;

    const { scrollHeight, scrollTop, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceFromBottom < 120) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  if (isLoading) return <TableLoadingState />;
  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={scrollContainerRef}
          className="flex min-h-0 overflow-auto"
          onScroll={handleScroll}
        >
          <PositionHistoryTable
            rows={rows}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onOpenDetail={handleOpenDetailModal}
          />
          {isFetchingNextPage ? <LoadingMoreTableSkeleton /> : null}
        </div>
      </div>

      {selectedPosition && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent
            showCloseButton={false}
            className="dark:border-card max-h-[90vh] w-150 max-w-[calc(100vw-2rem)] overflow-y-auto border-none dark:border-2 dark:border-solid"
          >
            <div className="space-y-3">
              {/* Title and Badge Row */}
              <div className="border-b border-neutral-300 pb-3">
                <div className="mb-2 flex flex-row items-start justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <h2 className="text-h2-semibold text-foreground">{selectedPosition.symbol}</h2>
                    <div
                      className={`rounded px-2.5 py-1.5 ${selectedPosition.side === ORDER_SIDES.BUY ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                    >
                      <p
                        className={`text-body-small-medium ${selectedPosition.side === ORDER_SIDES.BUY ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
                      >
                        {selectedPosition.side === ORDER_SIDES.BUY
                          ? t('position.filter.buy')
                          : t('position.filter.sell')}{' '}
                        {formatDecimal(selectedPosition.initialQuantity)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-1">
                    <p className="text-body-small-regular text-muted-foreground">
                      #
                      {selectedPosition.id
                        ? `${selectedPosition.id.slice(0, 4)}...${selectedPosition.id.slice(-4)}`
                        : t('position.modal.unknownAsset')}
                    </p>
                    <Button variant="white-contained" onClick={() => handleCopyPositionId()}>
                      {copiedPositionId ? (
                        <Check size={15} color={colors.green500} />
                      ) : (
                        <Copy01 size={15} />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-body-small-regular text-muted-foreground">
                  {selectedPosition.symbolName || t('position.modal.unknownAsset')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-regular text-muted-foreground">
                    {t('position.modal.stopLoss')}:
                  </p>
                  <p className="text-body-small-medium text-foreground">
                    {formatDecimal(selectedPosition.stopLossPrice, t('position.modal.unset'))}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-regular text-muted-foreground">
                    {t('position.modal.takeProfit')}:
                  </p>
                  <p className="text-body-small-medium text-foreground">
                    {formatDecimal(selectedPosition.takeProfitPrice, t('position.modal.unset'))}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.netPnl', { defaultValue: 'Net PnL' })}:
                  </p>
                  <p
                    className={`text-body-small-medium font-medium ${
                      Number(selectedPosition.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {Number(selectedPosition.realizedPnl) > 0 ? '+' : ''}
                    {formatDecimal(selectedPosition.realizedPnl, '0.00', 2)}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.charges')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(selectedPosition.realizedFees ?? '0', '0')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.swap')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(selectedPosition.realizedSwap ?? '0', '0')}
                  </p>
                </div>
                {selectedPosition.closedBy !== CLOSED_BY.MANUAL && (
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-medium text-muted-foreground">
                      {t('position.modal.closeReason')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedPosition.closedBy
                        ? getClosedByMap(t)[selectedPosition.closedBy]
                        : t('position.modal.unset')}
                    </p>
                  </div>
                )}
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.openTime')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatPositionDateTime(selectedPosition.openedAt)}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.closedTime', { defaultValue: 'Closed Time' })}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatPositionDateTime(selectedPosition.closedAt as string)}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

const MemoizedPositionHistoryTabContent = memo(PositionHistoryTabContent);
MemoizedPositionHistoryTabContent.displayName = 'PositionHistoryTabContent';

export default MemoizedPositionHistoryTabContent;
