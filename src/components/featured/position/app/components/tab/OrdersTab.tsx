import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useCancelOrders, useInfiniteOrders } from '@/hook/useOrder';
import { useToast } from '@/hook/useToast';
import { updateOrderAPI } from '@/services/orderService';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSelectedPositionStore } from '@/store/selectedPositionStore';
import { useTheme } from '@/theme';
import { OrderType, OrderStatus, type OrderItem, type OrdersSortBy } from '@/types/orders';
import { sortArray } from '@/utils/insertSorted';
import { copyText } from '@/utils/copy';
import { formatPositionDateTime } from '@/utils/dateUtils';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowRight, Check, Copy01, FilterLines } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { SortDirection } from '../../shared/SortModal';
import { ORDER_SIDES, ORDER_TYPE_CODES } from '@/types/orders';
import { useTranslation } from 'react-i18next';
import { useGetData } from '@/context/GetdataContext';
import { enrichOrdersWithAssets } from '../../../utils/position.calculations';
import {
  formatDecimal,
  getOrderStatusLabel,
  getOrderTypeLabel as getOrderTypeLabelText,
} from '../../../utils/position.formatters';
function OrderRowSkeleton() {
  return (
    <div className="border-border bg-background flex w-full flex-row items-center justify-between py-3">
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-4.5 w-18" />
          <Skeleton className="h-5.5 w-22 rounded" />
        </div>
        <Skeleton className="h-3.5 w-35" />
      </div>

      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4.5 w-24" />
      </div>
    </div>
  );
}

type CancelOrdersMutation = {
  mutate: (
    orders: OrderItem[],
    callbacks: { onError?: (error: unknown) => void; onSuccess?: () => void },
  ) => void;
  isPending: boolean;
};

type OrdersTabProps = {
  readonly selectedSort: OrdersSortBy | null;
  readonly sortOptions?: Array<{ label: string; value: OrdersSortBy }>;
  readonly selectedDirection?: SortDirection;
  readonly onSortPress: () => void;
  readonly bulkOperationsModalVisible: boolean;
  readonly setBulkOperationsModalVisible: (visible: boolean) => void;
  readonly cancelOrdersMutation: CancelOrdersMutation;
  readonly setOrdersCount?: (count: number) => void;
  readonly activeAccountId: string;
};

