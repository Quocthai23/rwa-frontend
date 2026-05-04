import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useGetData } from '@/context/GetdataContext';
import { useClosePositions } from '@/hook/usePosition';
import { useToast } from '@/hook/useToast';
import { closePositions } from '@/services/positionService';
import { useSelectedPositionStore } from '@/store/selectedPositionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { type Position } from '@/types/position';
import { copyText } from '@/utils/copy';
import { formatPositionDateTime } from '@/utils/dateUtils';
import { sortArray } from '@/utils/insertSorted';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowRight, Check, Copy01, Edit03, FilterLines, XCircle } from '@untitledui/icons';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toDecimal } from '@/utils/decimal';
import {
  calculatePositionFields,
  calculateTotalUnrealizedPnL,
  getEnrichedPositionsFromInfiniteData,
  splitPositionsByPnL,
} from '../../../utils/position.calculations';
import { formatDecimal } from '../../../utils/position.formatters';
import { SortDirection } from '../../shared/SortModal';
//import { Decimal } from '@/utils/formatNumber';
import { ORDER_SIDES } from '@/types/orders';

type PositionsTabProps = {
  readonly selectedSort: string | null;
  readonly sortOptions?: Array<{ label: string; value: string | null }>;
  readonly onSortPress: () => void;
  readonly bulkOperationsModalVisible: boolean;
  readonly setBulkOperationsModalVisible: (visible: boolean) => void;
  readonly rtBySymbol: Record<string, { bid: number; ask: number }>;
  readonly activeAccountId: string;
  readonly setOpenPositions?: (positions: Position[]) => void;
  readonly selectedDirection?: SortDirection;
  readonly isLoadingPositions: boolean;
  readonly data: unknown;
};

type Props = {
  position: Position;
  rtBySymbol: Record<string, { bid: number; ask: number }>;
  onClick: (position: Position, digit: number, profit: number) => void;
  /** Bumps row re-render when locale changes (buy/sell labels). */
  i18nLanguage: string;
};

