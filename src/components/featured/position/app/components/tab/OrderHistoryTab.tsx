import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useInfiniteOrders } from '@/hook/useOrder';
import { useToast } from '@/hook/useToast';
import { useTheme } from '@/theme/ThemeProvider';
import type { OrderItem } from '@/types/orders';
import { OrderStatus } from '@/types/orders';
import { copyText } from '@/utils/copy';
import { formatPositionDateTime, toISODateString } from '@/utils/dateUtils';
import {
  formatDecimal,
  getOrderStatusLabel,
  getOrderTypeLabel as getOrderTypeLabelText,
} from '../../../utils/position.formatters';
import { Check, Copy01, FilterFunnel01, FilterLines } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { SortDirection } from '../../shared/SortModal';
import { useTranslation } from 'react-i18next';
import { ORDER_SIDES, ORDER_TYPE_CODES } from '@/types/orders';

function OrderHistoryRowSkeleton() {
  return (
    <div className="border-border bg-background flex w-full flex-row items-center justify-between py-3">
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-4.5 w-18" />
          <Skeleton className="h-5.5 w-22 rounded" />
        </div>
        <Skeleton className="h-3.5 w-40" />
      </div>

      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}

type OrderHistoryTabProps = {
  readonly onSortPress: () => void;
  readonly selectedSort: string | null;
  readonly sortOptions?: Array<{ label: string; value: string | number | null }>;
  readonly selectedDirection: SortDirection;
  readonly activeAccountId: string;
  readonly filter: {
    readonly direction: 'All' | 'Buy' | 'Sell';
    readonly dateRange: { startMs: number | null; endMs: number | null };
  };
  readonly onFilterPress: () => void;
};

function OrderHistoryTabComponent({
  onSortPress,
  selectedSort,
  sortOptions,
  selectedDirection,
  activeAccountId,
  filter,
  onFilterPress,
}: OrderHistoryTabProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const { showError } = useToast();
  const { colors } = useTheme();
  const route = useRouter();

  // Helper to get sort label from value
  const getSortLabel = (value: string | number | null | undefined) => {
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
  // Use infinite query for pagination with 30 items per page
  const side =
    filter.direction === 'All'
      ? undefined
      : filter.direction === 'Buy'
        ? ORDER_SIDES.BUY
        : ORDER_SIDES.SELL;

  const fromDate =
    filter.dateRange.startMs != null
      ? toISODateString(new Date(filter.dateRange.startMs))
      : undefined;

  const toDate =
    filter.dateRange.endMs != null ? toISODateString(new Date(filter.dateRange.endMs)) : undefined;

  const {
    data,
    isLoading: isLoadingOrders,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteOrders(
    {
      accountId: activeAccountId || '',
      sortBy: (selectedSort ?? 'closedAt') as
        | 'createdAt'
        | 'orderType'
        | 'quantity'
        | 'side'
        | 'symbol',
      sortDir: selectedDirection ?? 'desc',
      status: [
        OrderStatus.PARTIALLY_FILLED,
        OrderStatus.FILLED,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED,
      ],
      side,
      fromDate,
      toDate,
    },
    30, // page size
    'history',
  );

  // Flatten all pages into a single array
  const allOrders = useMemo(() => {
    return data?.pages.flatMap((page) => (Array.isArray(page) ? page : page.data)) || [];
  }, [data]);

  // Orders history is filtered server-side (via side/status/fromDate/toDate)
  const filteredOrders: OrderItem[] = allOrders;

  // Virtual scroller
  const virtualizer = useVirtualizer({
    count: filteredOrders.length + (isFetchingNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Approximate height of each item
    overscan: 10, // Render 10 items outside of visible range for smooth scrolling
  });

  // Trigger fetch next page when user scrolls near the end
  useEffect(() => {
    if (!parentRef.current) return;

    const handleScroll = () => {
      const element = parentRef.current;
      if (!element) return;

      const { scrollHeight, scrollTop, clientHeight } = element;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // Fetch next page when within 100px from bottom
      if (distanceFromBottom < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    const element = parentRef.current;
    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCopyOrderId = async () => {
    if (!selectedItem?.id) return;
    try {
      await copyText(selectedItem.id.toString());
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch (error) {
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyOrderId'));
    }
  };

  const getStatusLabel = (status: number) => getOrderStatusLabel(status, t);
  const getOrderTypeLabel = (orderType: number) => getOrderTypeLabelText(orderType, t);
  const formatValue = (value: string | number | null | undefined) => formatDecimal(value, '');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky Header */}
      <div className="bg-background sticky top-0 z-10 pb-3">
        <div className="flex flex-row items-center gap-4">
          <button className="bg-card rounded px-3 py-2" onClick={onSortPress}>
            <div className="flex flex-row items-center gap-2">
              <FilterLines size={16} className="text-muted-foreground" />
              <span className="text-button-small-medium text-foreground">
                {t('position.modal.sortBy')}: {getSortLabel(selectedSort)}
              </span>
            </div>
          </button>
          <button className="bg-card rounded px-3 py-2" onClick={onFilterPress}>
            <div className="flex flex-row items-center gap-2">
              <FilterFunnel01 size={16} className={'text-foreground'} />
              <span className={`text-button-small-medium text-foreground`}>
                {t('position.filter.title')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Virtual Scrolling Container */}
        <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
          {isLoadingOrders ? (
            <div className="flex flex-col">
              <OrderHistoryRowSkeleton />
              <OrderHistoryRowSkeleton />
              <OrderHistoryRowSkeleton />
            </div>
          ) : !filteredOrders || filteredOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-body-medium-regular text-muted-foreground">
                {t('position.modal.noOrderHistory')}
              </p>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
                minHeight: 0,
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const item = filteredOrders[virtualItem.index];

                // Render loading indicator for next page
                if (!item) {
                  return (
                    <div
                      key={`loading-${virtualItem.index}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="bg-background flex items-center justify-center"
                    >
                      <div className="w-full">
                        <OrderHistoryRowSkeleton />
                      </div>
                    </div>
                  );
                }

                const isBuy = item.side === ORDER_SIDES.BUY;
                const sideLabel = isBuy ? t('position.filter.buy') : t('position.filter.sell');
                const badgeColor = isBuy
                  ? 'bg-green-50 dark:bg-green-900'
                  : 'bg-red-50 dark:bg-red-900';
                const badgeTextColor = isBuy
                  ? 'text-green-500 dark:text-green-200'
                  : 'text-red-500 dark:text-red-200';

                return (
                  <button
                    key={`${item.id}-${virtualItem.index}`}
                    className="w-full text-left"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="bg-background flex flex-row items-center justify-between">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex flex-row items-center gap-2">
                          <p className="text-body-small-medium text-foreground">{item.symbol}</p>
                          <div className={`rounded ${badgeColor} px-2.5 py-1.5`}>
                            <p className={`text-caption-medium ${badgeTextColor}`}>
                              {sideLabel} {getOrderTypeLabel(item.orderType)}
                            </p>
                          </div>
                        </div>
                        <p className="text-body-small-regular text-muted-foreground">
                          {item.price
                            ? t('position.modal.orderPriceAt', {
                                quantity: formatValue(item.quantity),
                                filledQuantity: formatValue(item.filledQuantity),
                                price: formatValue(item.price),
                              })
                            : t('position.modal.orderPriceAtMarket', {
                                quantity: formatValue(item.quantity),
                                filledQuantity: formatValue(item.filledQuantity),
                              })}
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <p className="text-h3-medium text-foreground">
                          {getStatusLabel(item.status)}
                        </p>
                        <p className="text-body-small-regular text-muted-foreground">
                          {item.updatedAt
                            ? formatPositionDateTime(item.updatedAt)
                            : t('position.modal.unknownTime')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order History Detail Modal */}
      <Sheet open={showDetailModal} onOpenChange={setShowDetailModal}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-192 border-none bg-transparent! p-0"
        >
          {selectedItem && (
            <div>
              {/* Header */}
              <div className="bg-background mx-4 mb-2 rounded-sm">
                {/* Title and Badge Row */}
                <div className="bg-card rounded-t-sm px-4 py-3">
                  <div className="flex flex-row items-start justify-between">
                    <div className="mb-1 flex flex-row items-center gap-2">
                      <h2 className="text-h2-semibold text-foreground">{selectedItem.symbol}</h2>
                      <div
                        className={`rounded-sm px-2.5 py-1.5 ${selectedItem.side === ORDER_SIDES.BUY ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                      >
                        <p
                          className={`text-caption-medium ${selectedItem.side === ORDER_SIDES.BUY ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
                        >
                          {selectedItem.side === ORDER_SIDES.BUY
                            ? t('position.filter.buy')
                            : t('position.filter.sell')}{' '}
                          {getOrderTypeLabel(selectedItem.orderType)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-1">
                      <p className="text-body-small-regular text-foreground">
                        #
                        {selectedItem.id
                          ? `${selectedItem.id.slice(0, 4)}...${selectedItem.id.slice(-4)}`
                          : t('position.modal.unknown')}
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
                    {selectedItem.symbolName || t('position.modal.unknownAsset')}
                  </p>
                </div>

                {/* Price Info */}
                <div className="mt-2 flex flex-row items-center justify-between px-4 pb-3">
                  <p className="text-body-small-regular text-foreground">
                    {selectedItem.price
                      ? t('position.modal.orderPriceAt', {
                          quantity: formatValue(selectedItem.quantity),
                          filledQuantity: formatValue(selectedItem.filledQuantity),
                          price: formatValue(selectedItem.price),
                        })
                      : t('position.modal.orderPriceAtMarket', {
                          quantity: formatValue(selectedItem.quantity),
                          filledQuantity: formatValue(selectedItem.filledQuantity),
                        })}
                  </p>
                  <p className={`text-h3-medium`}>{getStatusLabel(selectedItem.status)}</p>
                </div>

                <div className="mb-2 flex flex-col gap-1 px-4 pb-2">
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.stopLoss')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedItem.stopLossPrice
                        ? formatValue(selectedItem.stopLossPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.takeProfit')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedItem.takeProfitPrice
                        ? formatValue(selectedItem.takeProfitPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.openTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedItem.createdAt as string)}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.closeTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedItem.updatedAt as string)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-background mx-4 mb-2 flex flex-col gap-2.5 rounded-sm p-4">
                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowDetailModal(false);
                    route.push(
                      `/opening-order?tab=open_position&symbol=${selectedItem.symbol}&tabBack=order-history`,
                    );
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.trade')}
                  </p>
                </Button>

                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowDetailModal(false);
                    route.push(`/market/${selectedItem.symbol}`);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-large-medium text-foreground">
                    {t('position.modal.chart')}
                  </p>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const OrderHistoryTab = memo(OrderHistoryTabComponent);
