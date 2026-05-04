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
import { Switch } from '@/components/shared/atoms/web/switch';
import { ORDER_SIDES } from '@/types/orders';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { useToast } from '@/hook/useToast';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfinitePositions } from '@/hook/usePosition';
import { useInfiniteOrders } from '@/hook/useOrder';
import { calculateOrderMargin } from '@/components/featured/position/utils/position.calculations';
import { TradePanelLimitPriceField } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelLimitPriceField';
import { TradePanelStopLossPreview } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelStopLossPreview';
import { TradePanelTakeProfitPreview } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelTakeProfitPreview';
import type { TriggerType } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelTriggerSelect';
import { TradePanelTriggerSelect } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelTriggerSelect';
import { TradePanelTpSlInputRow } from '@/components/shared/chart/components/web/tradePanel/components/TradePanelTpSlInputRow';
import { useTradePanelTpSlFormatEffect } from '@/components/shared/chart/components/web/tradePanel/hooks/useTradePanelTpSlFormatEffect';
import { computeTradePanelLimitStopFlags } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelLimitStopFlags';
import {
  adjustQuantityByDelta,
  applyQuantityBlur,
  applyQuantityChange,
  normalizeDecimalInput,
  toFiniteNumberFromNumberish,
  toPositiveAssetNumber,
} from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';
import { submitTradePanelOrder } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelSubmitOrder';
import { computeTradePanelTpSlOrderValidation } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelTpSlOrderValidation';
import { computeTradePanelTpSlPreview } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelTpSlPreview';
import { TABS } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelUtils';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelTypes';
import { useAssetById } from '@/hook/useAssets';
import { formatBalance } from '@/utils/currency';
import { Minus, Plus } from '@untitledui/icons';
import Decimal from 'decimal.js';
import type { NullableDecimalValue } from '@/types/decimal';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

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
  leverage: number;
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
    leverage,
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
  const assetDigits = Math.min(Math.max(symbolAsset?.digit ?? 2, 0), 8);
  const roundToDigits = (value: number, digits: number) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };
  const round2 = (val: Decimal.Value) => new Decimal(val).toDecimalPlaces(2);
  const formatAssetPrice = (value: number) =>
    roundToDigits(value, assetDigits).toFixed(assetDigits);
  const formatUsdPnL = (value: number) => roundToDigits(value, 2).toFixed(2);

  const user = useAuthStore((s) => s.user);
  const { showError, showSuccess } = useToast();
  const { isPending: isCreatingOrder, mutate: createOrder } = useCreateOrder();

  const getTabLabel = (tab: (typeof TABS)[number]) => {
    switch (tab) {
      case 'Market':
        return t('trade.tabs.market');
      case 'Limit':
        return t('trade.tabs.limit');
      case 'Stop':
        return t('trade.tabs.stop');
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
  const [takeProfitValue, setTakeProfitValue] = useState('');
  const [stopLossValue, setStopLossValue] = useState('');
  const [isTakeProfitEnabled, setIsTakeProfitEnabled] = useState(false);
  const [isStopLossEnabled, setIsStopLossEnabled] = useState(false);
  const [takeProfitTriggerType, setTakeProfitTriggerType] = useState<TriggerType>('price');
  const [stopLossTriggerType, setStopLossTriggerType] = useState<TriggerType>('price');

  useEffect(() => {
    if (!oneClickMode) return;
    setActiveTab('Market');
    setIsTakeProfitEnabled(false);
    setTakeProfitValue('');
    setIsStopLossEnabled(false);
    setStopLossValue('');
  }, [oneClickMode]);

  useEffect(() => {
    if (!asideLimitMode) return;
    setActiveTab('Limit');
  }, [asideLimitMode]);

  useLayoutEffect(() => {
    onAsideQuantityChange?.(quantity);
  }, [quantity, onAsideQuantityChange]);

  const marginPrice = useMemo(() => {
    const ask = Number(rt?.ask);
    const bid = Number(rt?.bid);
    if (Number.isFinite(ask) && Number.isFinite(bid) && ask > 0 && bid > 0) {
      return (ask + bid) / 2;
    }

    const parsedLimitPrice = Number.parseFloat(normalizeDecimalInput(limitPrice));
    return Number.isFinite(parsedLimitPrice) && parsedLimitPrice > 0 ? parsedLimitPrice : 0;
  }, [rt?.ask, rt?.bid, limitPrice]);

  const requiredMarginForPosition = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || marginPrice <= 0) return 0;

    return calculateOrderMargin(
      qty,
      marginPrice,
      symbol,
      leverage,
      contractSizeNumber,
      rtBySymbol,
      symbolAsset?.profitCurrency as string,
    );
  }, [
    quantity,
    marginPrice,
    symbol,
    leverage,
    contractSizeNumber,
    rtBySymbol,
    symbolAsset?.profitCurrency,
  ]);

  const getTriggerTypeOptionLabel = (type: TriggerType) => {
    switch (type) {
      case 'price':
        return t('trade.triggerTypes.price');
      case 'pips':
        return t('trade.triggerTypes.pips');
      case 'changePercent':
        return t('trade.triggerTypes.changePercent');
    }
  };

  const getTriggerTypeUnitSuffix = (type: TriggerType) => {
    switch (type) {
      case 'changePercent':
        return t('trade.units.percent');
      case 'pips':
        return t('trade.units.pips');
      case 'price':
      default:
        return '';
    }
  };

  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const sellPrice = toFiniteNumberFromNumberish(rt?.bid) ?? 0;
  const buyPrice = toFiniteNumberFromNumberish(rt?.ask) ?? 0;
  const { data: openPositionsData, refetch: refetchPositions } = useInfinitePositions({
    accountId: selectedAccount?.id || '',
    status: [0, 1],
  });
  const MAX_OPEN_POSITIONS = 10;
  const openPositionsCount = openPositionsData?.pages?.[0]?.total ?? 0;
  const hasReachedMaxOpenPositions = openPositionsCount >= MAX_OPEN_POSITIONS;
  const { refetch: refetchOrders } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [0, 1],
  });

  const { availableBalance } = useAccountSummaryMetrics();

  const limitPriceNumber = Number.parseFloat(normalizeDecimalInput(limitPrice)) || 0;
  const takeProfitNumber =
    isTakeProfitEnabled && takeProfitValue && takeProfitValue !== '0.00'
      ? Number.parseFloat(normalizeDecimalInput(takeProfitValue))
      : null;
  const stopLossNumber =
    isStopLossEnabled && stopLossValue && stopLossValue !== '0.00'
      ? Number.parseFloat(normalizeDecimalInput(stopLossValue))
      : null;
  const rtAsk = (rt?.ask ?? buyPrice) || 0;
  const rtBid = (rt?.bid ?? sellPrice) || 0;

  const takeProfitPreview = useMemo(
    () =>
      computeTradePanelTpSlPreview({
        activeTab,
        limitPriceNumber,
        takeProfitNumber,
        stopLossNumber: null,
        quantity,
        triggerType: takeProfitTriggerType,
        transactionType,
        buyPrice,
        sellPrice,
        rtAsk,
        rtBid,
        symbol,
        symbolAsset,
        rtBySymbol,
        contractSizeNumber,
      }),
    [
      activeTab,
      limitPriceNumber,
      takeProfitNumber,
      quantity,
      takeProfitTriggerType,
      transactionType,
      buyPrice,
      sellPrice,
      rtAsk,
      rtBid,
      symbol,
      symbolAsset,
      rtBySymbol,
      contractSizeNumber,
    ],
  );

  const stopLossPreview = useMemo(
    () =>
      computeTradePanelTpSlPreview({
        activeTab,
        limitPriceNumber,
        takeProfitNumber: null,
        stopLossNumber,
        quantity,
        triggerType: stopLossTriggerType,
        transactionType,
        buyPrice,
        sellPrice,
        rtAsk,
        rtBid,
        symbol,
        symbolAsset,
        rtBySymbol,
        contractSizeNumber,
      }),
    [
      activeTab,
      limitPriceNumber,
      stopLossNumber,
      quantity,
      stopLossTriggerType,
      transactionType,
      buyPrice,
      sellPrice,
      rtAsk,
      rtBid,
      symbol,
      symbolAsset,
      rtBySymbol,
      contractSizeNumber,
    ],
  );

  const {
    takeProfitTriggerPrice,
    buyTakeProfitPricePips,
    sellTakeProfitPricePips,
    buyTakeProfitPnLUsdPips,
    sellTakeProfitPnLUsdPips,
    buyTakeProfitPriceChange,
    sellTakeProfitPriceChange,
    buyTakeProfitPnLUsdChange,
    sellTakeProfitPnLUsdChange,
    buyTakeProfitPnLUsdPrice,
    sellTakeProfitPnLUsdPrice,
  } = takeProfitPreview;

  const {
    stopLossTriggerPrice,
    buyStopLossPricePips,
    sellStopLossPricePips,
    buyStopLossPnLUsdPips,
    sellStopLossPnLUsdPips,
    buyStopLossPriceChange,
    sellStopLossPriceChange,
    buyStopLossPnLUsdChange,
    sellStopLossPnLUsdChange,
    buyStopLossPnLUsdPrice,
    sellStopLossPnLUsdPrice,
  } = stopLossPreview;

  const { isBuyLimitInvalid, isSellLimitInvalid, isSellStopLimitInvalid, isBuyStopLimitInvalid } =
    useMemo(() => {
      const tpLimitFlags = computeTradePanelLimitStopFlags({
        activeTab,
        limitPriceNumber,
        rtAsk,
        rtBid,
        takeProfitNumber,
        stopLossNumber: null,
        triggerType: takeProfitTriggerType,
      });
      const slLimitFlags = computeTradePanelLimitStopFlags({
        activeTab,
        limitPriceNumber,
        rtAsk,
        rtBid,
        takeProfitNumber: null,
        stopLossNumber,
        triggerType: stopLossTriggerType,
      });

      return {
        isBuyLimitInvalid: tpLimitFlags.isBuyLimitInvalid || slLimitFlags.isBuyLimitInvalid,
        isSellLimitInvalid: tpLimitFlags.isSellLimitInvalid || slLimitFlags.isSellLimitInvalid,
        isSellStopLimitInvalid:
          tpLimitFlags.isSellStopLimitInvalid || slLimitFlags.isSellStopLimitInvalid,
        isBuyStopLimitInvalid:
          tpLimitFlags.isBuyStopLimitInvalid || slLimitFlags.isBuyStopLimitInvalid,
      };
    }, [
      activeTab,
      limitPriceNumber,
      rtAsk,
      rtBid,
      takeProfitNumber,
      stopLossNumber,
      takeProfitTriggerType,
      stopLossTriggerType,
    ]);

  const { buyTpSlError, sellTpSlError } = useMemo(() => {
    const tpValidation = computeTradePanelTpSlOrderValidation({
      activeTab,
      buyPrice,
      sellPrice,
      limitPriceNumber,
      takeProfitNumber,
      stopLossNumber: null,
      triggerType: takeProfitTriggerType,
      symbolAsset,
    });
    const slValidation = computeTradePanelTpSlOrderValidation({
      activeTab,
      buyPrice,
      sellPrice,
      limitPriceNumber,
      takeProfitNumber: null,
      stopLossNumber,
      triggerType: stopLossTriggerType,
      symbolAsset,
    });

    return {
      buyTpSlError: tpValidation.buyTpSlError ?? slValidation.buyTpSlError,
      sellTpSlError: tpValidation.sellTpSlError ?? slValidation.sellTpSlError,
    };
  }, [
    activeTab,
    buyPrice,
    sellPrice,
    limitPriceNumber,
    takeProfitNumber,
    stopLossNumber,
    takeProfitTriggerType,
    stopLossTriggerType,
    symbolAsset,
  ]);

  const symbolDigit = symbolAsset?.digit ?? 2;

  useTradePanelTpSlFormatEffect(
    takeProfitTriggerType,
    takeProfitValue,
    stopLossTriggerType,
    stopLossValue,
    symbolDigit,
    setTakeProfitValue,
    setStopLossValue,
  );

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

  const estSpreadCost = useMemo(() => {
    const q = Number.parseFloat(normalizeDecimalInput(quantity));
    if (!Number.isFinite(q) || q <= 0) return null;
    const spread = Math.abs(Number(rtAsk) - Number(rtBid));
    if (!Number.isFinite(spread) || spread <= 0) return null;
    return spread * q * contractSizeNumber;
  }, [quantity, rtAsk, rtBid, contractSizeNumber]);

  const handleSubmitOrder = useCallback(
    (sideOverride?: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES]) => {
      if (hasReachedMaxOpenPositions) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          `Maximum open positions limit exceeded (${MAX_OPEN_POSITIONS})`,
        );
        return;
      }

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
        buyTpSlError,
        sellTpSlError,
        leverage,
        symbol,
        selectedAccountId: selectedAccount?.id || '',
        sellPrice,
        buyPrice,
        calculatedAvailableBalance: availableBalance.toNumber(),
        contractSizeNumber,
        rtBySymbol,
        limitPrice,
        rt,
        takeProfitTriggerType,
        stopLossTriggerType,
        takeProfitValue,
        stopLossValue,
        symbolAssetForConvert: symbolAsset,
        createOrder,
        refetchPositions,
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
      buyTpSlError,
      sellTpSlError,
      leverage,
      symbol,
      selectedAccount?.id,
      sellPrice,
      buyPrice,
      availableBalance,
      contractSizeNumber,
      rtBySymbol,
      limitPrice,
      rt,
      takeProfitTriggerType,
      stopLossTriggerType,
      takeProfitValue,
      stopLossValue,
      hasReachedMaxOpenPositions,
      MAX_OPEN_POSITIONS,
      createOrder,
      refetchPositions,
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

  const sellDisabled =
    sellTpSlError !== null ||
    (activeTab === 'Limit' && isSellLimitInvalid) ||
    (activeTab === 'Stop' && isSellStopLimitInvalid);
  const buyDisabled =
    buyTpSlError !== null ||
    (activeTab === 'Limit' && isBuyLimitInvalid) ||
    (activeTab === 'Stop' && isBuyStopLimitInvalid);

  const formatQuote = useMemo(() => {
    const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
    return (value: NullableDecimalValue) => {
      const parsed = toFiniteNumberFromNumberish(value);
      return parsed != null && parsed > 0 ? parsed.toFixed(safeDigit) : '--';
    };
  }, [digit]);

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
                  className="hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted data-[state=checked]:text-primary-500 data-[state=checked]:[&_[data-slot=select-item-indicator]_svg]:text-primary-500 cursor-pointer transition-colors"
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
              {t('market.accountDropdown.margin')}:{' '}
              <span className="text-foreground">≈{formatBalance(requiredMarginForPosition)}</span>
            </p>
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-body-small-medium text-foreground">
                  {t('trade.takeProfit')}
                </span>
                <Switch
                  checked={isTakeProfitEnabled}
                  onCheckedChange={(checked) => {
                    setIsTakeProfitEnabled(checked);
                    if (!checked) setTakeProfitValue('');
                  }}
                  aria-label={t('trade.takeProfit')}
                />
              </div>
              {isTakeProfitEnabled && (
                <>
                  <TradePanelTriggerSelect
                    triggerType={takeProfitTriggerType}
                    setTriggerType={setTakeProfitTriggerType}
                    onBeforeTriggerTypeChange={() => setTakeProfitValue('')}
                    triggerLabel={`${t('trade.trigger')} ${getTriggerTypeUnitSuffix(takeProfitTriggerType)}`.trim()}
                    getTriggerTypeOptionLabel={getTriggerTypeOptionLabel}
                    className="mx-0"
                  />
                  <TradePanelTpSlInputRow
                    notSetLabel={t('trade.notSet')}
                    value={takeProfitValue}
                    setValue={setTakeProfitValue}
                    triggerType={takeProfitTriggerType}
                    symbolDigit={symbolDigit}
                    transactionType={transactionType}
                    sellPrice={sellPrice}
                    buyPrice={buyPrice}
                    className="pt-2"
                  />
                  <TradePanelTakeProfitPreview
                    t={t}
                    triggerType={takeProfitTriggerType}
                    formatAssetPrice={formatAssetPrice}
                    formatUsdPnL={formatUsdPnL}
                    takeProfitTriggerPrice={takeProfitTriggerPrice}
                    buyTakeProfitPnLUsdPrice={buyTakeProfitPnLUsdPrice}
                    sellTakeProfitPnLUsdPrice={sellTakeProfitPnLUsdPrice}
                    buyTakeProfitPricePips={buyTakeProfitPricePips}
                    sellTakeProfitPricePips={sellTakeProfitPricePips}
                    buyTakeProfitPnLUsdPips={buyTakeProfitPnLUsdPips}
                    sellTakeProfitPnLUsdPips={sellTakeProfitPnLUsdPips}
                    buyTakeProfitPnLUsdChange={buyTakeProfitPnLUsdChange}
                    sellTakeProfitPnLUsdChange={sellTakeProfitPnLUsdChange}
                    buyTakeProfitPriceChange={buyTakeProfitPriceChange}
                    sellTakeProfitPriceChange={sellTakeProfitPriceChange}
                  />
                </>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-body-small-medium text-foreground">
                  {t('trade.stopLoss')}
                </span>
                <Switch
                  checked={isStopLossEnabled}
                  onCheckedChange={(checked) => {
                    setIsStopLossEnabled(checked);
                    if (!checked) setStopLossValue('');
                  }}
                  aria-label={t('trade.stopLoss')}
                />
              </div>
              {isStopLossEnabled && (
                <>
                  <TradePanelTriggerSelect
                    triggerType={stopLossTriggerType}
                    setTriggerType={setStopLossTriggerType}
                    onBeforeTriggerTypeChange={() => setStopLossValue('')}
                    triggerLabel={`${t('trade.trigger')} ${getTriggerTypeUnitSuffix(stopLossTriggerType)}`.trim()}
                    getTriggerTypeOptionLabel={getTriggerTypeOptionLabel}
                    className="mx-0"
                  />
                  <TradePanelTpSlInputRow
                    notSetLabel={t('trade.notSet')}
                    value={stopLossValue}
                    setValue={setStopLossValue}
                    triggerType={stopLossTriggerType}
                    symbolDigit={symbolDigit}
                    transactionType={transactionType}
                    sellPrice={sellPrice}
                    buyPrice={buyPrice}
                    className="pt-2"
                  />
                  <TradePanelStopLossPreview
                    t={t}
                    triggerType={stopLossTriggerType}
                    formatAssetPrice={formatAssetPrice}
                    formatUsdPnL={formatUsdPnL}
                    stopLossTriggerPrice={stopLossTriggerPrice}
                    buyStopLossPnLUsdPrice={buyStopLossPnLUsdPrice}
                    sellStopLossPnLUsdPrice={sellStopLossPnLUsdPrice}
                    buyStopLossPricePips={buyStopLossPricePips}
                    sellStopLossPricePips={sellStopLossPricePips}
                    buyStopLossPnLUsdPips={buyStopLossPnLUsdPips}
                    sellStopLossPnLUsdPips={sellStopLossPnLUsdPips}
                    buyStopLossPnLUsdChange={buyStopLossPnLUsdChange}
                    sellStopLossPnLUsdChange={sellStopLossPnLUsdChange}
                    buyStopLossPriceChange={buyStopLossPriceChange}
                    sellStopLossPriceChange={sellStopLossPriceChange}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <div className="border-border border-t pt-3">
          <p className="text-body-large-medium text-foreground mb-3">
            {t('trade.web.orderForm.orderInfo')}
          </p>
          <div className="text-body-small-medium text-foreground space-y-2">
            <div className="flex justify-between">
              <span className="text-body-small-medium text-muted-foreground">
                {t('trade.web.orderForm.leverage')}
              </span>
              <span className="text-body-small-semibold text-foreground">{leverage}X</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-small-medium text-muted-foreground">
                {t('trade.web.orderForm.marginRequired')}
              </span>
              <span className="text-body-small-semibold text-foreground">
                {formatBalance(requiredMarginForPosition)} {t('common.usd')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-small-medium text-muted-foreground">
                {t('trade.web.orderForm.available')}
              </span>
              <span className="text-body-small-semibold text-foreground">
                {formatBalance(availableBalance.toNumber())} {t('common.usd')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-small-medium text-muted-foreground">
                {t('trade.web.orderForm.estSpreadCost')}
              </span>
              <span className="text-body-small-semibold text-foreground">
                {estSpreadCost != null && Number.isFinite(estSpreadCost)
                  ? `${formatBalance(estSpreadCost)} ${t('common.usd')}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!oneClickMode && (
        <div className="bg-background shrink-0 pt-5">
          {transactionType === 'sell' ? (
            <Button
              variant="red-contained"
              disabled={isCreatingOrder || isSubmitLocked || sellDisabled}
              className="!text-body-small-semibold w-full rounded px-2 py-2.5 text-white disabled:opacity-50"
              onClick={() => handleSubmitOrder(ORDER_SIDES.SELL)}
            >
              {t('trade.sell')}
              {activeTab === 'Market' ? ` ${formatQuote(sellPrice)}` : ''}
            </Button>
          ) : (
            <Button
              variant="green-contained"
              disabled={isCreatingOrder || isSubmitLocked || buyDisabled}
              className="!text-body-small-semibold w-full rounded px-2 py-2.5 text-white disabled:opacity-50"
              onClick={() => handleSubmitOrder(ORDER_SIDES.BUY)}
            >
              {t('trade.buy')}
              {activeTab === 'Market' ? ` ${formatQuote(buyPrice)}` : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
