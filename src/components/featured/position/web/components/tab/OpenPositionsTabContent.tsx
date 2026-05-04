'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toPng } from 'html-to-image';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import { useInfinitePositions } from '@/hook/usePosition';
import { useToast } from '@/hook/useToast';
import { cn } from '@/lib/utils';
import { closePositions } from '@/services/positionService';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { createThemeColors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';
import { useGetData } from '@/context/GetdataContext';
import type { Asset } from '@/types/assets';
import type { Position } from '@/types/position';
import { Check, Copy01, InfoCircle, Share04, X } from '@untitledui/icons';
import { Decimal } from 'decimal.js';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { ORDER_SIDES } from '@/types/orders';
import {
  calculateUnrealizedPnL,
  getEnrichedPositionsFromInfiniteData,
} from '../../../utils/position.calculations';
import { formatPositionDateTime } from '@/utils/dateUtils';
import {
  EmptyState,
  type RtBySymbol,
  type SortDir,
  SortHeader,
  TableLoadingState,
  TargetPriceCell,
  formatDecimal,
  sideLabel,
  sortRows,
} from './PositionWebTableShared';

const POSITION_WEB_COLORS = createThemeColors();

const OPEN_POSITIONS_SORT_STORAGE_KEY = 'position:web:sort:open-positions';
const SHARE_POSITION_BG_URL =
  'https://www.figma.com/api/mcp/asset/c6a5723f-198a-459e-bd31-67aada5bb905';
const DISCOVER_COMPOSER_SHARE_IMAGE_EVENT = 'discover:web:composer:add-image';
const DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY = 'discover:web:composer:pending-share-image';

type OpenPositionsSortKey = 'openedAt' | 'symbol' | 'side' | 'quantity';

type OpenPositionsSortState = {
  sortKey: OpenPositionsSortKey | null;
  sortDir: SortDir;
};

type PnlSharePosition = {
  symbol: string;
  side: Position['side'];
  quantity: number;
  openPrice: number;
  currentPrice: number | null;
  pnl: number;
};

const DEFAULT_OPEN_POSITIONS_SORT: OpenPositionsSortState = {
  sortKey: null,
  sortDir: 'asc',
};

function readOpenPositionsSort(storageKey: string): OpenPositionsSortState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OpenPositionsSortState>;
    const validKeys: OpenPositionsSortKey[] = ['openedAt', 'symbol', 'side', 'quantity'];
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

function persistOpenPositionsSort(storageKey: string, value: OpenPositionsSortState) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function normalizeLotText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const raw = String(value).trim();
  if (!raw) return '';

  try {
    return new Decimal(raw).toString();
  } catch {
    return raw;
  }
}

