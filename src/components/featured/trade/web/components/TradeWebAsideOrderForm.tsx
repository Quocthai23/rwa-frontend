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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atoms/select';
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
import { useAccountBalance } from '@/hook/useAccountBalance';
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
  onAsideQuantityChange?: (quantity: string) => void;
};

export const TradeWebAsideOrderForm = forwardRef<
  TradeWebAsideOrderFormHandle,
  TradeWebAsideOrderFormProps
>(function TradeWebAsideOrderForm(
  {
    symbol,
    digit,
    limitPrice,
    setLimitPrice,
    tradePanelRef,
    orderSide: orderSideProp,
    oneClickMode = false,
    asideLimitMode = false,
    onAsideQuantityChange,
  },
  ref,
) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const canTrade = navigator.onLine && isConnected && !isReconnecting;
  const rt = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]);
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const { data: symbolAsset } = useAssetById(symbol ?? '');
  const contractSizeNumber = toPositiveAssetNumber(symbolAsset?.contractSize, 100);

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
  const transactionType = orderSideProp;
  const [quantity, setQuantity] = useState('');
  const quantityRef = useRef(quantity);
  quantityRef.current = quantity;
  const [isQuantityTouched, setIsQuantityTouched] = useState(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!oneClickMode) return;
    setActiveTab('Market');
  }, [oneClickMode]);

  useEffect(() => {
    if (!asideLimitMode) return;
    setActiveTab('Limit');
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
  const { data: accountBalance } = useAccountBalance(selectedAccount?.id || '');
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

  const { isBuyLimitInvalid, isSellLimitInvalid } =
    useMemo(() => {
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
    }, [
      activeTab,
      limitPriceNumber,
      rtAsk,
      rtBid,
    ]);

  const symbolDigit = symbolAsset?.digit ?? 2;

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
  }, [symbol, defaultQuantityValue, isQuantityTouched, quantity]);

  const quantitySuggestionStep = 1;
  const quantityStepLarge = 5;

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
        calculatedAvailableBalance: availableBalance.toNumber(),
        limitPrice,
        rt,
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
      limitPrice,
      rt,
      createOrder,
      refetchOrders,
      tradePanelRef,
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

  const sellDisabled = activeTab === 'Limit' && isSellLimitInvalid;
  const buyDisabled = activeTab === 'Limit' && isBuyLimitInvalid;

  const totalCost = useMemo(() => {
    const qty = Number(quantity);
    const priceForTotal =
      activeTab === 'Market'
        ? referencePriceNumber || currentPrice
        : limitPriceNumber;
    if (!Number.isFinite(qty) || qty <= 0 || priceForTotal <= 0) return 0;
    return qty * priceForTotal;
  }, [activeTab, quantity, referencePriceNumber, currentPrice, limitPriceNumber]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {!oneClickMode && (
          <Select value={activeTab} onValueChange={(v) => setActiveTab(v as (typeof TABS)[number])}>
            <SelectTrigger
              className={`'h-9 bg-card text-body-small-medium text-foreground focus-visible:ring-0', w-full min-w-0 border-none shadow-none`}
            >
              <SelectValue placeholder={t('trade.tabs.market')} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              align="start"
              className="bg-sheet z-50 w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width) border-none"
            >
              {TABS.map((tab) => (
                <SelectItem
                  key={tab}
                  value={tab}
                  className="hover:bg-muted focus:bg-muted data-highlighted:bg-muted data-[state=checked]:text-primary-500 data-[state=checked]:[&_[data-slot=select-item-indicator]_svg]:text-primary-500 cursor-pointer transition-colors"
                >
                  <p className="text-body-small-medium">{getTabLabel(tab)}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="text-button-small-medium grid grid-cols-4 gap-2 text-black dark:text-white">
            <Button
              variant="white-contained"
              className="text-button-small-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
              onClick={() => onAdjustQty(-quantityStepLarge)}
            >
              -{quantityStepLarge}
            </Button>
            <Button
              variant="white-contained"
              className="text-button-small-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
              onClick={() => onAdjustQty(-quantitySuggestionStep)}
            >
              -{quantitySuggestionStep}
            </Button>
            <Button
              variant="white-contained"
              className="text-button-small-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
              onClick={() => onAdjustQty(quantitySuggestionStep)}
            >
              +{quantitySuggestionStep}
            </Button>
            <Button
              variant="white-contained"
              className="text-button-small-medium border-border h-auto w-full min-w-0 border bg-transparent px-3.25 py-1 text-black hover:bg-transparent dark:text-white"
              onClick={() => onAdjustQty(quantityStepLarge)}
            >
              +{quantityStepLarge}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-caption-regular text-[#0158ff]">
              {t('trade.totalCost', { defaultValue: 'Total Cost' })}:{' '}
              <span className="text-foreground">≈{formatBalance(totalCost)}</span>
            </p>
            {activeTab === 'Market' && referencePriceNumber > 0 && (
              <p className="text-caption-regular text-muted-foreground">
                {t('trade.referencePrice', { defaultValue: 'Reference' })}:{' '}
                {formatBalance(referencePriceNumber)}
              </p>
            )}
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
              />
            )}
          </div>
        )}

      </div>

      {!oneClickMode && (
        <div className="bg-background shrink-0 pt-5">
          <div className="mb-3 flex items-center justify-between text-body-small-medium">
            <span className="text-muted-foreground">
              {t('trade.web.orderForm.available', { defaultValue: 'Available' })}
            </span>
            <span className="text-foreground">
              {formatBalance(accountBalance?.currentBalance ?? '0')}{' '}
              {symbolAsset?.marginCurrency ?? t('common.usd')}
            </span>
          </div>
          {transactionType === 'sell' ? (
            <Button
              variant="red-contained"
              disabled={isCreatingOrder || isSubmitLocked || sellDisabled}
              className="text-body-small-semibold! w-full rounded px-2 py-2.5 text-white disabled:opacity-50"
              onClick={() => handleSubmitOrder(ORDER_SIDES.SELL)}
            >
              {t('trade.sell')} {symbol}
            </Button>
          ) : (
            <Button
              variant="green-contained"
              disabled={isCreatingOrder || isSubmitLocked || buyDisabled}
              className="text-body-small-semibold! w-full rounded px-2 py-2.5 text-white disabled:opacity-50"
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
