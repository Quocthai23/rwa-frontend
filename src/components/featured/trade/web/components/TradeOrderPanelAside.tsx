'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Share04 } from '@untitledui/icons';
import { toPng } from 'html-to-image';

import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hook/useToast';
import ShareModal from '@/components/featured/SymbolDetail/components/ShareModal';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/tradePanel/utils/tradePanelTypes';
import {
  TradeWebAsideOrderForm,
  type TradeWebAsideOrderFormHandle,
} from './TradeWebAsideOrderForm';
import type { DecimalValue } from '@/types/decimal';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';

const DISCOVER_COMPOSER_SHARE_IMAGE_EVENT = 'discover:web:composer:add-image';
const DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY = 'discover:web:composer:pending-share-image';

function signedPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function isValidPrice(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export type TradeOrderPanelAsideProps = {
  assetId: string;
  isFavorite?: boolean;
  expanded: boolean;
  selectedAssetName: string;
  currentSymbol: string;
  ask: DecimalValue | undefined;
  bid: DecimalValue | undefined;
  lastPrice: DecimalValue | undefined;
  digit: number;
  chg: number;
  chgClass: string;
  leverage: number;
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  tradePanelRef: React.MutableRefObject<TradePanelSheetHandle | null>;
  asideOrderFormRef: React.MutableRefObject<TradeWebAsideOrderFormHandle | null>;
  isOneClickEnabled: boolean;
  isAsideLimitMode: boolean;
  disableOrderActions?: boolean;
  orderSide: 'buy' | 'sell';
  onOrderSideChange: (side: 'buy' | 'sell') => void;
  onAsideQuantityLabelChange: (label: string) => void;
  shareCaptureRef: React.RefObject<HTMLElement | null>;
};

export function TradeOrderPanelAside({
  assetId,
  isFavorite = false,
  expanded,
  selectedAssetName,
  currentSymbol,
  ask,
  bid,
  lastPrice,
  digit,
  chg,
  chgClass,
  leverage,
  limitPrice,
  setLimitPrice,
  tradePanelRef,
  asideOrderFormRef,
  isOneClickEnabled,
  isAsideLimitMode,
  disableOrderActions = false,
  orderSide,
  onOrderSideChange,
  onAsideQuantityLabelChange,
  shareCaptureRef,
}: TradeOrderPanelAsideProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const [showShareModal, setShowShareModal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<null | string>(null);
  const askValue = toFiniteNumberFromNumberish(ask);
  const bidValue = toFiniteNumberFromNumberish(bid);
  const lastPriceValue = toFiniteNumberFromNumberish(lastPrice);
  const hasAsk = isValidPrice(askValue);
  const hasBid = isValidPrice(bidValue);
  const hasLastPrice = isValidPrice(lastPriceValue);
  const hasBothPrices = hasAsk && hasBid;
  const midText = hasBothPrices ? ((askValue + bidValue) / 2).toFixed(digit) : '--';
  const bidText = hasBid ? bidValue.toFixed(digit) : '--';
  const askText = hasAsk ? askValue.toFixed(digit) : '--';
  const spreadText = hasBothPrices ? (askValue - bidValue).toFixed(digit) : '--';

  const triggerOneClickSubmit = useCallback(
    (side: 'buy' | 'sell') => {
      if (!isOneClickEnabled || disableOrderActions) return;

      // Defer submit one frame so the side-switch render can paint first.
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          asideOrderFormRef.current?.submitOrder(side);
        });
        return;
      }

      window.setTimeout(() => {
        asideOrderFormRef.current?.submitOrder(side);
      }, 0);
    },
    [asideOrderFormRef, isOneClickEnabled, disableOrderActions],
  );

  const handleCapture = async () => {
    try {
      const targetNode = shareCaptureRef.current;
      if (!targetNode) return;
      setCapturedImageUri(null);
      setShowShareModal(true);

      const isDark =
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const backgroundColor = isDark ? '#0b1220' : '#ffffff';

      const captured = await toPng(targetNode, {
        backgroundColor,
        cacheBust: true,
        skipFonts: true,
      });
      setCapturedImageUri(captured);
    } catch (error) {
      console.error('Failed to capture share image:', error);
      setShowShareModal(false);
      showToast({
        title: t('symbolDetail.shareModal.captureFailedTitle', {
          defaultValue: 'Capture failed',
        }),
        message: t('symbolDetail.shareModal.captureFailed', {
          defaultValue: 'Failed to capture image. Please try again.',
        }),
        type: 'error',
      });
    }
  };

  const handleShareToDiscoverComposer = useCallback(
    async (imageUri: string) => {
      if (typeof window === 'undefined') return;

      const payload = { imageUrl: imageUri };
      try {
        window.sessionStorage.setItem(
          DISCOVER_COMPOSER_SHARE_IMAGE_STORAGE_KEY,
          JSON.stringify(payload),
        );
      } catch {
        // ignore storage errors
      }

      window.dispatchEvent(
        new CustomEvent(DISCOVER_COMPOSER_SHARE_IMAGE_EVENT, { detail: payload }),
      );
      setShowShareModal(false);
      router.push('/discover?tab=for-you');
    },
    [router],
  );

  return (
    <aside
      className={cn(
        'bg-background flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 ease-in-out',
        expanded
          ? 'border-border w-65 border-l px-2 py-3 opacity-100'
          : 'pointer-events-none w-0 border-l-0 px-0 py-0 opacity-0',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="border-border shrink-0 border-b pb-4">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <p className="text-body-large-semibold text-foreground">{selectedAssetName}</p>
              <p className="text-body-large-regular text-muted-foreground">{currentSymbol}</p>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <ToggleFavouriteAsset
                assetId={assetId}
                defaultIsFavorite={isFavorite}
                size={6}
                className="bg-transparent"
              />
              <Button
                type="button"
                onClick={handleCapture}
                aria-label={t('symbolDetail.share')}
                variant="white-contained"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5 transition-colors"
              >
                <Share04 size={20} />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1">
                <p className={`text-display-sm font-semibold ${chgClass}`}>
                  {lastPriceValue?.toFixed(digit) ?? '--'}
                </p>
                <span className="text-body-small-medium text-muted-foreground">USD</span>
                {chg > 0 && <ArrowUp size={16} className="text-green-500" />}
                {chg < 0 && <ArrowDown size={16} className="text-red-500" />}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <p className={cn('text-body-small-medium', chgClass)}>
                  {hasBothPrices ? (askValue - bidValue).toFixed(2) : '--'}
                </p>
                <p className={cn('text-body-small-medium', chgClass)}>{signedPercent(chg)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-2">
          <Button
            disabled={disableOrderActions}
            onClick={() => {
              onOrderSideChange('sell');
              triggerOneClickSubmit('sell');
            }}
            className={cn(
              'focus-visible:ring-primary-500 flex flex-col items-start gap-0 rounded px-3 py-2 text-left transition-shadow outline-none focus-visible:ring-2 active:opacity-80',
              isOneClickEnabled
                ? 'bg-red-500'
                : orderSide === 'sell'
                  ? 'border border-red-500 bg-red-50 dark:bg-red-900'
                  : 'bg-red-50 dark:bg-red-900',
            )}
          >
            <p
              className={`${
                isOneClickEnabled
                  ? 'text-body-small-medium text-white'
                  : orderSide === 'sell'
                    ? 'text-body-small-medium text-red-500 dark:text-white'
                    : 'text-body-small-medium text-red-500 dark:text-white'
              }`}
            >
              {t('trade.sell')}
            </p>
            <p
              className={`${
                isOneClickEnabled
                  ? 'text-body-small-medium text-white'
                  : orderSide === 'sell'
                    ? 'text-body-small-medium text-red-500 dark:text-white'
                    : 'text-body-small-medium text-red-500 dark:text-white'
              }`}
            >
              {bidText}
            </p>
          </Button>
          <Button
            type="button"
            disabled={disableOrderActions}
            onClick={() => {
              onOrderSideChange('buy');
              triggerOneClickSubmit('buy');
            }}
            className={cn(
              'focus-visible:ring-primary-500 flex flex-col items-end gap-0 rounded px-3 py-2 text-right transition-shadow outline-none focus-visible:ring-2 active:opacity-80',
              isOneClickEnabled
                ? 'bg-green-500'
                : orderSide === 'buy'
                  ? 'border border-green-500 bg-green-50 dark:bg-green-900'
                  : 'bg-green-50 dark:bg-green-900',
            )}
          >
            <p
              className={`${
                isOneClickEnabled
                  ? 'text-body-small-medium text-white'
                  : orderSide === 'buy'
                    ? 'text-body-small-medium text-green-500 dark:text-white'
                    : 'text-body-small-medium text-green-500 dark:text-white'
              }`}
            >
              {t('trade.buy')}
            </p>
            <p
              className={`${
                isOneClickEnabled
                  ? 'text-body-small-medium text-white'
                  : orderSide === 'buy'
                    ? 'text-body-small-medium text-green-500 dark:text-white'
                    : 'text-body-small-medium text-green-500 dark:text-white'
              }`}
            >
              {askText}
            </p>
          </Button>
          <div className="border-primary-500 bg-primary-500 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded border px-2 py-0.5">
            <p className="text-body-small-medium text-white">{spreadText}</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TradeWebAsideOrderForm
            ref={asideOrderFormRef}
            symbol={currentSymbol}
            leverage={leverage}
            digit={digit}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            tradePanelRef={tradePanelRef}
            orderSide={orderSide}
            oneClickMode={isOneClickEnabled && !isAsideLimitMode}
            asideLimitMode={isAsideLimitMode}
            onAsideQuantityChange={onAsideQuantityLabelChange}
          />
        </div>
      </div>

      <ShareModal
        imageUri={capturedImageUri}
        visible={showShareModal}
        onShareToDiscover={handleShareToDiscoverComposer}
        onClose={() => {
          setShowShareModal(false);
        }}
      />
    </aside>
  );
}