function PositionsTable({
  rows,
  rtBySymbol,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: Position[];
  rtBySymbol: RtBySymbol;
  sortKey?: string | null;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
}) {
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());
  const [selectedPosition, setSelectedPosition] = useState<
    (Position & { digit: number; profit: number }) | null
  >(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Position | null>(null);
  const [closeLotText, setCloseLotText] = useState('');
  const [copiedPositionId, setCopiedPositionId] = useState(false);
  const [copiedTimeout, setCopiedTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedPnlPosition, setSelectedPnlPosition] = useState<PnlSharePosition | null>(null);
  const [isPnlDialogOpen, setIsPnlDialogOpen] = useState(false);
  const [isSharingPnlCard, setIsSharingPnlCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement | null>(null);
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { assets } = useGetData();
  const isConnected = useMarketSocketStore((state) => state.isConnected);
  const isReconnecting = useMarketSocketStore((state) => state.isReconnecting);

  // Column width mappings: percentage-based
  const columnWidths = {
    symbol: 9,
    side: 8,
    lots: 9,
    openingPrice: 13,
    currentPrice: 13,
    takeProfit: 13,
    stopLoss: 13,
    netPnl: 12,
    action: 10,
  };

  const getColumnStyle = (columnKey: keyof typeof columnWidths) => {
    const width = columnWidths[columnKey];
    return { width: `${width}%` };
  };

  const assetsBySymbol = useMemo(() => {
    const map = new Map<string, Asset>();
    (assets ?? []).forEach((asset) => {
      map.set(asset.symbol, asset);
    });
    return map;
  }, [assets]);

  const canTrade = navigator.onLine && isConnected && !isReconnecting;

  const displayRows = useMemo(() => {
    const enrichedRows = getEnrichedPositionsFromInfiniteData({ pages: [{ data: rows }] }, assets);
    return onSort ? sortRows(enrichedRows, sortKey || null, sortDir || 'asc') : enrichedRows;
  }, [rows, sortKey, sortDir, onSort]);
  if (displayRows.length === 0)
    return <EmptyState label={t('position.modal.positions', { defaultValue: 'positions' })} />;

  const handleClosePosition = async (position: Position, lotNum: number) => {
    if (closingPositions.has(position.id)) return;
    if (!position) return;
    try {
      setClosingPositions((prev) => new Set(prev).add(position.id));
      await closePositions(position.id, position.accountId, lotNum);
      showSuccess(t('position.modal.positionClosed'), t('position.modal.positionClosedSuccess'));
      setIsCloseModalOpen(false);
      setCloseTarget(null);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last update')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
      } else {
        showError(
          t('common.error'),
          error instanceof Error ? error.message : t('position.modal.errorClosingPosition'),
        );
      }
    } finally {
      setClosingPositions((prev) => {
        const next = new Set(prev);
        next.delete(position.id);
        return next;
      });
    }
  };

  const openCloseModal = (position: Position) => {
    setCloseTarget(position);
    setCloseLotText(normalizeLotText(position.quantity));
    setIsCloseModalOpen(true);
  };

  const parseLotValue = (value: string) => {
    const normalized = value.replace(/,/g, '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const sanitizeLotInput = (value: string) => {
    const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const [integerPart, ...fractionParts] = normalized.split('.');

    if (fractionParts.length === 0) return integerPart;

    return `${integerPart}.${fractionParts.join('')}`;
  };

  const handleConfirmClose = async () => {
    if (!closeTarget) return;

    if (!canTrade) {
      showError(
        t('openingOrder.errors.connectionError'),
        t('openingOrder.errors.cannotCloseDisconnected'),
      );
      return;
    }

    const lotNum = parseLotValue(closeLotText);
    if (!lotNum || lotNum <= 0) {
      showError(t('openingOrder.errors.error'), t('openingOrder.errors.lotMustBeGreaterThanZero'));
      return;
    }

    const positionQty = new Decimal(closeTarget.quantity);
    const lot = new Decimal(lotNum);
    const minTradeSize = Number(assetsBySymbol.get(closeTarget.symbol)?.minTradeSize ?? 0);

    if (minTradeSize > 0) {
      const min = new Decimal(minTradeSize);
      const remaining = positionQty.minus(lot);
      if (remaining.gt(0) && remaining.lessThan(min)) {
        showError(
          t('openingOrder.errors.error'),
          t('openingOrder.errors.remainingPositionSizeAtLeast', { min: min.toString() }),
        );
        return;
      }

      if (lot.gt(positionQty)) {
        showError(
          t('openingOrder.errors.error'),
          t('openingOrder.errors.lotMustBeBetween', {
            min: min.toString(),
            max: positionQty.toString(),
          }),
        );
        return;
      }
    } else if (lot.gt(positionQty)) {
      showError(
        t('openingOrder.errors.error'),
        t('openingOrder.errors.lotMustBeBetween', {
          min: '0',
          max: positionQty.toString(),
        }),
      );
      return;
    }

    await handleClosePosition(closeTarget, lotNum);
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const handleOpenDetailModal = (position: Position) => {
    const digit = position.digit ?? 2;
    setSelectedPosition({
      ...position,
      digit,
      profit: calculateUnrealizedPnL(position, rtBySymbol || {}),
    });
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
      showError(t('position.modal.copyFailed'), t('position.modal.failedCopyPositionId'));
    }
  };

  const handleOpenPnlDialog = (position: Position, pnl: number, currentPrice: number | null) => {
    setSelectedPnlPosition({
      symbol: position.symbol,
      side: position.side,
      quantity: Number(position.quantity),
      openPrice: Number(position.openPrice),
      currentPrice,
      pnl,
    });
    setIsPnlDialogOpen(true);
  };

  const handleSharePnlCardToDiscoverComposer = async () => {
    if (typeof window === 'undefined') return;
    if (isSharingPnlCard) return;

    const targetNode = shareCardRef.current;
    if (!targetNode) {
      showError(t('common.error'), t('symbolDetail.shareModal.captureFailed'));
      return;
    }

    setIsSharingPnlCard(true);

    try {
      const capturedImage = await toPng(targetNode, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const payload = { imageUrl: capturedImage };

      window.sessionStorage.setItem(
        DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY,
        JSON.stringify(payload),
      );

      window.dispatchEvent(
        new CustomEvent(DISCOVER_COMPOSER_SHARE_IMAGE_EVENT, { detail: payload }),
      );
      setIsPnlDialogOpen(false);
      setSelectedPnlPosition(null);
      router.push('/discover?tab=for-you');
    } catch {
      showError(t('common.error'), t('symbolDetail.shareModal.captureFailed'));
    } finally {
      setIsSharingPnlCard(false);
    }
  };

  return (
    <>
      <table
        className="dark:bg-background min-w-280 flex-1 border-separate border-spacing-0 bg-white"
        style={{ tableLayout: 'fixed' }}
      >
        <thead className="dark:bg-card sticky top-0 z-10 bg-white">
          <tr className="text-body-small-regular border-border [&>th]:bg-card border-b [&>th]:sticky [&>th]:top-0 [&>th]:z-20">
            <th className="px-2 py-2 text-left" style={getColumnStyle('symbol')}>
              {onSort ? (
                <SortHeader
                  label={t('market.columns.symbol', { defaultValue: 'Symbol' })}
                  sortKey="symbol"
                  currentSortKey={sortKey || null}
                  currentSortDir={sortDir || 'asc'}
                  onSort={handleSort}
                />
              ) : (
                <span className="text-muted-foreground">
                  {t('market.columns.symbol', { defaultValue: 'Symbol' })}
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
                <span className="text-muted-foreground text-right">
                  {t('position.modal.lots', { defaultValue: 'Lot(s)' })}
                </span>
              )}
            </th>
            <th
              className="text-muted-foreground px-2 py-2 text-right font-normal"
              style={getColumnStyle('openingPrice')}
            >
              {t('position.modal.openingPrice', { defaultValue: 'Opening Price' })}
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
              style={getColumnStyle('netPnl')}
            >
              {t('position.modal.netPnl', { defaultValue: 'Net PnL' })}
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
          {displayRows.map((position) => {
            const current =
              position.side === ORDER_SIDES.BUY
                ? rtBySymbol?.[position.symbol]?.bid
                : rtBySymbol?.[position.symbol]?.ask;
            const pnl = calculateUnrealizedPnL(position, rtBySymbol || {});
            const pnlClass = pnl >= 0 ? 'text-green-500' : 'text-red-500';
            const sideClass = position.side === ORDER_SIDES.BUY ? 'text-green-500' : 'text-red-500';

            return (
              <tr
                key={position.id}
                className="text-body-small-medium border-border hover:bg-muted border-b transition-colors"
              >
                <td className="text-foreground px-2 py-2" style={getColumnStyle('symbol')}>
                  <div className="inline-flex items-center gap-1.5">
                    <Button
                      variant="white-contained"
                      onClick={() => handleOpenDetailModal(position)}
                      className="text-muted-foreground hover:text-primary-500 dark:hover:bg-card cursor-pointer transition-colors"
                    >
                      <InfoCircle size={19} />
                    </Button>
                    <span>{position.symbol}</span>
                    <span className="text-caption-regular dark:bg-primary-900 rounded bg-blue-50 px-1.5 py-0.5 text-blue-500 dark:text-blue-200">
                      {position.leverage}X
                    </span>
                  </div>
                </td>
                <td
                  className={cn('px-2 py-2 text-right', sideClass)}
                  style={getColumnStyle('side')}
                >
                  {sideLabel(position.side)}
                </td>
                <td
                  className="text-foreground px-2 py-2 text-right tabular-nums"
                  style={getColumnStyle('lots')}
                >
                  {formatDecimal(position.quantity)}
                </td>
                <td
                  className="px-2 py-2 text-right tabular-nums"
                  style={getColumnStyle('openingPrice')}
                >
                  {formatDecimal(position.openPrice)}
                </td>
                <td
                  className="px-2 py-2 text-right tabular-nums"
                  style={getColumnStyle('currentPrice')}
                >
                  {current ?? '-'}
                </td>
                <td className="px-2 py-2 text-right" style={getColumnStyle('takeProfit')}>
                  <TargetPriceCell
                    value={position.takeProfitPrice}
                    takeProfitValue={position.takeProfitPrice}
                    stopLossValue={position.stopLossPrice}
                    label={t('position.modal.addTP', { defaultValue: 'Add TP' })}
                    estimateContext={{
                      side: position.side as (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES],
                      symbol: position.symbol,
                      quantity: position.quantity,
                      entryPrice: position.openPrice,
                      contractSize: position.contractSize,
                      profitCurrency: position.profitCurrency,
                      digit: position.digit,
                      rtBySymbol: rtBySymbol || {},
                      id: position.id,
                      accountId: position.accountId,
                      type: 'position',
                    }}
                  />
                </td>
                <td className="px-2 py-2 text-right" style={getColumnStyle('stopLoss')}>
                  <TargetPriceCell
                    value={position.stopLossPrice}
                    takeProfitValue={position.takeProfitPrice}
                    stopLossValue={position.stopLossPrice}
                    label={t('position.modal.addSL', { defaultValue: 'Add SL' })}
                    estimateContext={{
                      side: position.side as (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES],
                      symbol: position.symbol,
                      quantity: position.quantity,
                      entryPrice: position.openPrice,
                      contractSize: position.contractSize,
                      profitCurrency: position.profitCurrency,
                      digit: position.digit,
                      rtBySymbol: rtBySymbol || {},
                      id: position.id,
                      accountId: position.accountId,
                      type: 'position',
                    }}
                  />
                </td>

                <td
                  className={cn('px-2 py-2 text-right tabular-nums', pnlClass)}
                  style={getColumnStyle('netPnl')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <p>{formatDecimal(pnl ?? 0, '0.00', 2)}</p>
                    <button
                      type="button"
                      className="text-primary-500 hover:text-primary-400 inline-flex shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPnlDialog(position, pnl, current ?? null);
                      }}
                    >
                      <Share04 size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-2 py-2 text-right" style={getColumnStyle('action')}>
                  <Button
                    variant="primary-outline"
                    disabled={closingPositions.has(position.id)}
                    className={cn(
                      'h-7 min-w-15.5 border px-3 transition-colors',
                      closingPositions.has(position.id)
                        ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                        : 'border-blue-500 text-blue-500 hover:bg-blue-50',
                    )}
                    onClick={() => openCloseModal(position)}
                  >
                    {t('position.modal.close', { defaultValue: 'Close' })}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedPosition && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent
            showCloseButton={false}
            className="dark:border-card max-h-[90vh] w-150 max-w-[calc(100vw-2rem)] overflow-y-auto border-none dark:border-2 dark:border-solid"
          >
            <DialogTitle className="sr-only">{t('position.modal.positionDetails')}</DialogTitle>
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
                        {formatDecimal(selectedPosition.quantity)}
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

              <div className="flex justify-between">
                <div className="flex flex-col gap-1">
                  <div>
                    <p className="text-body-small-regular text-foreground tabular-nums">
                      {formatDecimal(selectedPosition.openPrice)}
                      <svg
                        className="mx-1 inline"
                        width="13"
                        height="10"
                        viewBox="0 0 13 10"
                        fill="none"
                      >
                        <path d="M1 5H12M7 1L12 5L7 9" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      {formatDecimal(
                        selectedPosition.side === ORDER_SIDES.BUY
                          ? (rtBySymbol?.[selectedPosition.symbol]?.bid ?? 0)
                          : (rtBySymbol?.[selectedPosition.symbol]?.ask ?? 0),
                        '0',
                      )}
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-body-small-regular ${selectedPosition.profit >= 0 ? 'text-green-500' : 'text-red-500'} mb-1`}
                    >
                      Δ ={' '}
                      {(
                        (Number(
                          rtBySymbol?.[selectedPosition.symbol]?.bid ?? selectedPosition.openPrice,
                        ) -
                          Number(selectedPosition.openPrice)) *
                        Number(selectedPosition.quantity)
                      ).toFixed(selectedPosition.digit ?? 2)}{' '}
                      (
                      {(
                        (Number(
                          rtBySymbol?.[selectedPosition.symbol]?.bid ?? selectedPosition.openPrice,
                        ) /
                          Number(selectedPosition.openPrice) -
                          1) *
                        100
                      ).toFixed(2)}
                      %)
                    </p>
                  </div>
                </div>
                <div>
                  <p
                    className={`text-h2-semibold text-right tabular-nums ${
                      selectedPosition.profit >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {selectedPosition.profit > 0 ? '+' : ''}
                    {formatDecimal(selectedPosition.profit, '0.00', 2)}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-2">
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.stopLoss')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(
                      selectedPosition.stopLossPrice,
                      t('position.modal.unset'),
                      selectedPosition.digit,
                    )}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.takeProfit')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(
                      selectedPosition.takeProfitPrice,
                      t('position.modal.unset'),
                      selectedPosition.digit ?? 2,
                    )}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.swap')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(selectedPosition.unrealizedSwap)}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.charges')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatDecimal(selectedPosition.unrealizedFees ?? '0')}
                  </p>
                </div>
                <div className="flex flex-row justify-between">
                  <p className="text-body-small-medium text-muted-foreground">
                    {t('position.modal.openTime')}:
                  </p>
                  <p className="text-body-small-medium text-foreground font-medium">
                    {formatPositionDateTime(selectedPosition.openedAt)}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {closeTarget && (
        <Dialog
          open={isCloseModalOpen}
          onOpenChange={(open) => {
            setIsCloseModalOpen(open);
            if (!open) setCloseTarget(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="dark:border-card w-96 max-w-[calc(100vw-2rem)] border-none dark:border-2 dark:border-solid"
          >
            <DialogTitle className="sr-only">{t('position.modal.closePosition')}</DialogTitle>
            <div className="space-y-4">
              <div className="bborder-neutral-300 border-b pb-3">
                <h3 className="text-h3-semibold text-foreground mb-2">
                  {t('position.modal.closePosition')}
                </h3>
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-2">
                    <p className="text-body-small-regular text-foreground">{closeTarget.symbol}</p>
                    <span className="text-caption-regular black:bg-primary-900 rounded px-1.5 py-0.5">
                      {closeTarget.leverage}X
                    </span>
                  </div>
                  <p className="text-body-small-regular text-muted-foreground">
                    #{closeTarget.id ? `${closeTarget.id}` : t('position.modal.unknownAsset')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-body-small-regular text-muted-foreground flex items-center justify-between">
                  <span>
                    {t('openingOrder.lot')}: {formatDecimal(closeTarget.quantity)}
                  </span>
                  <Button
                    variant="white-contained"
                    className="text-primary-500 hover:text-primary-400"
                    onClick={() => setCloseLotText(normalizeLotText(closeTarget.quantity))}
                  >
                    {t('openingOrder.max', { defaultValue: 'Max' })}
                  </Button>
                </div>
                <input
                  id="close-lot"
                  value={closeLotText}
                  onChange={(event) => setCloseLotText(sanitizeLotInput(event.target.value))}
                  inputMode="decimal"
                  type="text"
                  pattern="[0-9]*[.]?[0-9]*"
                  className="text-foreground placeholder:text-muted-foreground border-border w-full rounded-md border bg-transparent px-3 py-2 focus:outline-none"
                  placeholder={t('openingOrder.notSet')}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="neutral-outline"
                  className="flex-1 py-2"
                  onClick={() => {
                    setIsCloseModalOpen(false);
                    setCloseTarget(null);
                  }}
                >
                  {t('position.modal.cancel')}
                </Button>
                <Button
                  variant="primary-contained"
                  className="flex-1"
                  disabled={closingPositions.has(closeTarget.id)}
                  onClick={handleConfirmClose}
                >
                  {closingPositions.has(closeTarget.id)
                    ? t('openingOrder.closing')
                    : t('position.modal.close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedPnlPosition && (
        <Dialog
          open={isPnlDialogOpen}
          onOpenChange={(open) => {
            setIsPnlDialogOpen(open);
            if (!open) setSelectedPnlPosition(null);
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="bg-background w-101.25 overflow-hidden rounded border-none p-0"
          >
            <div className="border-border flex items-center justify-between border-b px-6 py-5">
              <DialogTitle className="text-foreground text-body-large-semibold">
                Share Position
              </DialogTitle>
              <DialogClose className="text-tertiary hover:text-foreground rounded transition-colors">
                <X size={24} />
              </DialogClose>
            </div>
            <div className="space-y-4 p-6">
              <div
                ref={shareCardRef}
                className="relative h-57 overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.12) 100%), url(${SHARE_POSITION_BG_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <div className="flex items-center gap-2">
                    <Image src="/logo/logo-home.png" alt="symbol" width={24} height={24} />
                    <p className="text-body-large-semibold text-white">
                      {selectedPnlPosition.symbol.replace(/USDT|USD|\.m$/gi, '')}
                    </p>
                    <span
                      className={cn(
                        'rounded px-2 py-1 text-xs',
                        selectedPnlPosition.side === ORDER_SIDES.BUY
                          ? 'bg-green-500/15 text-green-500'
                          : 'bg-red-100 text-red-500',
                      )}
                    >
                      {selectedPnlPosition.side === ORDER_SIDES.BUY
                        ? t('position.filter.buy')
                        : t('position.filter.sell')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p
                      className={cn(
                        'text-[44px] leading-none font-semibold tabular-nums',
                        selectedPnlPosition.pnl >= 0 ? 'text-green-500' : 'text-red-500',
                      )}
                    >
                      {selectedPnlPosition.pnl > 0 ? '+' : ''}
                      {formatDecimal(selectedPnlPosition.pnl, '0.00', 2)}
                    </p>
                    <p className="text-body-large-regular text-white">
                      {t('position.modal.openingPrice', { defaultValue: 'Opening Price' })}{' '}
                      <span className="font-semibold">
                        {formatDecimal(selectedPnlPosition.openPrice)}
                      </span>
                    </p>
                    <p className="text-body-large-regular text-white">
                      {t('position.modal.currentPrice', { defaultValue: 'Current Price' })}{' '}
                      <span className="font-semibold">
                        {selectedPnlPosition.currentPrice !== null
                          ? formatDecimal(selectedPnlPosition.currentPrice)
                          : '-'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="primary-contained"
                className="h-12 w-full text-base"
                onClick={handleSharePnlCardToDiscoverComposer}
                disabled={isSharingPnlCard}
              >
                {isSharingPnlCard
                  ? t('discover.web.uploadingImage', { defaultValue: 'Uploading...' })
                  : 'Share'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function OpenPositionsTabContent({
  accountId,
  rtBySymbol,
}: {
  accountId: string;
  rtBySymbol: RtBySymbol;
}) {
  const sortStorageKey = `${OPEN_POSITIONS_SORT_STORAGE_KEY}:${accountId}`;
  const [sortKey, setSortKey] = useState<OpenPositionsSortKey | null>(
    () => readOpenPositionsSort(sortStorageKey)?.sortKey ?? DEFAULT_OPEN_POSITIONS_SORT.sortKey,
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    () => readOpenPositionsSort(sortStorageKey)?.sortDir ?? DEFAULT_OPEN_POSITIONS_SORT.sortDir,
  );

  useEffect(() => {
    const persisted = readOpenPositionsSort(sortStorageKey);
    setSortKey(persisted?.sortKey ?? DEFAULT_OPEN_POSITIONS_SORT.sortKey);
    setSortDir(persisted?.sortDir ?? DEFAULT_OPEN_POSITIONS_SORT.sortDir);
  }, [sortStorageKey]);

  useEffect(() => {
    persistOpenPositionsSort(sortStorageKey, { sortKey, sortDir });
  }, [sortDir, sortKey, sortStorageKey]);

  const {
    data: openPositionsData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePositions({ accountId, status: [0, 1] }, undefined, 'active');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const rows = useMemo(
    () => openPositionsData?.pages.flatMap((page: { data: Position[] }) => page.data) ?? [],
    [openPositionsData],
  );

  const handleSort = (key: string) => {
    const validKeys: OpenPositionsSortKey[] = ['openedAt', 'symbol', 'side', 'quantity'];
    const typedKey = key as OpenPositionsSortKey;
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
    setSortDir(DEFAULT_OPEN_POSITIONS_SORT.sortDir);
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
        <PositionsTable
          rows={rows}
          rtBySymbol={rtBySymbol}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
        {isFetchingNextPage ? <LoadingMoreTableSkeleton /> : null}
      </div>
    </div>
  );
}
