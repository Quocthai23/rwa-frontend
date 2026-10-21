'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Share04 } from '@untitledui/icons';
import { toPng } from 'html-to-image';

import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { demoOrderContext } from '@/lib/trading/demo-order-context';
import { useAuthStore } from '@/store/authStore';
import ShareModal from '@/components/featured/SymbolDetail/components/ShareModal';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/tradePanel/utils/tradePanelTypes';
import {
  TradeWebAsideOrderForm,
  type TradeWebAsideOrderFormHandle,
} from './TradeWebAsideOrderForm';
import type { Asset } from '@/types/assets';
import { BuyoutBuyerPanel } from '../../components/BuyoutBuyerPanel';
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

function formatVnd(value: number, digit = 2): string {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: digit,
    maximumFractionDigits: digit,
  });
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
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  tradePanelRef: React.MutableRefObject<TradePanelSheetHandle | null>;
  asideOrderFormRef: React.MutableRefObject<TradeWebAsideOrderFormHandle | null>;
  isOneClickEnabled: boolean;
  isAsideLimitMode: boolean;
  disableOrderActions?: boolean;
  buyoutSummary?: Asset['buyoutSummary'];
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
  limitPrice,
  setLimitPrice,
  tradePanelRef,
  asideOrderFormRef,
  isOneClickEnabled,
  isAsideLimitMode,
  disableOrderActions = false,
  buyoutSummary,
  orderSide,
  onOrderSideChange,
  onAsideQuantityLabelChange,
  shareCaptureRef,
}: TradeOrderPanelAsideProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [showShareModal, setShowShareModal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<null | string>(null);
  const demo = useAccountStore((s) => Boolean(s.selectedAccount?.accountTypeId.includes('demo')));
  const context = demoOrderContext({
    demo,
    online: true,
    connected: true,
    reconnecting: false,
    limit: isAsideLimitMode,
    bid: Number(bid ?? 0),
    ask: Number(ask ?? 0),
    publicPrice: Number(lastPrice ?? 0),
  });
  const askValue = context.ask;
  const bidValue = context.bid;
  const lastPriceValue = toFiniteNumberFromNumberish(lastPrice);
  const hasAsk = isValidPrice(askValue);
  const hasBid = isValidPrice(bidValue);
  const hasBothPrices = hasAsk && hasBid;
  const sellActionDisabled = disableOrderActions || (!isAsideLimitMode && !hasBid);
  const buyActionDisabled = disableOrderActions || (!isAsideLimitMode && !hasAsk);
  const bidText = hasBid ? formatVnd(bidValue, digit) : '--';
  const askText = hasAsk ? formatVnd(askValue, digit) : '--';

  const triggerOneClickSubmit = useCallback(
    (side: 'buy' | 'sell') => {
      const selectedSideDisabled = side === 'buy' ? buyActionDisabled : sellActionDisabled;
      if (!isOneClickEnabled || selectedSideDisabled) return;

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
    [asideOrderFormRef, buyActionDisabled, isOneClickEnabled, sellActionDisabled],
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
          ? 'border-border w-80 border-l px-3 py-3 opacity-100'
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
          {!disableOrderActions && (
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className={`text-display-sm font-semibold ${chgClass}`}>
                    {lastPriceValue == null ? '--' : formatVnd(lastPriceValue, digit)}
                  </p>
                  <span className="text-body-small-medium text-muted-foreground">VNĐ</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <p className={cn('text-body-small-medium', chgClass)}>{signedPercent(chg)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!user ? (
          <div className="border-border bg-muted/20 rounded-xl border p-5">
            <p className="text-foreground text-sm font-semibold">
              {t('trade.orderForm.loginToTrade', { defaultValue: 'Sign in to trade' })}
            </p>
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {t('trade.orderForm.loginDescription', {
                defaultValue: 'Sign in to view your balance and place orders.',
              })}
            </p>
            <Button
              className="mt-4 w-full"
              variant="primary-contained"
              onClick={() => router.push('/login')}
            >
              {t('auth.login.title', { defaultValue: 'Sign in' })}
            </Button>
          </div>
        ) : disableOrderActions ? (
          <BuyoutBuyerPanel assetId={assetId} summary={buyoutSummary} />
        ) : (
          <>
            <div className="bg-muted grid grid-cols-2 rounded-lg p-1">
              <Button
                variant="white-contained"
                disabled={sellActionDisabled}
                onClick={() => {
                  onOrderSideChange('sell');
                  triggerOneClickSubmit('sell');
                }}
                className={cn(
                  'focus-visible:ring-primary-500 flex flex-col items-center gap-0 rounded-md px-3 py-2 text-center shadow-none outline-none focus-visible:ring-2 disabled:pointer-events-none',
                  sellActionDisabled
                    ? 'text-muted-foreground bg-transparent'
                    : orderSide === 'sell'
                      ? 'border-border bg-background !text-foreground shadow-sm'
                      : '!text-foreground bg-transparent',
                )}
              >
                <p className="text-body-small-semibold">{t('trade.sell')}</p>
                <p className="text-caption-regular">{bidText}</p>
              </Button>
              <Button
                type="button"
                variant="white-contained"
                disabled={buyActionDisabled}
                onClick={() => {
                  onOrderSideChange('buy');
                  triggerOneClickSubmit('buy');
                }}
                className={cn(
                  'focus-visible:ring-primary-500 flex flex-col items-center gap-0 rounded-md px-3 py-2 text-center shadow-none outline-none focus-visible:ring-2 disabled:pointer-events-none',
                  buyActionDisabled
                    ? 'text-muted-foreground bg-transparent'
                    : orderSide === 'buy'
                      ? 'border-border bg-background !text-foreground shadow-sm'
                      : '!text-foreground bg-transparent',
                )}
              >
                <p className="text-body-small-semibold">{t('trade.buy')}</p>
                <p className="text-caption-regular">{askText}</p>
              </Button>
            </div>
            {!hasBothPrices && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                {t('trade.orderForm.noBidAskHint', {
                  defaultValue:
                    'There is not yet enough buy/sell liquidity for a market order. You can still place a limit order below and wait for it to match.',
                })}
              </p>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <TradeWebAsideOrderForm
                ref={asideOrderFormRef}
                symbol={currentSymbol}
                digit={digit}
                limitPrice={limitPrice}
                setLimitPrice={setLimitPrice}
                tradePanelRef={tradePanelRef}
                orderSide={orderSide}
                oneClickMode={isOneClickEnabled && !isAsideLimitMode}
                asideLimitMode={isAsideLimitMode}
                tradingLocked={disableOrderActions}
                onAsideQuantityChange={onAsideQuantityLabelChange}
              />
            </div>
          </>
        )}
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
