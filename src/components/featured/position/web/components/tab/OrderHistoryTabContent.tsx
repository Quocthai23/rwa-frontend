'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { useInfiniteOrders } from '@/hook/useOrder';
import { useToast } from '@/hook/useToast';
import { OrderStatus, type OrderItem } from '@/types/orders';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';
import {
  EmptyState,
  type SortDir,
  SortHeader,
  SidePill,
  TableLoadingState,
  formatDateTime,
  formatDecimal,
  OrderStatusPill,
} from './PositionWebTableShared';
import { ORDER_SIDES, ORDER_TYPES } from '@/types/orders';
import { Check, Copy01, InfoCircle } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { copyText } from '@/utils/copy';
import { formatPositionDateTime } from '@/utils/dateUtils';
import type { HistoryRangeValue } from '@/components/featured/position/web/components/shared/HistoryDateRangePicker';
import {
  getOrderStatusLabel,
  getOrderTypeLabel as getOrderTypeLabelText,
} from '../../../utils/position.formatters';
import { Button } from '@/components/shared/atoms/button';

const ORDER_HISTORY_SORT_STORAGE_KEY = 'position:web:sort:order-history';

type OrderHistorySortKey = 'createdAt' | 'orderType' | 'quantity' | 'side' | 'symbol';

type OrderHistorySortState = {
  sortKey: OrderHistorySortKey | null;
  sortDir: SortDir;
};

const DEFAULT_ORDER_HISTORY_SORT: OrderHistorySortState = {
  sortKey: null,
  sortDir: 'desc',
};
function readOrderHistorySort(storageKey: string): OrderHistorySortState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OrderHistorySortState>;
    const validKeys: OrderHistorySortKey[] = [
      'createdAt',
      'orderType',
      'quantity',
      'side',
      'symbol',
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
        sortDir: DEFAULT_ORDER_HISTORY_SORT.sortDir,
      };
    }

    return { sortKey: parsed.sortKey, sortDir: parsed.sortDir };
  } catch {
    return null;
  }
}

