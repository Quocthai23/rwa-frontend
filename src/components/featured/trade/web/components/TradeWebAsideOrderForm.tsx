'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { ORDER_SIDES, OrderStatus } from '@/types/orders';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { useToast } from '@/hook/useToast';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfiniteOrders } from '@/hook/useOrder';
import { TradePanelLimitPriceField } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelLimitPriceField';
import {
  adjustQuantityByDelta,
  applyQuantityBlur,
  applyQuantityChange,
  normalizeDecimalInput,
  toFiniteNumberFromNumberish,
  toPositiveAssetNumber,
} from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';
import { submitTradePanelOrder } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelSubmitOrder';
import { TABS } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelUtils';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelTypes';
import { useAssetById } from '@/hook/useAssets';
import { formatBalance } from '@/utils/currency';
import { Minus, Plus } from '@untitledui/icons';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';
import { usePortfolioItem } from '@/hook/usePortfolio';
import { computeTradePanelLimitStopFlags } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelLimitStopFlags';

export type TradeWebAsideOrderFormHandle = {
  getQuantity: () => string;
  adjustQuantityByStep: (delta: number) => void;
  submitOrder: (side: 'buy' | 'sell') => void;
  onFloatingVolumeInputChange: (value: string) => void;
  onFloatingVolumeInputBlur: () => void;
  setFloatingVolumeBoth: (next: number) => void;
  setFloatingVolumeQuick: (next: number) => void;
};

type TradeWebAsideOrderFormProps = {
  symbol: string;
  digit: number;
  limitPrice: string;
  setLimitPrice: (value: string) => void;
  tradePanelRef: React.MutableRefObject<TradePanelSheetHandle | null>;
  orderSide: 'buy' | 'sell';
  oneClickMode?: boolean;
  asideLimitMode?: boolean;
  tradingLocked?: boolean;
  onAsideQuantityChange?: (quantity: string) => void;
};

export const TradeWebAsideOrderForm = forwardRef<
  TradeWebAsideOrderFormHandle,
  TradeWebAsideOrderFormProps
