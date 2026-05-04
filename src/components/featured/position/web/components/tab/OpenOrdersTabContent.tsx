'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import { useInfiniteOrders } from '@/hook/useOrder';
import { useToast } from '@/hook/useToast';
import { createThemeColors } from '@/theme/colors';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import type { OrderItem } from '@/types/orders';
import { OrderStatus } from '@/types/orders';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { updateOrderAPI } from '@/services/orderService';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';
import { Copy01, Check, InfoCircle } from '@untitledui/icons';
import { useTheme } from '@/theme/ThemeProvider';
import {
  EmptyState,
  type SortDir,
  SortHeader,
  TableLoadingState,
  TargetPriceCell,
  mapOrderTypeCodeToOrderType,
  sortRows,
  formatDateTime,
  formatDecimal,
  OrderStatusPill,
} from './PositionWebTableShared';
import { enrichOrdersWithAssets } from '../../../utils/position.calculations';
import { useGetData } from '@/context/GetdataContext';
import { getOrderTypeLabel as getOrderTypeLabelText } from '../../../utils/position.formatters';

const OPEN_ORDERS_SORT_STORAGE_KEY = 'position:web:sort:open-orders';

type OpenOrdersSortKey = 'createdAt' | 'symbol' | 'orderType' | 'side' | 'quantity';

type OpenOrdersSortState = {
  sortKey: OpenOrdersSortKey | null;
  sortDir: SortDir;
};

const DEFAULT_OPEN_ORDERS_SORT: OpenOrdersSortState = {
  sortKey: null,
  sortDir: 'asc',
};

function readOpenOrdersSort(storageKey: string): OpenOrdersSortState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OpenOrdersSortState>;
    const validKeys: OpenOrdersSortKey[] = ['createdAt', 'symbol', 'orderType', 'side', 'quantity'];
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

