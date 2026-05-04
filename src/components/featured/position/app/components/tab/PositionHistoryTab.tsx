import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useInfinitePositions } from '@/hook/usePosition';
import { useToast } from '@/hook/useToast';
import { useTheme } from '@/theme/ThemeProvider';
import { Position } from '@/types';
import { copyText } from '@/utils/copy';
import { formatPositionDateTime, toISODateString } from '@/utils/dateUtils';
import { ArrowRight, Check, Copy01, FilterFunnel01, FilterLines } from '@untitledui/icons';
import { Decimal } from 'decimal.js';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SortDirection } from '../../shared/SortModal';
import { CLOSED_BY, ORDER_SIDES, OrderStatus } from '@/types/orders';
import { getClosedByMap } from '../../../utils/mapping';
import { formatDecimal } from '../../../utils/position.formatters';

function HistoryRowSkeleton() {
  return (
    <div className="border-border bg-background flex w-full flex-row items-center justify-between py-3">
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-4.5 w-18" />
          <Skeleton className="h-5.5 w-16 rounded" />
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

type PositionHistoryTabProps = {
  readonly onFilterPress: () => void;
  readonly onSortPress: () => void;
  readonly selectedSort: string | null;
  readonly sortOptions?: Array<{ label: string; value: string | number | null }>;
  readonly selectedDirection: SortDirection;
  readonly activeAccountId: string;
  readonly filter: {
    readonly direction: 'All' | 'Buy' | 'Sell';
    readonly dateRange: { startMs: number | null; endMs: number | null };
  };
};

function PositionHistoryTabComponent({
  onFilterPress,
  onSortPress,
  selectedSort,
  sortOptions,
  selectedDirection,
  activeAccountId,
  filter,
}: PositionHistoryTabProps) {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<Position | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [copiedPositionId, setCopiedPositionId] = useState(false);
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
    isLoading: isLoadingPositions,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePositions(
    {
      accountId: activeAccountId || '',
      sortBy: (selectedSort ?? 'closedAt') as
        | 'symbol'
        | 'side'
        | 'openedAt'
        | 'closedAt'
        | 'quantity'
        | 'realizedPnl',
      sortDir: selectedDirection ?? 'desc',
      status: [OrderStatus.FILLED, OrderStatus.PARTIALLY_FILLED],
      side,
      fromDate,
      toDate,
    },
    30, // page size
    'history',
  );

  // Flatten all pages into a single array
  const allPositions = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  // Virtual scroller
  const virtualizer = useVirtualizer({
    count: allPositions.length + (isFetchingNextPage ? 1 : 0),
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
  const handleCopyPositionId = async () => {
    if (!selectedItem?.id) return;
    try {
      await copyText(selectedItem.id);
      setCopiedPositionId(true);
      setTimeout(() => setCopiedPositionId(false), 2000);
    } catch (error) {
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyPositionId'));
    }
  };
  const open = Number(selectedItem?.openPrice ?? 0);
  const close = Number(selectedItem?.closePrice ?? 0);
  const isBuy = selectedItem?.side === ORDER_SIDES.BUY;

  const priceDiff = isBuy ? close - open : open - close;
  const percent = (priceDiff / open) * 100;
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
          {isLoadingPositions ? (
            <div className="flex flex-col">
              <HistoryRowSkeleton />
              <HistoryRowSkeleton />
              <HistoryRowSkeleton />
            </div>
          ) : !allPositions || allPositions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-body-medium-regular text-muted-foreground">
                {t('position.modal.noPositionHistory')}
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
                const item = allPositions[virtualItem.index];
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
                        <HistoryRowSkeleton />
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
                const realizedPnl = Number(item.realizedPnl) || 0;

                return (
                  <button
                    key={item?.id}
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
                    <div className="flex flex-row items-center justify-between">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex flex-row items-center gap-2">
                          <p className="text-body-small-medium text-foreground">{item.symbol}</p>
                          <div className={`rounded ${badgeColor} px-2.5 py-1.5`}>
                            <p className={`text-caption-medium ${badgeTextColor}`}>
                              {sideLabel}{' '}
                              {item.status === OrderStatus.PARTIALLY_FILLED
                                ? formatDecimal(
                                    new Decimal(item.initialQuantity)
                                      .minus(item.quantity)
                                      .toString(),
                                    '0',
                                  )
                                : formatDecimal(item.initialQuantity, '0')}
                            </p>
                          </div>
                        </div>
                        <p className="text-body-small-regular text-muted-foreground">
                          {formatDecimal(item.openPrice || '0', '0')}
                          <ArrowRight width={13.3} height={10} className="inline" />
                          {formatDecimal(item.closePrice || '0', '0')}
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <p
                          className={`text-h3-semibold ${realizedPnl < 0 ? 'text-red-500' : 'text-green-500'}`}
                        >
                          {realizedPnl > 0 ? '+' : ''}
                          {formatDecimal(realizedPnl, '0.00', 2)}
                        </p>
                        <p className="text-body-small-regular text-muted-foreground">
                          {selectedSort === 'closedAt'
                            ? formatPositionDateTime(item.closedAt as string)
                            : formatPositionDateTime(item.openedAt)}
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
      {/* History Detail Modal */}
      <Sheet open={showDetailModal} onOpenChange={setShowDetailModal}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-192 border-none bg-transparent! p-0"
        >
          {selectedItem && (
            <div>
              {/* Header */}
              <div className="bg-background mx-4 mb-2 rounded">
                {/* Title and Badge Row */}

                <div className="bg-card rounded-t-[4px] px-4 py-3">
                  <div className="flex flex-row items-start justify-between">
                    <div className="mb-1 flex flex-row items-center gap-2">
                      <h2 className="text-h2-semibold text-foreground">{selectedItem.symbol}</h2>
                      <div
                        className={`rounded px-2.5 py-1.5 ${selectedItem.side === ORDER_SIDES.BUY ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                      >
                        <p
                          className={`text-caption-medium ${selectedItem.side === ORDER_SIDES.BUY ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
                        >
                          {selectedItem.side === ORDER_SIDES.BUY
                            ? t('position.filter.buy')
                            : t('position.filter.sell')}{' '}
                          {selectedItem.status === OrderStatus.PARTIALLY_FILLED
                            ? formatDecimal(
                                new Decimal(selectedItem.initialQuantity)
                                  .minus(selectedItem.quantity)
                                  .toString(),
                                '0',
                              )
                            : formatDecimal(selectedItem.initialQuantity, '0')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-1">
                      <p className="text-body-small-regular text-foreground">
                        #
                        {selectedItem.id
                          ? `${selectedItem.id.slice(0, 4)}...${selectedItem.id.slice(-4)}`
                          : t('position.modal.unknownAsset')}
                      </p>
                      <button onClick={handleCopyPositionId}>
                        {copiedPositionId ? (
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
                <div className="mt-2 flex flex-row items-center justify-between">
                  <div>
                    <p className="text-body-small-regular text-foreground px-4">
                      {formatDecimal(selectedItem?.openPrice || '0', '0')}
                      <ArrowRight width={13.3} height={10} className="inline" />
                      {formatDecimal(selectedItem?.closePrice || '0', '0')}
                    </p>
                    {/* PnL Row */}
                    <div className="mb-2 flex flex-row items-center justify-between px-4">
                      <div>
                        <p
                          className={`text-body-small-regular ${Number(selectedItem.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'} mb-1`}
                        >
                          Δ =
                          {Number(selectedItem.realizedPnl) >= 0
                            ? formatDecimal(Math.abs(priceDiff), '0', selectedItem.digit ?? 2)
                            : `-${formatDecimal(Math.abs(priceDiff), '0', selectedItem.digit ?? 2)}`}
                          ({formatDecimal(percent, '0.00', 2)}
                          %)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mr-4">
                    <p
                      className={`text-h2-semibold ${Number(selectedItem.realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {Number(selectedItem.realizedPnl) > 0 ? '+' : ''}
                      {formatDecimal(Number(selectedItem.realizedPnl), '0.00', 2)}
                    </p>
                  </div>
                </div>
                <div className="mb-2 flex flex-col gap-1 px-4">
                  {/* <View className='flex-row justify-between mb-3'> */}
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.stopLoss')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedItem.stopLossPrice
                        ? formatDecimal(selectedItem.stopLossPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.takeProfit')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {selectedItem.takeProfitPrice
                        ? formatDecimal(selectedItem.takeProfitPrice)
                        : t('position.modal.unset')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.swap')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(selectedItem.realizedSwap ?? 0, '0')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.charges')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(selectedItem.realizedFees ?? 0, '0')}
                    </p>
                  </div>
                  {selectedItem.closedBy !== CLOSED_BY.MANUAL && (
                    <div className="flex flex-row justify-between">
                      <p className="text-body-small-regular text-muted-foreground">
                        {t('position.modal.closeReason')}:
                      </p>
                      <p className="text-body-small-medium text-foreground">
                        {selectedItem.closedBy
                          ? getClosedByMap(t)[selectedItem.closedBy]
                          : t('position.modal.unset')}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.openTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedItem.openedAt as string)}
                    </p>
                  </div>
                  <div className="mb-2 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.closeTime')}
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedItem.closedAt as string)}
                    </p>
                    {/* </View> */}
                  </div>
                </div>
              </div>

              <div className="bg-background mx-4 mb-2 flex flex-col gap-2.5 rounded p-4">
                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowDetailModal(false);
                    route.push(
                      `/opening-order?tab=open_position&&symbol=${selectedItem.symbol}&tabBack=position-history`,
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

export const PositionHistoryTab = memo(PositionHistoryTabComponent);
