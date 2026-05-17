'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import Decimal from 'decimal.js';
import type { DecimalValue } from '@/types/decimal';

import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Switch } from '@/components/shared/atoms/switch';

export type { TradePanelSheetHandle } from './tradePanel/utils/tradePanelTypes';

import type { TradePanelSheetHandle } from './tradePanel/utils/tradePanelTypes';
import { ORDER_SIDES, OrderStatus } from '@/types/orders';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { useToast } from '@/hook/useToast';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfiniteOrders } from '@/hook/useOrder';
import { TradePanelActionBar } from './tradePanel/components/TradePanelActionBar';
import { TradePanelLimitPriceField } from './tradePanel/components/TradePanelLimitPriceField';
import { TradePanelOrderTypeTabs } from './tradePanel/components/TradePanelOrderTypeTabs';
import { TradePanelStopLossPreview } from './tradePanel/components/TradePanelStopLossPreview';
import { TradePanelSymbolHeader } from './tradePanel/components/TradePanelSymbolHeader';
import { TradePanelTakeProfitPreview } from './tradePanel/components/TradePanelTakeProfitPreview';
import type { TriggerType } from './tradePanel/components/TradePanelTriggerSelect';
import { TradePanelTriggerSelect } from './tradePanel/components/TradePanelTriggerSelect';
import { TradePanelTpSlInputRow } from './tradePanel/components/TradePanelTpSlInputRow';
import { TradePanelVolumeControl } from './tradePanel/components/TradePanelVolumeControl';
import { useTradePanelTpSlFormatEffect } from './tradePanel/hooks/useTradePanelTpSlFormatEffect';
import { computeTradePanelLimitStopFlags } from './tradePanel/utils/tradePanelLimitStopFlags';
import {
  normalizeDecimalInput,
  toFiniteNumberFromNumberish,
  toPositiveAssetNumber,
} from './tradePanel/utils/tradePanelInputHelpers';
import { submitTradePanelOrder } from './tradePanel/utils/tradePanelSubmitOrder';
import { computeTradePanelTpSlOrderValidation } from './tradePanel/utils/tradePanelTpSlOrderValidation';
import { computeTradePanelTpSlPreview } from './tradePanel/utils/tradePanelTpSlPreview';
import { TABS } from './tradePanel/utils/tradePanelUtils';
import { useGetData } from '@/context/GetdataContext';
import SplashLogo from '../../SplashLogo';
import { i } from 'framer-motion/client';
import { calculateOrderMargin } from '@/components/featured/position/utils/position.calculations';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

const MiniBidAskChart = dynamic(() => import('./MiniBidAskChart'), {
  ssr: false,
  loading: () => (
    <div className="border-border mt-4 h-44.5 border-t">
      <div className="text-body-small-regular text-muted-foreground flex h-full items-center justify-center">
        {i18n.t('trade.loadingChart')}
      </div>
    </div>
  ),
});