function persistOrderHistorySort(storageKey: string, value: OrderHistorySortState) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function OrderHistoryTable({
  rows,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: OrderItem[];
  sortKey?: string | null;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showError } = useToast();
  const displayRows = rows;
  // Column width mappings: percentage-based
  const columnWidths = {
    symbol: 10,
    type: 10,
    side: 8,
    lots: 10,
    price: 12,
    executedPrice: 12,
    totalCost: 12,
    fee: 8,
    status: 8,
    openTime: 15,
  };

  const getColumnStyle = (columnKey: keyof typeof columnWidths) => {
    const width = columnWidths[columnKey];
    return { width: `${width}%` };
  };

  if (displayRows.length === 0)
    return (
      <EmptyState label={t('position.modal.orderHistory', { defaultValue: 'order history' })} />
    );

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const handleOpenDetailModal = (order: OrderItem) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const formatValue = (value: string | number | null | undefined) => formatDecimal(value, '');
  const getStatusLabel = (status: string | number) => getOrderStatusLabel(status, t);
  const getOrderTypeLabel = (orderType: string | number) => getOrderTypeLabelText(orderType, t);

  const handleCopyOrderId = async () => {
    if (!selectedOrder?.id) return;
    try {
      await copyText(selectedOrder.id.toString());
      setCopiedOrderId(true);
      if (copiedTimeout) clearTimeout(copiedTimeout);
      const timeout = setTimeout(() => setCopiedOrderId(false), 2000);
      setCopiedTimeout(timeout);
    } catch {
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyOrderId'));
    }
  };

  return (
    <>
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
            <th className="px-2 py-2 text-right" style={getColumnStyle('type')}>
              {onSort ? (
                <SortHeader
                  label={t('position.modal.type', { defaultValue: 'Type' })}
                  sortKey="orderType"
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
                  {t('position.modal.side', { defaultValue: 'Side' })}
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
              style={getColumnStyle('price')}
            >
              {t('position.modal.price', { defaultValue: 'Price' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('executedPrice')}
            >
              {t('position.modal.avgFillPrice', { defaultValue: 'Avg Fill Price' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('totalCost')}
            >
              {t('position.modal.totalCost', { defaultValue: 'Total Cost' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('fee')}
            >
              {t('position.modal.fee', { defaultValue: 'Fee' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('status')}
            >
              {t('position.modal.status', { defaultValue: 'Status' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('openTime')}
            >
              {onSort ? (
                <SortHeader
                  label={t('position.modal.openTime', { defaultValue: 'Open Time' })}
                  sortKey="createdAt"
                  currentSortKey={sortKey || null}
                  currentSortDir={sortDir || 'asc'}
                  onSort={handleSort}
                />
              ) : (
                <span className="text-muted-foreground">
                  {t('position.modal.openTime', { defaultValue: 'Open Time' })}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((order) => (
            <tr
              key={order.id}
              className="text-body-small-medium border-border hover:bg-muted border-b transition-colors"
            >
              <td className="px-2 py-2" style={getColumnStyle('symbol')}>
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    variant="white-contained"
                    onClick={() => handleOpenDetailModal?.(order)}
                    className="text-muted-foreground hover:text-primary-500 cursor-pointer transition-colors"
                  >
                    <InfoCircle size={19} />
                  </Button>
                  <span>{order.symbol}</span>
                </div>
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('type')}>
                {getOrderTypeLabel(order.orderType)}
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('side')}>
                <SidePill side={order.side} />
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('lots')}>
                {formatDecimal(order.quantity)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('price')}>
                {order.orderType === ORDER_TYPES.MARKET
                  ? t('position.modal.atMarket', { defaultValue: 'At market' })
                  : formatDecimal(order.price)}
              </td>
              <td
                className="px-2 py-2 text-right tabular-nums"
                style={getColumnStyle('executedPrice')}
              >
                {order.executedPrice ? formatDecimal(order.executedPrice) : '-'}
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('totalCost')}>
                {order.totalCost ? `VNĐ${formatDecimal(order.totalCost)}` : '-'}
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('fee')}>
                {order.fee ? `VNĐ${formatDecimal(order.fee)}` : '-'}
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('status')}>
                <OrderStatusPill status={order.status} />
              </td>
              <td
                className="text-muted-foreground px-2 py-2 text-right tabular-nums"
                style={getColumnStyle('openTime')}
              >
                {formatDateTime(order.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <Dialog
          open={isDetailModalOpen}
          onOpenChange={(open) => {
            setIsDetailModalOpen(open);
            if (!open) setCopiedOrderId(false);
            if (!open) setSelectedOrder(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="dark:border-card max-h-[90vh] border-none p-6 dark:border-2 dark:border-solid"
          >
            <DialogTitle className="sr-only">
              {t('position.modal.orderDetails', { defaultValue: 'Order Details' })}
            </DialogTitle>
            <div>
              <div className="bg-background rounded-sm">
                <div className="mb-2 border-b border-neutral-200 pb-3">
                  <div className="flex flex-row items-start justify-between">
                    <div className="mb-1 flex flex-row items-center gap-2">
                      <h2 className="text-h2-semibold text-foreground">{selectedOrder.symbol}</h2>
                      <div
                        className={`rounded-sm px-2.5 py-1.5 ${
                          selectedOrder.side === ORDER_SIDES.BUY
                            ? 'bg-green-50 dark:bg-green-900'
                            : 'bg-red-50 dark:bg-red-900'
                        }`}
                      >
                        <p
                          className={`text-caption-medium ${
                            selectedOrder.side === ORDER_SIDES.BUY
                              ? 'text-green-500 dark:text-green-200'
                              : 'text-red-500 dark:text-red-200'
                          }`}
                        >
                          {selectedOrder.side === ORDER_SIDES.BUY
                            ? t('position.filter.buy')
                            : t('position.filter.sell')}{' '}
                          {getOrderTypeLabel(selectedOrder.orderType)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-1">
                      <p className="text-body-small-regular text-foreground">
                        #
                        {selectedOrder.id
                          ? `${selectedOrder.id.slice(0, 4)}...${selectedOrder.id.slice(-4)}`
                          : t('position.modal.unknown')}
                      </p>
                      <Button variant="white-contained" onClick={handleCopyOrderId}>
                        {copiedOrderId ? (
                          <Check size={15} color={colors.green500} />
                        ) : (
                          <Copy01 size={15} />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-body-small-regular text-muted-foreground">
                    {selectedOrder.symbolName || t('position.modal.unknownAsset')}
                  </p>
                </div>

                <div className="mt-2 flex flex-row items-center justify-between pb-3">
                  <p className="text-body-small-regular text-foreground">
                    {selectedOrder.price
                      ? t('position.modal.orderPriceAt', {
                          quantity: formatValue(selectedOrder.quantity),
                          filledQuantity: formatValue(selectedOrder.filledQuantity),
                          price: formatValue(selectedOrder.price),
                        })
                      : t('position.modal.orderPriceAtMarket', {
                          quantity: formatValue(selectedOrder.quantity),
                          filledQuantity: formatValue(selectedOrder.filledQuantity),
                        })}
                  </p>
                  <p className="text-h3-medium">{getStatusLabel(selectedOrder.status)}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.avgFillPrice', { defaultValue: 'Avg Fill Price' })}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedOrder.executedPrice
                        ? formatValue(selectedOrder.executedPrice)
                        : '-'}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.totalCost', { defaultValue: 'Total Cost' })}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedOrder.totalCost
                        ? `VNĐ${formatValue(selectedOrder.totalCost)}`
                        : '-'}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.fee', { defaultValue: 'Fee' })}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedOrder.fee
                        ? `VNĐ${formatValue(selectedOrder.fee)}`
                        : '-'}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.openTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedOrder.createdAt as string)}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.closeTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedOrder.updatedAt as string)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type OrderHistoryTabContentProps = {
  accountId: string;
  dateRange: HistoryRangeValue;
};

function OrderHistoryTabContent({ accountId, dateRange }: OrderHistoryTabContentProps) {
  const sortStorageKey = `${ORDER_HISTORY_SORT_STORAGE_KEY}:${accountId}`;
  const [sortKey, setSortKey] = useState<OrderHistorySortKey | null>(
    () => readOrderHistorySort(sortStorageKey)?.sortKey ?? DEFAULT_ORDER_HISTORY_SORT.sortKey,
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => readOrderHistorySort(sortStorageKey)?.sortDir ?? DEFAULT_ORDER_HISTORY_SORT.sortDir,
  );

  useEffect(() => {
    const persisted = readOrderHistorySort(sortStorageKey);
    setSortKey(persisted?.sortKey ?? DEFAULT_ORDER_HISTORY_SORT.sortKey);
    setSortDir(persisted?.sortDir ?? DEFAULT_ORDER_HISTORY_SORT.sortDir);
  }, [sortStorageKey]);

  useEffect(() => {
    persistOrderHistorySort(sortStorageKey, { sortKey, sortDir });
  }, [sortDir, sortKey, sortStorageKey]);
  const {
    data: historyOrdersData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(
    {
      accountId,
      status: [
        OrderStatus.PARTIALLY_FILLED,
        OrderStatus.FILLED,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED,
      ],
      sortBy: sortKey ?? 'createdAt',
      sortDir: sortKey ? sortDir : 'desc',
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    },
    30,
    'history',
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => historyOrdersData?.pages.flatMap((page: { data: OrderItem[] }) => page.data) ?? [],
    [historyOrdersData],
  );
  const handleSort = (key: string) => {
    const validKeys: OrderHistorySortKey[] = [
      'createdAt',
      'orderType',
      'quantity',
      'side',
      'symbol',
    ];
    const typedKey = key as OrderHistorySortKey;
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
    setSortDir(DEFAULT_ORDER_HISTORY_SORT.sortDir);
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
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollContainerRef} className="flex min-h-0 overflow-auto" onScroll={handleScroll}>
        <OrderHistoryTable rows={rows} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
        {isFetchingNextPage ? <LoadingMoreTableSkeleton /> : null}
      </div>
    </div>
  );
}

const MemoizedOrderHistoryTabContent = memo(OrderHistoryTabContent);
MemoizedOrderHistoryTabContent.displayName = 'OrderHistoryTabContent';

export default MemoizedOrderHistoryTabContent;