>(function TradeWebAsideOrderForm(
  {
    symbol,
    limitPrice,
    setLimitPrice,
    tradePanelRef,
    orderSide: orderSideProp,
    oneClickMode = false,
    asideLimitMode = false,
    tradingLocked = false,
    onAsideQuantityChange,
  },
  ref,
) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const rt = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]);
  const { data: symbolAsset } = useAssetById(symbol ?? '');

  const user = useAuthStore((s) => s.user);
  const { showError, showSuccess } = useToast();
  const { isPending: isCreatingOrder, mutate: createOrder } = useCreateOrder();

  const getTabLabel = (tab: (typeof TABS)[number]) => {
    switch (tab) {
      case 'Market':
        return t('trade.tabs.market');
      case 'Limit':
        return t('trade.tabs.limit');
    }
  };

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(TABS[0]);
  // Limit orders use the entered price and the HTTP API; a realtime reconnect
  // should not block them. Market orders still require a live quote connection.
  const canTrade = navigator.onLine && (activeTab === 'Limit' || (isConnected && !isReconnecting));
  const transactionType = orderSideProp;
  const [quantity, setQuantity] = useState('');
  const quantityRef = useRef(quantity);
  useLayoutEffect(() => { quantityRef.current = quantity; }, [quantity]);
  const [isQuantityTouched, setIsQuantityTouched] = useState(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!oneClickMode) return;
    const timer = window.setTimeout(() => setActiveTab('Market'), 0);
    return () => window.clearTimeout(timer);
  }, [oneClickMode]);

  useEffect(() => {
    if (!asideLimitMode) return;
    const timer = window.setTimeout(() => setActiveTab('Limit'), 0);
    return () => window.clearTimeout(timer);
  }, [asideLimitMode]);

  useLayoutEffect(() => {
    onAsideQuantityChange?.(quantity);
  }, [quantity, onAsideQuantityChange]);

  const currentPrice = useMemo(() => {
    const ask = Number(rt?.ask);
    const bid = Number(rt?.bid);
    if (Number.isFinite(ask) && Number.isFinite(bid) && ask > 0 && bid > 0) {
      return (ask + bid) / 2;
    }

    const parsedLimitPrice = Number.parseFloat(normalizeDecimalInput(limitPrice));
    return Number.isFinite(parsedLimitPrice) && parsedLimitPrice > 0 ? parsedLimitPrice : 0;
  }, [rt?.ask, rt?.bid, limitPrice]);

  const referencePriceNumber = useMemo(() => {
    const referencePriceValue =
      (symbolAsset as { referencePrice?: string } | undefined)?.referencePrice ?? '';
    const parsed = Number(referencePriceValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [symbolAsset]);

  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const { data: portfolioItem } = usePortfolioItem({
    accountId: selectedAccount?.id || '',
    assetId: symbolAsset?.id,
  });
  const baseAvailableQuantity = Number(
    portfolioItem?.availableQuantity ?? portfolioItem?.quantity ?? 0,
  );
  const sellPrice = toFiniteNumberFromNumberish(rt?.bid) ?? 0;
  const buyPrice = toFiniteNumberFromNumberish(rt?.ask) ?? 0;

  const { refetch: refetchOrders } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED],
  });

  const { availableBalance } = useAccountSummaryMetrics();

  const limitPriceNumber = Number.parseFloat(normalizeDecimalInput(limitPrice)) || 0;
  const rtAsk = (rt?.ask ?? buyPrice) || 0;
  const rtBid = (rt?.bid ?? sellPrice) || 0;

  const { isBuyLimitInvalid, isSellLimitInvalid } = useMemo(() => {
    const limitFlags = computeTradePanelLimitStopFlags({
      activeTab,
      limitPriceNumber,
      rtAsk,
      rtBid,
      takeProfitNumber: null,
      stopLossNumber: null,
      triggerType: 'price',
    });

    return {
      isBuyLimitInvalid: limitFlags.isBuyLimitInvalid,
      isSellLimitInvalid: limitFlags.isSellLimitInvalid,
    };
  }, [activeTab, limitPriceNumber, rtAsk, rtBid]);

  const symbolDigit = symbolAsset?.digit ?? 2;
  const priceStep = toPositiveAssetNumber(symbolAsset?.priceTick, 1 / 10 ** symbolDigit);

  useEffect(() => {
    if (activeTab !== 'Limit') return;

    const sidePrice = transactionType === 'sell' ? sellPrice : buyPrice;
    const referencePrice = sidePrice > 0 ? sidePrice : referencePriceNumber;
    if (!Number.isFinite(referencePrice) || referencePrice <= 0) return;

    const alignedReferencePrice = Math.round(referencePrice / priceStep) * priceStep;
    setLimitPrice(alignedReferencePrice.toFixed(symbolDigit));
  }, [
    activeTab,
    buyPrice,
    limitPrice,
    priceStep,
    referencePriceNumber,
    sellPrice,
    setLimitPrice,
    symbolDigit,
    transactionType,
  ]);

  const minTradeSize = Math.max(toPositiveAssetNumber(symbolAsset?.minTradeSize, 0.01), 0.01);
  const maxTradeSize = Math.max(
    toPositiveAssetNumber(symbolAsset?.maxTradeSize, 200),
    minTradeSize,
  );
  const defaultQuantityValue = useMemo(() => Math.max(1, minTradeSize), [minTradeSize]);
  const volumeStepNum = useMemo(() => {
    return toPositiveAssetNumber(symbolAsset?.volumeStep, 0.01);
  }, [symbolAsset?.volumeStep]);

  const lastSymbolRef = useRef<string | null>(null);
  useEffect(() => {
    if (!Number.isFinite(minTradeSize) || minTradeSize <= 0) return;
    // Defaults follow the selected external asset; preserve any user edit.
    const timeout = window.setTimeout(() => {
    const symbolChanged = lastSymbolRef.current !== symbol;
    if (symbolChanged) {
      lastSymbolRef.current = symbol;
      setIsQuantityTouched(false);
      setQuantity(defaultQuantityValue.toFixed(2));
      return;
    }

    if (!isQuantityTouched && !quantity) {
      setQuantity(defaultQuantityValue.toFixed(2));
    }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [symbol, defaultQuantityValue, isQuantityTouched, quantity, minTradeSize]);

  const onAdjustQty = (delta: number) => {
    adjustQuantityByDelta(
      delta,
      quantity,
      setQuantity,
      setIsQuantityTouched,
      minTradeSize,
      maxTradeSize,
      volumeStepNum,
    );
  };

  const handleSubmitOrder = useCallback(
    (sideOverride?: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES]) => {
      if (tradingLocked) return;
      submitTradePanelOrder(sideOverride, {
        user,
        router,
        canTrade,
        showError,
        showSuccess,
        t,
        symbolAsset,
        isCreatingOrder,
        submitLockRef,
        quantity: quantityRef.current,
        volumeStepNum,
        minTradeSize,
        maxTradeSize,
        setQuantity,
        activeTab,
        transactionType,
        symbol,
        sellPrice,
        buyPrice,
        quoteAvailableBalance: availableBalance.toNumber(),
        baseAvailableQuantity,
        accountId: selectedAccount?.id,
        limitPrice,
        createOrder,
        refetchOrders,
        tradePanelRef,
        setIsSubmitLocked,
      });
    },
    [
      user,
      router,
      canTrade,
      showError,
      showSuccess,
      t,
      symbolAsset,
      isCreatingOrder,
      volumeStepNum,
      minTradeSize,
      maxTradeSize,
      setQuantity,
      activeTab,
      transactionType,
      symbol,
      sellPrice,
      buyPrice,
      availableBalance,
      baseAvailableQuantity,
      selectedAccount?.id,
      limitPrice,
      createOrder,
      refetchOrders,
      tradePanelRef,
      tradingLocked,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      getQuantity: () => quantityRef.current,
      adjustQuantityByStep: (delta: number) => {
        adjustQuantityByDelta(
          delta,
          quantityRef.current,
          setQuantity,
          setIsQuantityTouched,
          minTradeSize,
          maxTradeSize,
          volumeStepNum,
        );
      },
      submitOrder: (side: 'buy' | 'sell') => {
        handleSubmitOrder(side === 'sell' ? ORDER_SIDES.SELL : ORDER_SIDES.BUY);
      },
      onFloatingVolumeInputChange: (value: string) => {
        applyQuantityChange(value, setQuantity, setIsQuantityTouched);
      },
      onFloatingVolumeInputBlur: () => {
        applyQuantityBlur(
          quantityRef.current,
          setQuantity,
          minTradeSize,
          maxTradeSize,
          volumeStepNum,
        );
      },
      setFloatingVolumeBoth: (next: number) => {
        let clamped = Math.min(maxTradeSize, Math.max(minTradeSize, next));
        clamped = Math.round(clamped / volumeStepNum) * volumeStepNum;
        setIsQuantityTouched(true);
        setQuantity(clamped.toFixed(2));
      },
      setFloatingVolumeQuick: (next: number) => {
        const clamped = Math.min(maxTradeSize, Math.max(minTradeSize, next));
        setIsQuantityTouched(true);
        setQuantity(clamped.toFixed(2));
      },
    }),
    [handleSubmitOrder, minTradeSize, maxTradeSize, volumeStepNum],
  );

  const totalCost = useMemo(() => {
    const qty = Number(quantity);
    const priceForTotal =
      activeTab === 'Market' ? currentPrice || referencePriceNumber : limitPriceNumber;
    if (!Number.isFinite(qty) || qty <= 0 || priceForTotal <= 0) return 0;
    return qty * priceForTotal;
  }, [activeTab, quantity, referencePriceNumber, currentPrice, limitPriceNumber]);

  const estimatedUnitPrice =
    activeTab === 'Market' ? currentPrice || referencePriceNumber : limitPriceNumber;

  const maxOrderValue = useMemo(() => {
    const value = Number(symbolAsset?.maxOrderValue);
    return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
  }, [symbolAsset?.maxOrderValue]);

  const protectedUnitPrice = useMemo(() => {
    if (activeTab === 'Limit') return limitPriceNumber;
    const marketPrice = transactionType === 'sell' ? sellPrice : buyPrice;
    if (marketPrice <= 0) return 0;
    return marketPrice * (transactionType === 'sell' ? 0.99 : 1.01);
  }, [activeTab, buyPrice, limitPriceNumber, sellPrice, transactionType]);

  const protectedOrderValue = Number(quantity) * protectedUnitPrice;
  const exceedsMaxOrderValue =
    Number.isFinite(maxOrderValue) &&
    Number.isFinite(protectedOrderValue) &&
    protectedOrderValue > maxOrderValue;

  const quantityNumber = Number(quantity);
  const quantityInvalid =
    !Number.isFinite(quantityNumber) ||
    quantityNumber < minTradeSize ||
    quantityNumber > maxTradeSize;
  const marketPriceUnavailable =
    activeTab === 'Market' && (transactionType === 'sell' ? sellPrice <= 0 : buyPrice <= 0);
  const limitPriceInvalid =
    activeTab === 'Limit' && (transactionType === 'sell' ? isSellLimitInvalid : isBuyLimitInvalid);
  const insufficientBalance =
    !quantityInvalid &&
    (transactionType === 'sell'
      ? quantityNumber > baseAvailableQuantity
      : totalCost > availableBalance.toNumber());
  const orderUnavailable =
    tradingLocked ||
    !canTrade ||
    !selectedAccount?.id ||
    !symbolAsset ||
    quantityInvalid ||
    marketPriceUnavailable ||
    limitPriceInvalid ||
    insufficientBalance ||
    exceedsMaxOrderValue;
  const submitDisabled = isCreatingOrder || isSubmitLocked || orderUnavailable;

  const disabledReason = useMemo(() => {
    if (tradingLocked)
      return t('trade.buyoutTrading.buyerLockedShort', {
        defaultValue: 'The acquirer cannot place buy or sell orders during the program.',
      });
    if (!canTrade)
      return t('trade.orderForm.unavailableConnection', {
        defaultValue: 'Trading connection is unavailable.',
      });
    if (!selectedAccount?.id)
      return t('trade.orderForm.selectAccount', { defaultValue: 'Select a trading account.' });
    if (quantityInvalid)
      return t('trade.orderForm.invalidQuantity', { defaultValue: 'Enter a valid quantity.' });
    if (activeTab === 'Limit' && limitPriceInvalid)
      return t('trade.orderForm.enterLimitPrice', { defaultValue: 'Enter a valid limit price.' });
    if (marketPriceUnavailable)
      return t('trade.orderForm.noLiquidity', {
        defaultValue: 'No matching market liquidity is available.',
      });
    if (insufficientBalance)
      return transactionType === 'sell'
        ? t('trade.orderForm.insufficientTokens', {
            defaultValue: 'Insufficient available tokens.',
          })
        : t('trade.orderForm.insufficientCash', { defaultValue: 'Insufficient buying power.' });
    if (exceedsMaxOrderValue)
      return t('trade.errors.maxOrderValueExceeded', {
        value: formatBalance(maxOrderValue),
        defaultValue: 'The maximum value per order is limited. Please reduce the quantity.',
      });
    return null;
  }, [
    activeTab,
    canTrade,
    insufficientBalance,
    limitPriceInvalid,
    marketPriceUnavailable,
    maxOrderValue,
    quantityInvalid,
    selectedAccount?.id,
    t,
    transactionType,
    tradingLocked,
    exceedsMaxOrderValue,
  ]);

  const setQuantityByPercent = (percent: number) => {
    const balanceMaximum =
      transactionType === 'sell'
        ? baseAvailableQuantity
        : protectedUnitPrice > 0
          ? availableBalance.toNumber() / protectedUnitPrice
          : 0;
    const orderValueMaximum =
      protectedUnitPrice > 0 && Number.isFinite(maxOrderValue)
        ? maxOrderValue / protectedUnitPrice
        : Number.POSITIVE_INFINITY;
    const cappedMaximum = Math.min(balanceMaximum, orderValueMaximum, maxTradeSize);
    const target = Math.floor((cappedMaximum * percent) / volumeStepNum) * volumeStepNum;
    const next = Math.max(0, Math.min(maxTradeSize, target));
    setIsQuantityTouched(true);
    setQuantity(next > 0 ? next.toFixed(2) : '0.00');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-neutral-slim">
        {!oneClickMode && (
          <div className="bg-muted grid grid-cols-2 rounded-lg p-1">
            {TABS.map((tab) => (
              <Button
                key={tab}
                type="button"
                variant="white-contained"
                className={`h-9 rounded-md shadow-none ${
                  activeTab === tab
                    ? 'bg-background text-primary-500 shadow-sm'
                    : 'text-muted-foreground bg-transparent'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {getTabLabel(tab)}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-body-small-medium text-foreground">
            {t('trade.web.orderForm.quantity')}
          </p>
          <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
            <Button
              type="button"
              variant="neutral-contained"
              className="bg-primary-50 text-foreground h-9 rounded"
              onClick={() => onAdjustQty(-volumeStepNum)}
            >
              <Minus size={20} className="text-primary-500" />
            </Button>
            <Input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) =>
                applyQuantityChange(e.target.value, setQuantity, setIsQuantityTouched)
              }
              onBlur={() =>
                applyQuantityBlur(quantity, setQuantity, minTradeSize, maxTradeSize, volumeStepNum)
              }
              className="text-body-large-regular text-foreground h-9 border-0 bg-transparent p-0 text-center shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              variant="neutral-contained"
              className="bg-primary-50 text-foreground h-9 rounded"
              onClick={() => onAdjustQty(volumeStepNum)}
            >
              <Plus size={20} className="text-primary-500" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.5, 0.75, 1].map((percent) => (
              <Button
                key={percent}
                type="button"
                variant="white-contained"
                className="text-button-small-medium border-border h-8 min-w-0 border bg-transparent px-1 shadow-none"
                onClick={() => setQuantityByPercent(percent)}
              >
                {percent === 1
                  ? t('trade.orderForm.maximum', { defaultValue: 'Maximum' })
                  : `${percent * 100}%`}
              </Button>
            ))}
          </div>
        </div>

        {!oneClickMode && (
          <div className="space-y-6">
            {activeTab !== 'Market' && (
              <TradePanelLimitPriceField
                priceLabel={t('trade.price')}
                notSetLabel={t('trade.notSet')}
                limitPrice={limitPrice}
                setLimitPrice={setLimitPrice}
                symbolDigit={symbolDigit}
                transactionType={transactionType}
                sellPrice={sellPrice}
                buyPrice={buyPrice}
                priceStep={priceStep}
              />
            )}
          </div>
        )}

        {!oneClickMode && (
          <div className="border-border bg-muted/40 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t('trade.orderForm.estimatedPrice', { defaultValue: 'Estimated price' })}
              </span>
              <span className="text-foreground text-right font-medium tabular-nums">
                {estimatedUnitPrice > 0 ? `${formatBalance(estimatedUnitPrice)} VNĐ` : '--'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t('trade.orderForm.quantity', { defaultValue: 'Quantity' })}
              </span>
              <span className="text-foreground text-right font-medium tabular-nums">
                {formatBalance(Number(quantity) || 0)} token
              </span>
            </div>
            <div className="border-border flex items-center justify-between gap-3 border-t pt-2 text-sm">
              <span className="text-foreground font-medium">
                {transactionType === 'sell'
                  ? t('trade.orderForm.estimatedProceeds', {
                      defaultValue: 'Estimated proceeds',
                    })
                  : t('trade.orderForm.estimatedOrderValue', {
                      defaultValue: 'Estimated order value',
                    })}
              </span>
              <span className="text-foreground text-right font-semibold tabular-nums">
                {formatBalance(totalCost)} VNĐ
              </span>
            </div>
            {activeTab === 'Market' && (
              <p className="text-muted-foreground text-[11px] leading-4">
                {t('trade.orderForm.marketPriceNotice', {
                  defaultValue:
                    'A market order may execute at multiple prices. The final value depends on actual fills.',
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {!oneClickMode && (
        <div className="bg-background shrink-0 pt-5">
          <div className="text-body-small-medium mb-3 flex items-center justify-between">
            <span className="text-muted-foreground">
              {t('trade.web.orderForm.available', { defaultValue: 'Available' })}
            </span>
            <span className="text-foreground">
              {transactionType === 'sell'
                ? `${formatBalance(baseAvailableQuantity)} ${symbol}`
                : `${formatBalance(availableBalance.toNumber())} VND`}
            </span>
          </div>
          {disabledReason && (
            <p className="bg-muted text-muted-foreground border-border mb-2 rounded-md border px-3 py-2 text-xs leading-4">
              {disabledReason}
            </p>
          )}
          {transactionType === 'sell' ? (
            <Button
              variant="white-contained"
              disabled={submitDisabled}
              className={`text-body-small-semibold! w-full rounded border px-2 py-2.5 disabled:opacity-100 ${
                submitDisabled
                  ? 'border-border bg-muted !text-muted-foreground pointer-events-none cursor-not-allowed'
                  : '!text-foreground border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/15 dark:hover:bg-red-500/20'
              }`}
              onClick={() => handleSubmitOrder(ORDER_SIDES.SELL)}
            >
              {t('trade.sell')} {symbol}
            </Button>
          ) : (
            <Button
              variant="white-contained"
              disabled={submitDisabled}
              className={`text-body-small-semibold! w-full rounded border px-2 py-2.5 disabled:opacity-100 ${
                submitDisabled
                  ? 'border-border bg-muted !text-muted-foreground pointer-events-none cursor-not-allowed'
                  : '!text-foreground border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/20'
              }`}
              onClick={() => handleSubmitOrder(ORDER_SIDES.BUY)}
            >
              {t('trade.buy')} {symbol}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