function TradePanel({
  descSymbol,
  symbol,
  tradePanelRef,
  limitPrice,
  setLimitPrice,
  leverage,
  digit,
}: {
  readonly limitPrice: string;
  readonly setLimitPrice: (value: string) => void;
  readonly descSymbol: string;
  readonly symbol: string;
  readonly tradePanelRef: React.MutableRefObject<TradePanelSheetHandle | null>;
  readonly leverage: number;
  readonly digit: number;
}) {
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const canTrade = navigator.onLine && isConnected && !isReconnecting;
  const rt = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]);
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const { assets: assetsData } = useGetData();
  const symbolAsset = assetsData?.find((a) => a.symbol === symbol);
  const displaySymbol =
    symbolAsset?.marginCurrency && symbolAsset?.profitCurrency
      ? `${symbolAsset.marginCurrency}/${symbolAsset.profitCurrency}`
      : symbol;
  const contractSizeNumber = toPositiveAssetNumber(symbolAsset?.contractSize, 100);
  const assetDigits = Math.min(Math.max(symbolAsset?.digit ?? 2, 0), 8);
  const roundToDigits = (value: number, digits: number) => {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };
  const formatAssetPrice = (value: number) =>
    roundToDigits(value, assetDigits).toFixed(assetDigits);
  const formatUsdPnL = (value: number) => roundToDigits(value, 2).toFixed(2);

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const { isPending: isCreatingOrder, mutate: createOrder } = useCreateOrder();

  const getTabLabel = (tab: (typeof TABS)[number]) => {
    switch (tab) {
      case 'Market':
        return t('trade.tabs.market');
      case 'Limit':
        return t('trade.tabs.limit');
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<'compact' | 'full'>('full');
  const [mainOpen, setMainOpen] = useState(false);
  const [showMiniChart, setShowMiniChart] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(TABS[0]);

  const formatQuote = useMemo(() => {
    const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
    return (value: DecimalValue) => {
      const parsed = toFiniteNumberFromNumberish(value);
      return parsed != null && Number.isFinite(parsed) ? parsed.toFixed(safeDigit) : '-';
    };
  }, [digit]);

  useEffect(() => {
    const handle: TradePanelSheetHandle = {
      open: (
        param?: 'orderLimit' | 'buySell' | 'buy' | 'sell',
        options?: {
          defaultTab?: 'Market' | 'Limit';
          quantity?: string;
        },
      ) => {
        setLimitPrice('');
        const openTab = options?.defaultTab;
        if (openTab) {
          setActiveTab(openTab);
        }
        if (typeof options?.quantity === 'string') {
          setQuantity(options.quantity);
          setIsQuantityTouched(Boolean(options.quantity));
        }
        if (param === 'orderLimit') {
          setVariant('full');
          setActiveTab(openTab ?? TABS[1]);
          setMainOpen(true);
          setIsOpen(true);
        } else if (param === 'buySell') {
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        } else if (param === 'buy' || param === 'sell') {
          setTransactionType(param);
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        } else {
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        }
      },
      close: () => {
        setMainOpen(false);
        setIsOpen(false);
      },
      isOpen: () => isOpen,
    };

    tradePanelRef.current = handle;
  }, [tradePanelRef, isOpen]);
  const [quantity, setQuantity] = useState('1.00');
  const [isQuantityTouched, setIsQuantityTouched] = useState(false);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const submitLockRef = useRef(false);
  const [takeProfitValue, setTakeProfitValue] = useState('');
  const [stopLossValue, setStopLossValue] = useState('');
  const [isTakeProfitEnabled, setIsTakeProfitEnabled] = useState(false);
  const [isStopLossEnabled, setIsStopLossEnabled] = useState(false);
  const [takeProfitTriggerType, setTakeProfitTriggerType] = useState<TriggerType>('price');
  const [stopLossTriggerType, setStopLossTriggerType] = useState<TriggerType>('price');

  const marginPrice = useMemo(() => {
    const ask = toFiniteNumberFromNumberish(rt?.ask);
    const bid = toFiniteNumberFromNumberish(rt?.bid);
    if (ask != null && bid != null && ask > 0 && bid > 0) {
      return new Decimal(ask).add(bid).div(2).toNumber();
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
  const sellPrice = rt?.bid ?? 0;
  const buyPrice = rt?.ask ?? 0;
  const { data: openOrdersData, refetch: refetchOrders } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED],
  });
  const MAX_OPEN_ORDERS = 10;
  const openOrdersCount = openOrdersData?.pages?.[0]
    ? (('total' in openOrdersData.pages[0] ? (openOrdersData.pages[0].total as number) : openOrdersData.pages[0].data.length) ?? 0)
    : 0;
  const hasReachedMaxOpenPositions = openOrdersCount >= MAX_OPEN_ORDERS;
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
  const rtAsk = toFiniteNumberFromNumberish(rt?.ask ?? buyPrice) ?? 0;
  const rtBid = toFiniteNumberFromNumberish(rt?.bid ?? sellPrice) ?? 0;
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

  const { isBuyLimitInvalid, isSellLimitInvalid } =
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
      setQuantity('1.00');
      return;
    }

    if (!isQuantityTouched && !quantity) {
      setQuantity('1.00');
    }
  }, [symbol, minTradeSize, isQuantityTouched, quantity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (mainOpen && variant === 'full') {
      setShowMiniChart(false);
      const timeoutId = window.setTimeout(() => {
        setShowMiniChart(true);
      }, 300);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setShowMiniChart(false);
  }, [mainOpen, variant]);

  const handleSubmitOrder = useCallback(
    (sideOverride?: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES]) => {
      if (openOrdersCount >= MAX_OPEN_ORDERS) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          `Maximum open orders limit exceeded (${MAX_OPEN_ORDERS})`,
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
        quantity,
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
      quantity,
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
      createOrder,
      refetchOrders,
      tradePanelRef,
    ],
  );

  const sheetHeightClass = variant === 'full' ? 'h-[90dvh]' : 'h-[20dvh]';
  const isModal = variant === 'full';
  const scrollTouchStartYRef = useRef<number | null>(null);

  const myChart = useMemo(() => <MiniBidAskChart symbol={symbol} />, [symbol]);

  return (
    <>
      <Sheet
        open={mainOpen}
        modal={isModal}
        onOpenChange={(open) => {
          setMainOpen(open);
          setIsOpen(open);
        }}
      >
        <SheetContent
          forceMount
          side="bottom"
          withOverlay={isModal}
          title={t('trade.sheetTitle', { symbol })}
          showCloseButton={false}
          onInteractOutside={(e) => {
            if (!isModal) e.preventDefault();
          }}
          className={`bg-sheet text-foreground flex flex-col border-none p-0 ${sheetHeightClass} ${
            variant === 'full' ? 'rounded-t' : 'rounded-t'
          }`}
        >
          <div className="border-border flex h-full flex-col overflow-hidden border-b shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
            <div
              className={`flex-1 py-4 ${variant === 'compact' ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto'}`}
              onWheel={(e) => {
                if (variant !== 'compact') return;
                if (e.deltaY < -10) setVariant('full');
              }}
              onTouchStart={(e) => {
                if (variant !== 'compact') return;
                scrollTouchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchMove={(e) => {
                if (variant !== 'compact') return;
                const startY = scrollTouchStartYRef.current;
                if (startY == null) return;
                const currentY = e.touches[0]?.clientY;
                if (currentY == null) return;
                const deltaY = currentY - startY;
                if (deltaY < -35) {
                  setVariant('full');
                  scrollTouchStartYRef.current = null;
                }
              }}
              onTouchEnd={() => {
                scrollTouchStartYRef.current = null;
              }}
            >
              <TradePanelSymbolHeader
                symbol={displaySymbol}
                descSymbol={descSymbol}
                leverage={leverage}
                sellPrice={sellPrice}
                buyPrice={buyPrice}
                formatQuote={formatQuote}
              />

              <TradePanelOrderTypeTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                getTabLabel={getTabLabel}
              />

              <TradePanelVolumeControl
                quantity={quantity}
                setQuantity={setQuantity}
                setIsQuantityTouched={setIsQuantityTouched}
                minTradeSize={minTradeSize}
                maxTradeSize={maxTradeSize}
                volumeStep={volumeStepNum}
                requiredMarginForPosition={requiredMarginForPosition}
              />

              <div className="px-4">
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

                <div className="py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-body-large-medium text-foreground">
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

                <div className="pb-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-body-large-medium text-foreground">
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

              {showMiniChart ? (
                <div className="border-border mt-4 h-44.5 border-t">{myChart}</div>
              ) : (
                <div className="border-border mt-4 h-44.5 border-t">
                  <SplashLogo size={240} fullScreen={false} showBackground={false} />
                </div>
              )}
            </div>
            {variant === 'full' && (
              <TradePanelActionBar
                sellLabel={t('trade.sell')}
                buyLabel={t('trade.buy')}
                isCreatingOrder={isCreatingOrder}
                isSubmitLocked={isSubmitLocked}
                sellDisabled={
                  hasReachedMaxOpenPositions ||
                  sellTpSlError !== null ||
                  (activeTab === 'Limit' && isSellLimitInvalid)
                }
                buyDisabled={
                  hasReachedMaxOpenPositions ||
                  buyTpSlError !== null ||
                  (activeTab === 'Limit' && isBuyLimitInvalid)
                }
                onSell={() => {
                  setTransactionType('sell');
                  handleSubmitOrder(ORDER_SIDES.SELL);
                }}
                onBuy={() => {
                  setTransactionType('buy');
                  handleSubmitOrder(ORDER_SIDES.BUY);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default TradePanel;