function PositionRowComponent({
  position,
  rtBySymbol,
  onClick,
  i18nLanguage: _i18nLanguage,
}: Props) {
  const [isFullyOpen, setIsFullyOpen] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const router = useRouter();
  const fields = calculatePositionFields(position, rtBySymbol);
  const { isBuy, openPrice, currentPrice, profit, digit } = fields || {};
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();

  const badgeColor = isBuy ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900';
  const badgeTextColor = isBuy
    ? 'text-green-500 dark:text-green-200'
    : 'text-red-500 dark:text-red-200';
  const positionType = isBuy ? t('position.filter.buy') : t('position.filter.sell');
  const safeProfit = Number.isFinite(Number(profit)) ? Number(profit) : 0;
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    const currentX = x.get();
    const predictedX = currentX + info.offset.x;
    const targetX = predictedX < -50 ? -100 : 0;
    x.set(targetX);
    setIsFullyOpen(targetX === -100);
  };

  const handleClosePosition = async () => {
    if (closeLoading) return;
    if (!position) return;
    try {
      setCloseLoading(true);
      await closePositions(position.id, position.accountId, position.quantity);
      router.push(`/position`);
      showSuccess(t('position.modal.positionClosed'), t('position.modal.positionClosedSuccess'));
    } catch (error: any) {
      if (error.message.includes('last update')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
      } else {
        showError(
          t('common.error'),
          error instanceof Error ? error.message : t('position.modal.errorClosingPosition'),
        );
      }
    } finally {
      setCloseLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute top-0 right-0 flex h-full items-center ${isFullyOpen ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`bg-green-50 p-3 ${!isFullyOpen ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onClick={() => {
            useSelectedPositionStore.setState({ selectedPosition: position });
            isFullyOpen &&
              router.push(`/opening-order?tab=close_position&orderType=Modify Position`);
          }}
        >
          <Edit03 size={20} className="text-green-500" />
        </div>
        <div
          className={`bg-red-50 p-3 ${!isFullyOpen ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
          onClick={() => isFullyOpen && !closeLoading && handleClosePosition()}
        >
          <XCircle size={20} className="text-red-500" />
        </div>
      </motion.div>

      <motion.button
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => onClick(position, digit || 2, profit || 0)}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-background flex w-full flex-row items-center justify-between text-left"
      >
        <div className="flex flex-1 flex-col items-start justify-center gap-1">
          <div className="flex flex-row items-center gap-2">
            <p className="text-body-small-medium text-foreground">{position.symbol}</p>
            <div className={`rounded ${badgeColor}`}>
              <p className={`text-caption-medium px-2.5 py-1.5 ${badgeTextColor}`}>
                {positionType} {formatDecimal(position.quantity, '0')}
              </p>
            </div>
          </div>
          <p className="text-body-small-regular text-muted-foreground">
            {formatDecimal(openPrice ?? '0', '0')}
            <ArrowRight className="inline" width={13.3} height={10} />
            {formatDecimal(currentPrice ?? '0', '0')}
          </p>
        </div>

        <div className="items-end">
          <p
            className={`text-h3-semibold tabular-nums ${safeProfit < 0 ? 'text-red-500' : 'text-green-500'}`}
          >
            {safeProfit > 0 ? '+' : ''}
            {formatDecimal(safeProfit, '0.00', 2)}
          </p>
        </div>
      </motion.button>
    </div>
  );
}

export const PositionRow = React.memo(PositionRowComponent, (prev, next) => {
  const prevPrice = prev.rtBySymbol[prev.position.symbol];
  const nextPrice = next.rtBySymbol[next.position.symbol];

  const decimalEq = (a: unknown, b: unknown) => {
    const aDec = toDecimal(a as any);
    const bDec = toDecimal(b as any);
    if (!aDec && !bDec) return true;
    if (!aDec || !bDec) return false;
    return aDec.eq(bDec);
  };

  return (
    prev.i18nLanguage === next.i18nLanguage &&
    prev.position === next.position &&
    decimalEq(prevPrice?.bid, nextPrice?.bid) &&
    decimalEq(prevPrice?.ask, nextPrice?.ask)
  );
});

export function PositionsTab({
  selectedSort,
  sortOptions,
  selectedDirection,
  onSortPress,
  bulkOperationsModalVisible,
  setBulkOperationsModalVisible,
  rtBySymbol,
  activeAccountId,
  setOpenPositions,
  isLoadingPositions,
  data: apiData,
}: PositionsTabProps) {
  const { t, i18n } = useTranslation();
  const [selectedPosition, setSelectedPosition] = useState<
    (Position & { digit: number; profit: number }) | null
  >(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const [copiedPositionId, setCopiedPositionId] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);

  const { colors } = useTheme();
  const { showError } = useToast();
  const router = useRouter();
  const closePositionsMutation = useClosePositions(activeAccountId || '');
  const { assets: assetsData } = useGetData();

  const enrichedPositions: Position[] = useMemo(
    () =>
      getEnrichedPositionsFromInfiniteData(
        apiData as { pages?: Array<{ data: Position[] }> } | undefined,
        assetsData,
      ),
    [apiData, assetsData],
  );

  const sortedPositions: Position[] = useMemo(
    () => sortArray(enrichedPositions, selectedSort, selectedDirection ?? null),
    [enrichedPositions, selectedSort, selectedDirection],
  );

  const { profitablePositions, losingPositions } = useMemo(
    () => splitPositionsByPnL(sortedPositions, rtBySymbol),
    [sortedPositions, rtBySymbol],
  );

  useEffect(() => {
    setOpenPositions?.(sortedPositions);
  }, [sortedPositions, setOpenPositions, activeAccountId]);
  const handlePositionLongPress = (position: Position, digit: number, profit: number) => {
    setSelectedPosition({ ...position, digit, profit });
    setCopiedPositionId(false);
    setShowPositionModal(true);
  };

  const handleCopyPositionId = async () => {
    if (!selectedPosition?.id) return;
    try {
      await copyText(selectedPosition.id.toString());
      setCopiedPositionId(true);
      if (copiedTimeout) clearTimeout(copiedTimeout);
      const timeout = setTimeout(() => setCopiedPositionId(false), 2000);
      setCopiedTimeout(timeout);
    } catch (error) {
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyPositionId'));
    }
  };

  const getSortLabel = (value: unknown) => {
    const option = sortOptions?.find((opt) => opt.value === value);
    if (option?.label) return option.label;

    if (typeof value === 'string' && value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    return t('position.sort.default');
  };

  const handleCloseByFilter = (filterFn: (position: Position) => boolean) => {
    const filteredPositions = sortedPositions.filter(filterFn);
    if (!filteredPositions.length) {
      setBulkOperationsModalVisible(false);
      return;
    }

    closePositionsMutation.mutate(filteredPositions, {
      onError: (error: unknown) => {
        console.error('❌ Close Positions Error:', error);
      },
      onSuccess: () => {
        setBulkOperationsModalVisible(false);
      },
    });
  };

  const handleCloseAllPositions = () => handleCloseByFilter(() => true);

  const handleCloseProfitablePositions = () =>
    handleCloseByFilter((position) => profitablePositions.includes(position));

  const handleCloseLosingPositions = () =>
    handleCloseByFilter((position) => losingPositions.includes(position));

  const selectedPrice = selectedPosition ? rtBySymbol[selectedPosition.symbol] : undefined;

  const selectedFields = useMemo(() => {
    if (!selectedPosition || !selectedPrice || !showPositionModal) return null;
    return calculatePositionFields(selectedPosition, {
      [selectedPosition.symbol]: selectedPrice,
    });
  }, [selectedPosition, selectedPrice, showPositionModal]);

  const { percentage, priceDiff, digit, profit } = selectedFields || {};

  const hasProfitablePositions = useMemo(() => {
    return profitablePositions.length > 0;
  }, [profitablePositions]);

  // Check if there are losing positions
  const hasLosingPositions = useMemo(() => {
    return losingPositions.length > 0;
  }, [losingPositions]);
  const currentUnrealizedPnl = useMemo(() => {
    return calculateTotalUnrealizedPnL(sortedPositions, rtBySymbol);
  }, [sortedPositions, rtBySymbol]);
  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: sortedPositions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (isLoadingPositions) {
    return (
      <div className="flex-1">
        <div className="mb-3 flex-row items-center gap-4">
          <button
            className="bg-card flex items-center gap-2 rounded px-3 py-2"
            onClick={onSortPress}
          >
            <FilterLines size={16} className="text-muted-foreground" />
            <p className="text-button-small-medium text-foreground">
              {t('position.modal.sortBy')}: {getSortLabel(selectedSort)}
            </p>
          </button>
        </div>
        <div className="h-full flex-1 flex-col gap-2">
          <div className="mb-2 flex flex-row items-center justify-between">
            <p className="text-h3-semibold text-foreground">{t('position.tabs.positions')}</p>
            <Button
              onClick={() => setBulkOperationsModalVisible(true)}
              variant="white-contained"
              className="text-primary-500! text-button-large-medium"
              disabled={isLoadingPositions}
            >
              {t('position.modal.close')}
            </Button>
          </div>
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-background flex flex-row items-center justify-between">
                <div className="flex flex-1 flex-col items-start justify-center gap-2">
                  <div className="flex flex-row items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1">
        <div className="mb-3 flex flex-row items-center justify-between gap-4">
          <button
            className="bg-card flex items-center gap-2 rounded px-3 py-2"
            onClick={onSortPress}
          >
            <FilterLines size={16} className="text-muted-foreground" />
            <p className="text-button-small-medium text-foreground">
              {t('position.modal.sortBy')}: {getSortLabel(selectedSort)}
            </p>
          </button>
          <div
            className={`text-h2-semibold ${currentUnrealizedPnl < 0 ? 'text-red-500' : 'text-green-500'} tabular-nums`}
          >
            {currentUnrealizedPnl < 0 ? '-' : '+'}
            {formatDecimal(Math.abs(currentUnrealizedPnl), '0.00', 2)}
          </div>
        </div>
        <div className="h-full flex-1 flex-col gap-2">
          <div className="mb-2 flex flex-row items-center justify-between">
            <p className="text-h3-semibold text-foreground">{t('position.tabs.positions')}</p>
            <Button
              onClick={() => setBulkOperationsModalVisible(true)}
              variant="white-contained"
              className="text-primary-500! text-button-large-medium"
            >
              {t('position.modal.close')}
            </Button>
          </div>
          {sortedPositions.length === 0 ? (
            <div className="flex h-[70%] flex-col items-center justify-center">
              <p className="text-body-medium text-muted-foreground">
                {t('position.modal.noPositionsAvailable')}
              </p>
            </div>
          ) : (
            <div
              ref={parentRef}
              className="h-full flex-1 overflow-y-auto"
              style={{ paddingBottom: 20 }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize() + 60}px`,
                  width: '100%',
                  position: 'relative',
                  minHeight: 0,
                }}
              >
                {virtualItems.map((virtualItem) => {
                  const position = sortedPositions[virtualItem.index];
                  return (
                    <div
                      key={position.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <PositionRow
                        position={position}
                        rtBySymbol={rtBySymbol}
                        onClick={handlePositionLongPress}
                        i18nLanguage={i18n.language}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={showPositionModal} onOpenChange={setShowPositionModal}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto w-full max-w-192 border-none bg-transparent! p-0"
        >
          {selectedPosition && showPositionModal && (
            <div>
              <div className="bg-background mx-4 mb-2 rounded">
                {/* Title and Badge Row */}
                <div className="bg-card rounded-t-[4px] px-4 py-3">
                  <div className="flex flex-row items-start justify-between">
                    <div className="mb-1 flex flex-row items-center gap-2">
                      <h2 className="text-h2-semibold text-foreground">
                        {selectedPosition.symbol}
                      </h2>
                      <div
                        className={`rounded px-2.5 py-1.5 ${selectedPosition.side === ORDER_SIDES.BUY ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}
                      >
                        <p
                          className={`text-caption-medium ${selectedPosition.side === ORDER_SIDES.BUY ? 'text-green-500 dark:text-green-200' : 'text-red-500 dark:text-red-200'}`}
                        >
                          {selectedPosition.side === ORDER_SIDES.BUY
                            ? t('position.filter.buy')
                            : t('position.filter.sell')}{' '}
                          {formatDecimal(selectedPosition.quantity, '0')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-1">
                      <p className="text-body-small-regular text-foreground">
                        #
                        {selectedPosition.id
                          ? `${selectedPosition.id.slice(0, 4)}...${selectedPosition.id.slice(-4)}`
                          : t('position.modal.unknownAsset')}
                      </p>
                      <button onClick={() => handleCopyPositionId()}>
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
                    {selectedPosition.symbolName || t('position.modal.unknownAsset')}
                  </p>
                </div>

                {/* Price Range */}
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <div className="px-4">
                      <p className="text-body-small-regular text-foreground mt-2">
                        {formatDecimal(selectedPosition.openPrice, '0')}
                        <ArrowRight width={13.3} height={10} className="inline" />
                        {formatDecimal(
                          selectedPosition.side === ORDER_SIDES.BUY
                            ? (rtBySymbol?.[selectedPosition.symbol]?.bid ?? 0)
                            : (rtBySymbol?.[selectedPosition.symbol]?.ask ?? 0),
                          '0',
                        )}
                      </p>
                    </div>

                    {/* PnL Row */}
                    <div className="mb-2 flex flex-row items-center justify-between px-4">
                      <div>
                        <p
                          className={`text-body-small-regular ${(profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'} mb-1`}
                        >
                          Δ = {formatDecimal(priceDiff ?? 0, '0', digit ?? 2)} (
                          {formatDecimal(percentage ?? 0, '0.00', 2)}
                          %)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mr-4">
                    <p
                      className={`text-h2-semibold ${(profit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {(profit ?? 0) > 0 ? '+' : ''}
                      {formatDecimal(profit ?? 0, '0.00', 2)}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mb-2 px-4">
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.stopLoss')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(
                        selectedPosition.stopLossPrice,
                        t('position.modal.unset'),
                        selectedPosition.digit,
                      )}
                    </p>
                  </div>
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.takeProfit')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(
                        selectedPosition.takeProfitPrice,
                        t('position.modal.unset'),
                        selectedPosition.digit,
                      )}
                    </p>
                  </div>
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.swap')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(selectedPosition.unrealizedSwap, '0')}
                    </p>
                  </div>
                  <div className="mb-1 flex flex-row justify-between">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.charges')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatDecimal(selectedPosition.unrealizedFees ?? '0', '0')}
                    </p>
                  </div>
                  <div className="flex flex-row justify-between pb-2!">
                    <p className="text-body-small-regular text-muted-foreground">
                      {t('position.modal.openTime')}:
                    </p>
                    <p className="text-body-small-medium text-foreground">
                      {formatPositionDateTime(selectedPosition.openedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-background mx-4 mb-2 flex flex-col gap-2.5 rounded p-4">
                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowPositionModal(false);
                    useSelectedPositionStore.setState({ selectedPosition });
                    router.push(`/opening-order?tab=close_position&tabBack=positions`);
                  }}
                  variant="red-ghost"
                >
                  <p className="text-button-small-medium">{t('position.modal.closePosition')}</p>
                </Button>

                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowPositionModal(false);
                    useSelectedPositionStore.setState({ selectedPosition });
                    router.push(
                      `/opening-order?tab=close_position&orderType=Modify Position&tabBack=positions`,
                    );
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-small-medium">{t('position.modal.modifyPosition')}</p>
                </Button>

                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowPositionModal(false);
                    useSelectedPositionStore.setState({ selectedPosition });
                    router.push(`/opening-order?tab=open_position&tabBack=positions`);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-small-medium">{t('position.modal.trade')}</p>
                </Button>

                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowPositionModal(false);
                    router.push(`/market/${selectedPosition.symbol}`);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-small-medium">{t('position.modal.chart')}</p>
                </Button>

                <Button
                  className="py-2 text-center"
                  onClick={() => {
                    setShowPositionModal(false);
                    setBulkOperationsModalVisible(true);
                  }}
                  variant="neutral-ghost"
                >
                  <p className="text-button-small-medium">{t('position.modal.bulkOperations')}</p>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
              className="px-4 py-3 text-center disabled:opacity-50"
              disabled={closePositionsMutation.isPending}
              onClick={handleCloseAllPositions}
              variant="neutral-ghost"
            >
              {closePositionsMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.closeAllPositions')}
                </p>
              )}
            </Button>

            <Button
              className="px-4 py-3 text-center disabled:opacity-50"
              disabled={closePositionsMutation.isPending || !hasProfitablePositions}
              onClick={handleCloseProfitablePositions}
              variant="neutral-ghost"
            >
              {closePositionsMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.closeProfitablePositions')}
                </p>
              )}
            </Button>

            <Button
              className="px-4 py-3 text-center disabled:opacity-50"
              disabled={closePositionsMutation.isPending || !hasLosingPositions}
              onClick={handleCloseLosingPositions}
              variant="neutral-ghost"
            >
              {closePositionsMutation.isPending ? (
                <p className="text-foreground">{t('position.modal.processing')}</p>
              ) : (
                <p className="text-button-large-medium text-foreground">
                  {t('position.modal.closeLosingPositions')}
                </p>
              )}
            </Button>
          </div>

          <div className="my-4 px-4">
            <Button
              className="w-full py-3"
              onClick={() => {
                setBulkOperationsModalVisible(false);
              }}
              variant="red-ghost"
            >
              <p className="text-button-large-medium text-center text-red-500">
                {t('position.modal.cancel')}
              </p>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