export function OrdersTab({
  selectedSort,
  sortOptions,
  selectedDirection,
  onSortPress,
  bulkOperationsModalVisible,
  setBulkOperationsModalVisible,
  activeAccountId,
}: OrdersTabProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const parentRef = useRef<HTMLDivElement>(null);

  // Helper to get sort label from value
  const getSortLabel = (value: string) => {
    const option = sortOptions?.find((opt) => opt.value === value);
    return (
      option?.label ||
      (value
        ? typeof value === 'string'
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : t('position.sort.default')
        : t('position.sort.default'))
    );
  };
  const { data: ordersData, isLoading: isLoadingOrders } = useInfiniteOrders(
    {
      accountId: activeAccountId || '',
      status: [0, 1],
    },
    undefined,
    'active',
  );

  const { assets: assetsData } = useGetData();

  const allOrders: OrderItem[] = useMemo(
    () => ordersData?.pages.flatMap((page: { data: OrderItem[] }) => page.data) || [],
    [ordersData],
  );

  const enrichedOrders: OrderItem[] = useMemo(
    () => enrichOrdersWithAssets(allOrders, assetsData),
    [allOrders, assetsData],
  );

  const sortedOrders: OrderItem[] = useMemo(
    () => sortArray(enrichedOrders, selectedSort, selectedDirection ?? null),
    [enrichedOrders, selectedSort, selectedDirection],
  );

  const limitOrders = useMemo(
    () => sortedOrders.filter((o) => o.orderType === ORDER_TYPE_CODES.LIMIT),
    [sortedOrders],
  );
  const stopOrders = useMemo(
    // Treat "Stop Limit" as Stop bucket for bulk delete
    () => sortedOrders.filter((o) => o.orderType === ORDER_TYPE_CODES.STOP),
    [sortedOrders],
  );

  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const cancelOrdersMutation = useCancelOrders(activeAccountId);

  const getOrderTypeLabel = (orderType: number) => getOrderTypeLabelText(orderType, t);
  const getStatusLabel = (status: number) => getOrderStatusLabel(status, t);

  const handleCancelOrders = (orders: OrderItem[]) => {
    if (orders && orders.length > 0) {
      cancelOrdersMutation.mutate(orders, {
        onError: (error) => {
          console.error('❌ Cancel All Orders Error:', error);
        },
        onSuccess: () => {
          setBulkOperationsModalVisible(false);
        },
      });
    } else {
      setBulkOperationsModalVisible(false);
    }
  };

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
  const handleOrderPress = (order: OrderItem) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleCancelOrder = async (order: OrderItem) => {
    try {
      await updateOrderAPI(order.id, order.accountId, { cancel: true });
      showSuccess(t('position.modal.orderDeleted'), t('position.modal.orderDeletedSuccess'));
      setShowOrderModal(false);
      setSelectedOrder(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('position.modal.failedDeleteOrder');
      showError(t('position.modal.errorDeletingOrder'), errorMessage);
    }
  };

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: sortedOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center gap-4">
        <button className="bg-card flex items-center gap-2 rounded px-3 py-2" onClick={onSortPress}>
          <FilterLines size={16} className="text-muted-foreground" />
          <p className="text-button-small-medium text-foreground">
            {t('position.modal.sortBy')}: {getSortLabel(selectedSort as string)}
          </p>
        </button>
      </div>
      <div className="h-full flex-1 flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <p className="text-h3-semibold text-foreground mb-2">{t('position.tabs.orders')}</p>
          <Button
            onClick={() => setBulkOperationsModalVisible(true)}
            variant="white-contained"
            className="text-primary-500! text-button-large-medium"
          >
            {t('position.modal.close')}
          </Button>
        </div>
        {isLoadingOrders ? (
          <div className="flex flex-col">
            <OrderRowSkeleton />
            <OrderRowSkeleton />
            <OrderRowSkeleton />
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="flex h-[70%] flex-col items-center justify-center">
            <p className="text-body-medium text-muted-foreground">
              {t('position.modal.noOrdersAvailable')}
            </p>
          </div>
        ) : (
          <div
            ref={parentRef}
            className="h-full flex-1 overflow-y-auto"
            // onScroll={handleScroll}
            style={{ paddingBottom: 20 }}
          >
            <div
              style={{
                height: `${totalSize + 60}px`,
                width: '100%',
                position: 'relative',
                minHeight: 0,
              }}
            >
              {virtualItems.map((virtualItem) => {
                const order = sortedOrders[virtualItem.index];
                if (!order) return null;

                const isBuy = order.side === ORDER_SIDES.BUY;
                const badgeColor = isBuy
                  ? 'bg-green-50 dark:bg-green-900'
                  : 'bg-red-50 dark:bg-red-900';
                const badgeTextColor = isBuy
                  ? 'text-green-500 dark:text-green-200'
                  : 'text-red-500 dark:text-red-200';

                return (
                  <div
                    key={order.id}
                    data-index={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="flex-row">
                      <button
                        className="bg-background flex w-full flex-row items-center justify-between text-left"
                        onClick={() => handleOrderPress(order)}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex flex-row items-center gap-2">
                            <p className="text-body-small-medium text-foreground">{order.symbol}</p>
                            <div className={`rounded ${badgeColor}`}>
                              <p className={`text-caption-medium px-2.5 py-1.5 ${badgeTextColor}`}>
                                {isBuy ? t('position.filter.buy') : t('position.filter.sell')}{' '}
                                {getOrderTypeLabel(order.orderType)}
                              </p>
                            </div>
                          </div>
                          <p className="text-body-small-regular text-muted-foreground">
                            {order.price
                              ? t('position.modal.orderPriceAt', {
                                  quantity: formatDecimal(order.quantity, ''),
                                  filledQuantity: formatDecimal(order.filledQuantity, ''),
                                  price: formatDecimal(order.price, ''),
                                })
                              : t('position.modal.orderPriceAtMarket', {
                                  quantity: formatDecimal(order.quantity, ''),
                                  filledQuantity: formatDecimal(order.filledQuantity, ''),
                                })}
                          </p>
                        </div>

                        <div className="items-end">
                          <p className={`text-h3-semibold`}>{getStatusLabel(order.status)}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {/* Order Details Modal */}
      <Sheet open={showOrderModal} onOpenChange={setShowOrderModal}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-192 border-none bg-transparent! p-0"
        >
          {selectedOrder && (
            <div>
              {/* Header */}
              <div className="bg-background mx-4 mb-2 rounded-sm">
                {/* Title and Badge Row */}
                <div className="bg-card rounded-t-sm px-4 py-3">
                  <div className="flex flex-row items-start justify-between">
                    <div className="mb-1 flex flex-row items-center gap-2">
                      <p className="text-h2-semibold text-foreground">{selectedOrder.symbol}</p>
                      <div
                        className={`rounded-sm ${selectedOrder.side === ORDER_SIDES.BUY ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                      >
                        <p
                          className={`text-caption-medium px-2.5 py-1.5 ${selectedOrder.side === ORDER_SIDES.BUY ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
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
                          : t('position.modal.unknownAsset')}
                      </p>
                      <button onClick={handleCopyOrderId}>
                        {copiedOrderId ? (
                          <Check size={15} color={colors.green500} />
                        ) : (
                          <Copy01 size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Asset Name */}
                  <p className="text-body-small-regular text-muted-foreground">
                    {selectedOrder.symbolName}
                  </p>
                </div>
                <div className="mt-2 flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center px-4">
                    <p className="text-body-small-regular text-foreground">
                      <span className="text-green-500">
                        {formatDecimal(
                          selectedOrder.side === ORDER_SIDES.BUY
                            ? rtBySymbol?.[selectedOrder.symbol]?.ask
                            : rtBySymbol?.[selectedOrder.symbol]?.bid,
                          '-',
                        )}
                      </span>
                      <ArrowRight width={13.3} height={10} className="inline" />
                      {formatDecimal(selectedOrder.price ?? 0, '0')}
                    </p>
                  </div>
                  <div className="mr-4">
                    <p className="text-h3-regular">{getStatusLabel(selectedOrder.status)}</p>
                  </div>
                </div>

                {/* Order Details */}
                <div className="px-4 py-2">
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.volume')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(selectedOrder.quantity, '0')}/
                      {formatDecimal(selectedOrder.filledQuantity, '0')}
                    </p>
                  </div>
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.stopLoss')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedOrder.stopLossPrice
                        ? formatDecimal(selectedOrder.stopLossPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.takeProfit')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedOrder.takeProfitPrice
                        ? formatDecimal(selectedOrder.takeProfitPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>

                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.openTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedOrder.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-background mx-4 mb-2 flex flex-col gap-2.5 rounded-sm p-4">
                <Button
                  className="items-center py-2"
                  onClick={() => handleCancelOrder(selectedOrder)}
                  variant="red-ghost"
                >
                  <p className="text-button-large-medium text-red-500">
                    {t('position.modal.delete')}
                  </p>
                </Button>

                <Button
                  className="items-center py-2"
                  onClick={() => {
                    setShowOrderModal(false);
                    useSelectedPositionStore.getState().setSelectedPosition(selectedOrder);
                    router.push(
                      `/opening-order?tab=modify_order&orderType=${encodeURIComponent(OrderType.MODIFY)}&tabBack=orders`,
                    );
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.modify')}
                  </p>
                </Button>

                <Button
                  className="items-center py-2"
                  onClick={() => {
                    setShowOrderModal(false);
                    router.push(
                      `/opening-order?tab=open_position&symbol=${selectedOrder.symbol}&tabBack=orders`,
                    );
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.trade')}
                  </p>
                </Button>

                <Button
                  className="items-center py-2"
                  onClick={() => {
                    setShowOrderModal(false);
                    router.push(`/trade/${selectedOrder.symbol}`);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.chart')}
                  </p>
                </Button>

                <Button
                  className="items-center py-2"
                  onClick={() => {
                    setShowOrderModal(false);
                    setBulkOperationsModalVisible(true);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.bulkAction')}
                  </p>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Operations Modal */}
      <Sheet open={bulkOperationsModalVisible} onOpenChange={setBulkOperationsModalVisible}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="bg-background mx-auto w-full max-w-192 rounded-t-lg"
        >
          <div className="border-border border-b px-4 pt-6 pb-4">
            <p className="text-h3-semibold text-foreground">{t('position.modal.bulkOperations')}</p>
          </div>
          <div className="flex flex-col gap-3 px-4">
            <Button
              className="items-center px-4 py-3 disabled:opacity-50"
              disabled={cancelOrdersMutation.isPending || sortedOrders.length === 0}
              onClick={() => handleCancelOrders(sortedOrders)}
              variant="neutral-contained"
            >
              {cancelOrdersMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.deleteAllOrders')}
                </p>
              )}
            </Button>
          </div>
          <div className="flex flex-col gap-3 px-4">
            <Button
              className="items-center px-4 py-3 disabled:opacity-50"
              disabled={cancelOrdersMutation.isPending || limitOrders.length === 0}
              onClick={() => handleCancelOrders(limitOrders)}
              variant="neutral-contained"
            >
              {cancelOrdersMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.deleteLimitOrders')}
                </p>
              )}
            </Button>
          </div>
          <div className="mb-6 flex flex-col gap-3 px-4">
            <Button
              className="items-center px-4 py-3 disabled:opacity-50"
              disabled={cancelOrdersMutation.isPending || stopOrders.length === 0}
              onClick={() => handleCancelOrders(stopOrders)}
              variant="neutral-contained"
            >
              {cancelOrdersMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.deleteStopOrders')}
                </p>
              )}
            </Button>
          </div>
          <div className="mb-6 px-4">
            <Button
              className="w-full py-3"
              onClick={() => {
                setBulkOperationsModalVisible(false);
              }}
              variant="red-ghost"
            >
              <p className="text-button-large-medium text-red-500">{t('position.modal.cancel')}</p>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