function persistOpenOrdersSort(storageKey: string, value: OpenOrdersSortState) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function OrdersTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  rtBySymbol,
}: {
  rows: OrderItem[];
  sortKey?: string | null;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
  rtBySymbol: Record<string, { bid: number; ask: number }>;
}) {
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const displayRows = useMemo(
    () => (onSort ? sortRows(rows, sortKey || null, sortDir || 'asc') : rows),
    [rows, sortKey, sortDir, onSort],
  );
  const { assets } = useGetData();
  const ordersData = enrichOrdersWithAssets(displayRows, assets);
  const getOrderTypeLabel = (orderType: number) => getOrderTypeLabelText(orderType, t);

  // Column width mappings: percentage-based
  const columnWidths = {
    symbol: 11,
    type: 6,
    side: 6,
    lots: 9,
    price: 9,
    currentPrice: 10,
    takeProfit: 10,
    stopLoss: 11,
    status: 7,
    openTime: 15,
    action: 5,
  };

  const getColumnStyle = (columnKey: keyof typeof columnWidths) => {
    const width = columnWidths[columnKey];
    return { width: `${width}%` };
  };

  if (ordersData.length === 0)
    return <EmptyState label={t('position.modal.orders', { defaultValue: 'orders' })} />;

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const handleCancelOrder = async (order: OrderItem) => {
    if (cancellingOrders.has(order.id)) return;
    try {
      setCancellingOrders((prev) => new Set(prev).add(order.id));
      await updateOrderAPI(order.id, order.accountId, { cancel: true });
      showSuccess(t('position.modal.orderDeleted'), t('position.modal.orderDeletedSuccess'));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('position.modal.failedDeleteOrder');
      showError(t('position.modal.errorDeletingOrder'), errorMessage);
    } finally {
      setCancellingOrders((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const handleOpenDetailModal = (order: OrderItem) => {
    setSelectedOrder(order);
    setCopiedOrderId(false);
    setIsDetailModalOpen(true);
  };

  const handleCopyOrderId = async () => {
    if (!selectedOrder?.id) return;
    try {
      await navigator.clipboard.writeText(selectedOrder.id.toString());
      setCopiedOrderId(true);
      if (copiedTimeout) clearTimeout(copiedTimeout);
      const timeout = setTimeout(() => setCopiedOrderId(false), 2000);
      setCopiedTimeout(timeout);
    } catch {
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyPositionId'));
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
              style={getColumnStyle('currentPrice')}
            >
              {t('position.modal.currentPrice', { defaultValue: 'Current Price' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('takeProfit')}
            >
              {t('position.modal.takeProfitFull', { defaultValue: 'Take Profit' })}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('stopLoss')}
            >
              {t('position.modal.stopLossFull', { defaultValue: 'Stop Loss' })}
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
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('action')}
            >
              {t('position.modal.action', { defaultValue: 'Action' })}
            </th>
          </tr>
        </thead>
        <tbody>
          {ordersData.map((order) => (
            <tr
              key={order.id}
              className="text-body-small-medium border-border hover:bg-muted border-b transition-colors"
            >
              <td className="px-2 py-2" style={getColumnStyle('symbol')}>
                <div className="inline-flex items-center gap-1.5">
                  <Button
                    variant="white-contained"
                    onClick={() => handleOpenDetailModal(order)}
                    className="text-muted-foreground hover:text-primary-500 cursor-pointer transition-colors"
                  >
                    <InfoCircle size={19} />
                  </Button>
                  <span>{order.symbol}</span>
                  <span className="text-caption-regular dark:bg-primary-900 rounded bg-blue-50 px-1.5 py-0.5 text-blue-500 dark:text-blue-200">
                    {order.leverage}X
                  </span>
                </div>
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('type')}>
                {getOrderTypeLabel(order.orderType)}
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('side')}>
                <span className={order.side === 0 ? 'text-green-500' : 'text-red-500'}>
                  {order.side === 0 ? t('position.filter.buy') : t('position.filter.sell')}
                </span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('lots')}>
                {formatDecimal(order.quantity)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums" style={getColumnStyle('price')}>
                {order.price ? formatDecimal(order.price) : t('position.modal.orderTypeMarket')}
              </td>
              <td
                className="px-2 py-2 text-right tabular-nums"
                style={getColumnStyle('currentPrice')}
              >
                {formatDecimal(
                  order.side === 0
                    ? rtBySymbol?.[order.symbol]?.ask
                    : rtBySymbol?.[order.symbol]?.bid,
                )}
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('takeProfit')}>
                <TargetPriceCell
                  value={order.takeProfitPrice}
                  takeProfitValue={order.takeProfitPrice}
                  stopLossValue={order.stopLossPrice}
                  label={t('position.modal.addTP', { defaultValue: 'Add TP' })}
                  estimateContext={{
                    side: order.side as 0 | 1,
                    symbol: order.symbol,
                    quantity: order.quantity,
                    entryPrice: order.price ?? '0',
                    digit: order.digit,
                    rtBySymbol,
                    id: order.id,
                    accountId: order.accountId,
                    type: 'order',
                    orderType: mapOrderTypeCodeToOrderType(order.orderType),
                  }}
                />
              </td>
              <td className="px-2 py-2 text-right" style={getColumnStyle('stopLoss')}>
                <TargetPriceCell
                  value={order.stopLossPrice}
                  takeProfitValue={order.takeProfitPrice}
                  stopLossValue={order.stopLossPrice}
                  label={t('position.modal.addSL', { defaultValue: 'Add SL' })}
                  estimateContext={{
                    side: order.side as 0 | 1,
                    symbol: order.symbol,
                    quantity: order.quantity,
                    entryPrice: order.price ?? '0',
                    digit: order.digit,
                    rtBySymbol,
                    id: order.id,
                    accountId: order.accountId,
                    type: 'order',
                    orderType: mapOrderTypeCodeToOrderType(order.orderType),
                  }}
                />
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
              <td className="px-2 py-2 text-right" style={getColumnStyle('action')}>
                <Button
                  variant="red-outline"
                  disabled={cancellingOrders.has(order.id)}
                  onClick={() => handleCancelOrder(order)}
                  className={cn(
                    'h-7 min-w-15.5 cursor-pointer border px-3 transition-colors',
                    cancellingOrders.has(order.id)
                      ? 'border-border bg-muted text-muted-foreground'
                      : 'hover:bg-red-50',
                  )}
                >
                  {t('position.modal.delete', { defaultValue: 'Delete' })}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent
            showCloseButton={false}
            className="dark:border-card max-h-[90vh] w-150 max-w-[calc(100vw-2rem)] overflow-y-auto border-none dark:border-2 dark:border-solid"
          >
            <DialogTitle className="sr-only">{t('position.modal.orderDetails')}</DialogTitle>
            <div className="space-y-3">
              {/* Title and Badge Row */}
              <div className="border-b border-neutral-300 pb-3">
                <div className="mb-2 flex flex-row items-start justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <h2 className="text-h2-semibold text-foreground">{selectedOrder.symbol}</h2>
                    <div
                      className={`rounded px-2.5 py-1.5 ${selectedOrder.side === 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                    >
                      <p
                        className={`text-body-small-medium ${selectedOrder.side === 0 ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
                      >
                        {selectedOrder.side === 0
                          ? t('position.filter.buy')
                          : t('position.filter.sell')}{' '}
                        {getOrderTypeLabel(selectedOrder.orderType)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-1">
                    <p className="text-body-small-regular text-muted-foreground">
                      #
                      {selectedOrder.id
                        ? `${selectedOrder.id.slice(0, 4)}...${selectedOrder.id.slice(-4)}`
                        : t('position.modal.unknownAsset')}
                    </p>
                    <Button variant="white-contained" onClick={() => handleCopyOrderId()}>
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

              <div className="space-y-2">
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.volume')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium tabular-nums">
                    {formatDecimal(selectedOrder.quantity)}/
                    {formatDecimal(selectedOrder.filledQuantity ?? 0, '0')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.price')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium tabular-nums">
                    {formatDecimal(selectedOrder.price ?? '-')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.takeProfit')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium tabular-nums">
                    {selectedOrder.takeProfitPrice
                      ? formatDecimal(selectedOrder.takeProfitPrice)
                      : t('position.modal.unset')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.stopLoss')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium tabular-nums">
                    {selectedOrder.stopLossPrice
                      ? formatDecimal(selectedOrder.stopLossPrice)
                      : t('position.modal.unset')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.openTime')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium tabular-nums">
                    {formatDateTime(selectedOrder.createdAt)}
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

export default function OpenOrdersTabContent({ accountId }: { accountId: string }) {
  const sortStorageKey = `${OPEN_ORDERS_SORT_STORAGE_KEY}:${accountId}`;
  const [sortKey, setSortKey] = useState<OpenOrdersSortKey | null>(
    () => readOpenOrdersSort(sortStorageKey)?.sortKey ?? DEFAULT_OPEN_ORDERS_SORT.sortKey,
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => readOpenOrdersSort(sortStorageKey)?.sortDir ?? DEFAULT_OPEN_ORDERS_SORT.sortDir,
  );
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);

  useEffect(() => {
    const persisted = readOpenOrdersSort(sortStorageKey);
    setSortKey(persisted?.sortKey ?? DEFAULT_OPEN_ORDERS_SORT.sortKey);
    setSortDir(persisted?.sortDir ?? DEFAULT_OPEN_ORDERS_SORT.sortDir);
  }, [sortStorageKey]);

  useEffect(() => {
    persistOpenOrdersSort(sortStorageKey, { sortKey, sortDir });
  }, [sortDir, sortKey, sortStorageKey]);

  const {
    data: openOrdersData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(
    { accountId, status: [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED] },
    undefined,
    'active',
  );
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => openOrdersData?.pages.flatMap((page: { data: OrderItem[] }) => page.data) ?? [],
    [openOrdersData],
  );

  const handleSort = (key: string) => {
    const validKeys: OpenOrdersSortKey[] = ['symbol', 'orderType', 'side', 'quantity', 'createdAt'];
    const typedKey = key as OpenOrdersSortKey;
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
    setSortDir(DEFAULT_OPEN_ORDERS_SORT.sortDir);
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
        <OrdersTable
          rows={rows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          rtBySymbol={rtBySymbol}
        />
        {isFetchingNextPage ? <LoadingMoreTableSkeleton /> : null}
      </div>
    </div>
  );
}
