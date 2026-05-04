import { ChevronDown, ChevronLeft, Minus, Plus } from '@untitledui/icons';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ORDER_SIDES } from '@/types/orders';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { OrderType } from '@/types/orders';
import {
  TriggerType,
  type TriggerTypeString,
  type OpeningOrderTabType,
} from '@/types/openingOrder';
import MT5PriceText from '@/components/featured/market/components/MT5PriceText';
import {
  calculateUnrealizedPnL,
  getEnrichedPositionsFromInfiniteData,
} from '../../utils/position.calculations';
import { formatBalance } from '@/utils/currency';
import { useTheme } from '@/theme/ThemeProvider';
import { useInfinitePositions, usePositionStats } from '@/hook/usePosition';
import { useSymbols } from '@/hook/useSymbols';
import { useToast } from '@/hook/useToast';
import { Button } from '@/components/shared/atoms/button';
import { Switch } from '@/components/shared/atoms/switch';
import { useAccountStore } from '@/store/useAccountStore';
import { Asset } from '@/types/assets';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import Search from '@/components/featured/search/app/Search';
import { useAuthStore } from '@/store/authStore';
import { useAccountLeverageStore } from '@/store/useAccountLeverageStore';
import { normalizeLeverage } from '@/utils/leverage';
import { validateTPSL } from '../../utils/position.validate';
import { toNullablePositiveNumber, toPositiveNumber } from '../../utils/openingOrder.utils';
import { useOpeningOrderPricing } from '../hooks/useOpeningOrderPricing';
import { useOpeningOrderInputs } from '../hooks/useOpeningOrderInputs';
import { useOpeningOrderActions } from '../hooks/useOpeningOrderActions';
import OpeningOrderTypeSelector from './OpeningOrderTypeSelector';
import OpeningOrderTriggerSelector from './OpeningOrderTriggerSelector';
import { Decimal } from 'decimal.js';
import { useGetData } from '@/context/GetdataContext';
import { toDecimal } from '@/utils/decimal';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

interface OpeningOrderProps {
  position?: any;
  tab?: OpeningOrderTabType;
  orderTypeDefault?: string;
  tabBack?: string;
}

export function OpeningOrder({ position, tab, orderTypeDefault, tabBack }: OpeningOrderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const symbolFromParams = searchParams.get('symbol') || position?.symbol || 'XAUUSD';
  const { colors } = useTheme();
  const { assets: assetsData } = useGetData();

  // Determine initial symbol: from URL params > from position > default
  const initialSymbol = symbolFromParams;
  const assetsList = useMemo(() => assetsData ?? [], [assetsData]);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const assetMap = useMemo(() => {
    const map = new Map<string, Asset>();
    assetsList.forEach((asset) => map.set(asset.symbol, asset));
    return map;
  }, [assetsList]);
  const symbolAsset = assetMap.get(selectedSymbol);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const preferredLeverage = useAccountLeverageStore((state) =>
    selectedAccount?.id ? state.accountLeverageById[selectedAccount.id] : undefined,
  );
  const leverage = normalizeLeverage(preferredLeverage, symbolAsset?.maxLeverage, 100);
  const contractSize = symbolAsset?.contractSize || 100;
  const { data: positionStats } = usePositionStats({
    accountId: selectedAccount?.id || '',
  });
  const isClosePositionTab = tab === 'close_position';
  const isModifyOrder = tab === 'modify_order';
  // Get current asset data for lot validation
  const [takeProfitText, setTakeProfitText] = useState('');
  const [stopLossText, setStopLossText] = useState('');
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [takeProfitTriggerType, setTakeProfitTriggerType] = useState<TriggerTypeString>(
    TriggerType.PRICE,
  );
  const [stopLossTriggerType, setStopLossTriggerType] = useState<TriggerTypeString>(
    TriggerType.PRICE,
  );
  const [limitStopPriceText, setLimitStopPriceText] = useState('');
  const initialMinTradeSize = toPositiveNumber(symbolAsset?.minTradeSize, 0.01);
  const initialDefaultLot = Math.max(1, initialMinTradeSize);
  const initialPositionQuantity = toNullablePositiveNumber(position?.quantity);
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const canTrade = navigator.onLine && isConnected && !isReconnecting;
  const [lotText, setLotText] = useState('');

  useEffect(() => {
    setLotText(
      !isClosePositionTab
        ? initialDefaultLot.toString()
        : initialPositionQuantity?.toString() || '',
    );
  }, [initialDefaultLot, initialPositionQuantity, isClosePositionTab]);

  const [orderType, setOrderType] = useState(orderTypeDefault || OrderType.MARKET);
  const { data: positionsData } = useInfinitePositions({
    accountId: selectedAccount?.id || '',
    status: [0, 1],
  });
  const allPositions = useMemo(() => {
    return getEnrichedPositionsFromInfiniteData(positionsData, assetsList);
  }, [positionsData, assetsList]);
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const lotInputRef = useRef<HTMLInputElement>(null);

  const ask = useMarketSocketStore((s) => s.rtBySymbol?.[selectedSymbol]?.ask) ?? 0;
  const bid = useMarketSocketStore((s) => s.rtBySymbol?.[selectedSymbol]?.bid) ?? 0;

  const askNumber = useMemo(() => toDecimal(ask)?.toNumber() ?? 0, [ask]);
  const bidNumber = useMemo(() => toDecimal(bid)?.toNumber() ?? 0, [bid]);
  const minTradeSize = toPositiveNumber(symbolAsset?.minTradeSize, 0.01);
  const maxTradeSize = Math.max(toPositiveNumber(symbolAsset?.maxTradeSize, 100), minTradeSize);
  const volumeStep = toPositiveNumber(symbolAsset?.volumeStep, 0.01);
  // Get decimal places from volumeStep
  const getDecimalPlaces = (num: number) => {
    const str = num.toString();
    return str.includes('.') ? str.split('.')[1].length : 0;
  };
  const lotDecimalPlaces = getDecimalPlaces(volumeStep);

  // Order mode detection for TP/SL behavior.
  const isModifyType = orderType === OrderType.MODIFY;
  const symbolsToSubscribe = useMemo(() => {
    const statsSymbols = [
      ...(positionStats?.fxRateSymbols || []),
      ...(positionStats?.positionSymbols || []),
    ];

    return Array.from(new Set([selectedSymbol, ...statsSymbols].filter(Boolean)));
  }, [selectedSymbol, positionStats]);
  // Subscribe to symbol prices
  useSymbols(symbolsToSubscribe, symbolsToSubscribe.length > 0);
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);
  const { availableBalance } = useAccountSummaryMetrics();
  const computedAvailableBalance = availableBalance.toNumber();

  const isBuy = position?.side === ORDER_SIDES.BUY;
  const positionType = isBuy ? t('openingOrder.buy') : t('openingOrder.sell');
  const openPrice = position ? parseFloat(position.openPrice) : 0;
  const {
    estimatePnlPreview,
    formatPreviewPnL,
    formatPreviewPrice,
    getEntryPrice,
    limitStopPriceValue,
    shouldShowComputedPricePreview,
    stopLossDualPreview,
    stopLossModifyPreview,
    stopLossValue,
    takeProfitDualPreview,
    takeProfitModifyPreview,
    takeProfitValue,
  } = useOpeningOrderPricing({
    ask: askNumber,
    bid: bidNumber,
    contractSize,
    isModifyOrder,
    lotText,
    limitStopPriceText,
    orderType,
    position,
    rtBySymbol,
    selectedSymbol,
    stopLossText: stopLossEnabled ? stopLossText : '',
    stopLossTriggerType,
    symbolAsset,
    takeProfitText: takeProfitEnabled ? takeProfitText : '',
    takeProfitTriggerType,
  });

  // Get real-time price for selected symbol
  const rt = rtBySymbol?.[selectedSymbol];
  const realtimePrice = isBuy ? rt?.bid : rt?.ask;
  const currentPrice = toDecimal(realtimePrice)?.toNumber() ?? openPrice;
  const {
    adjustLotByStep,
    getLotAsNumber,
    handleLimitStopPriceInputChange,
    handleLimitStopPriceMinus,
    handleLimitStopPricePlus,
    handleLotInputChange,
    handleStopLossInputChange,
    handleStopLossMinus,
    handleStopLossPlus,
    handleTakeProfitInputChange,
    handleTakeProfitMinus,
    handleTakeProfitPlus,
  } = useOpeningOrderInputs({
    currentPrice,
    isModifyType,
    limitStopPriceValue,
    lotDecimalPlaces,
    lotText,
    maxTradeSize,
    minTradeSize,
    setLimitStopPriceText,
    setLotText,
    setStopLossText,
    setTakeProfitText,
    stopLossValue,
    symbolDigit: symbolAsset?.digit ?? 0,
    stopLossTriggerType,
    takeProfitValue,
    takeProfitTriggerType,
    volumeStep: minTradeSize,
  });

  const handleSelectSymbol = (newSymbol: string) => {
    setSelectedSymbol(newSymbol);
    setShowSymbolDropdown(false);
    const getSymbol = assetMap.get(newSymbol);
    const symbolMinTradeSize = toPositiveNumber(getSymbol?.minTradeSize, 0.01);
    const defaultLotForSymbol = Math.max(1, symbolMinTradeSize);
    setLotText(defaultLotForSymbol.toString());
  };
  const quantity =
    lotText != null && position?.quantity != null
      ? Math.min(Number(lotText), Number(position.quantity))
      : 0;
  const unrealizedPnL =
    position && isClosePositionTab
      ? calculateUnrealizedPnL(
          { ...position, quantity, profitCurrency: symbolAsset?.profitCurrency as string },
          rtBySymbol,
        )
      : 0;
  useEffect(() => {
    if (orderType === OrderType.MODIFY && position) {
      const tp = position.takeProfitPrice ? parseFloat(position.takeProfitPrice) : null;
      const sl = position.stopLossPrice ? parseFloat(position.stopLossPrice) : null;
      setTakeProfitText(tp ? tp.toString() : '');
      setStopLossText(sl ? sl.toString() : '');
      setTakeProfitEnabled(Boolean(tp));
      setStopLossEnabled(Boolean(sl));
      setTakeProfitTriggerType(TriggerType.PRICE);
      setStopLossTriggerType(TriggerType.PRICE);
      return;
    }

    setTakeProfitEnabled(false);
    setStopLossEnabled(false);
    setTakeProfitTriggerType(TriggerType.PRICE);
    setStopLossTriggerType(TriggerType.PRICE);
    setTakeProfitText('');
    setStopLossText('');
  }, [orderType, position]);
  const { showError, showSuccess } = useToast();

  const getSellLabel = () => {
    switch (orderType) {
      case OrderType.MARKET:
        return t('openingOrder.sell');
      case OrderType.STOP:
        return t('openingOrder.sellStop');
      case OrderType.LIMIT:
        return t('openingOrder.sellLimit');
      default:
        return t('openingOrder.sell');
    }
  };
  const getBuyLabel = () => {
    switch (orderType) {
      case OrderType.MARKET:
        return t('openingOrder.buy');
      case OrderType.STOP:
        return t('openingOrder.buyStop');
      case OrderType.LIMIT:
        return t('openingOrder.buyLimit');
      default:
        return t('openingOrder.buy');
    }
  };

  useEffect(() => {
    if (isModifyOrder && orderType === OrderType.MODIFY) {
      const price = position?.price ? parseFloat(position.price) : null;
      setLimitStopPriceText(price ? price.toString() : '');
    }
  }, [orderType, position]);
  const isLimitStopPriceValid = (side: 0 | 1): boolean => {
    const askDecimal = toDecimal(ask);
    const bidDecimal = toDecimal(bid);
    if (!askDecimal || !bidDecimal || askDecimal.lte(0) || bidDecimal.lte(0)) return false;
    if (orderType === OrderType.MARKET) return true;
    const limitStopDecimal = toDecimal(limitStopPriceValue);
    if (!limitStopDecimal || limitStopDecimal.lte(0)) return false;

    const isBuySide = side === ORDER_SIDES.BUY;

    if (orderType === OrderType.LIMIT) {
      // Buy Limit: price must be LOWER than ask
      if (isBuySide) return limitStopDecimal.lt(askDecimal);
      // Sell Limit: price must be HIGHER than bid
      return limitStopDecimal.gt(bidDecimal);
    } else if (orderType === OrderType.STOP) {
      // Buy Stop: price must be HIGHER than ask
      if (isBuySide) return limitStopDecimal.gt(askDecimal);
      // Sell Stop: price must be LOWER than bid
      return limitStopDecimal.lt(bidDecimal);
    }

    return true;
  };

  const isTPSLValidForSide = (side: 0 | 1): boolean => {
    const entryPrice = getEntryPrice(side);
    if (entryPrice == null) return false;

    return validateTPSL(
      side,
      entryPrice,
      bidNumber,
      askNumber,
      takeProfitEnabled ? takeProfitValue : null,
      stopLossEnabled ? stopLossValue : null,
      orderType,
      takeProfitTriggerType,
      stopLossTriggerType,
      symbolAsset,
    );
  };

  const {
    handleClosePosition,
    handleModify,
    handlePlaceOrder,
    isClosingPosition,
    isCreatingOrder,
    loadingModify,
    requiredMargin,
    requiredMarginForPosition,
  } = useOpeningOrderActions({
    accountId: selectedAccount?.id || '',
    ask: askNumber,
    availableBalance: computedAvailableBalance,
    bid: bidNumber,
    canTrade,
    contractSize,
    getEntryPrice,
    getLotAsNumber,
    isModifyOrder,
    isTPSLValidForSide,
    leverage,
    profitCurrency: symbolAsset?.profitCurrency as string,
    limitStopPriceValue,
    lotText,
    maxTradeSize,
    minTradeSize,
    orderType,
    position,
    rtBySymbol,
    selectedSymbol,
    showError,
    showSuccess,
    stopLossText,
    stopLossValue: stopLossEnabled ? stopLossValue : null,
    stopLossEnabled,
    stopLossTriggerType,
    symbolAsset,
    takeProfitText,
    takeProfitValue: takeProfitEnabled ? takeProfitValue : null,
    takeProfitEnabled,
    takeProfitTriggerType,
    t,
    onNavigate: (path) => router.replace(path),
    returnTab: tabBack,
  });
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/position');
    }
  }, [isAuthenticated, router]);

  const backFallbackPath = tabBack?.includes('market')
    ? '/market'
    : tabBack
      ? `/position?tab=${tabBack}`
      : '/position';

  const handleBack = () => {
    if (tabBack?.includes('market')) {
      router.replace(`/market/${symbolFromParams}`);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(backFallbackPath);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      {/* Header */}
      <div className="mt-2 flex flex-row items-center justify-between gap-3 px-2 py-3">
        <button onClick={handleBack} className="cursor-pointer border-0 bg-transparent p-0">
          <ChevronLeft className="text-foreground" size={24} />
        </button>
        <h1 className="text-h3-semibold text-foreground">
          {' '}
          {orderType == OrderType.MODIFY
            ? t('openingOrder.modifyOrder')
            : t('openingOrder.openingOrder')}
        </h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3">
          {/* Position Info */}
          <div className="relative mb-4">
            <div className="relative mb-2 flex flex-row items-center gap-3">
              <button
                className="flex cursor-pointer flex-row items-center gap-2 border-0 bg-transparent p-0"
                onClick={() => setShowSymbolDropdown(true)}
              >
                <p className="text-h3-semibold text-foreground">{selectedSymbol}</p>
                <ChevronDown color={colors.neutral700} size={20} />
              </button>
              {isClosePositionTab &&
                (orderType === OrderType.MARKET || orderType === OrderType.MODIFY) && (
                  <div
                    className={`rounded px-2.5 py-1.5 ${position?.side === ORDER_SIDES.BUY ? 'bg-green-50' : 'bg-red-50'}`}
                  >
                    <p
                      className={`text-caption-medium font-medium ${position?.side === ORDER_SIDES.BUY ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {position?.side === ORDER_SIDES.BUY
                        ? t('openingOrder.buy')
                        : t('openingOrder.sell')}{' '}
                      {new Decimal(position?.quantity ?? 0).toString()} {t('openingOrder.lot')}
                    </p>
                  </div>
                )}
              {isModifyOrder && orderType === OrderType.MODIFY && (
                <div
                  className={`rounded px-2.5 py-1.5 ${position?.side === ORDER_SIDES.BUY ? 'bg-green-50' : 'bg-red-50'}`}
                >
                  <p
                    className={`text-caption-medium font-medium ${position?.side === ORDER_SIDES.BUY ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {position?.side === ORDER_SIDES.BUY
                      ? t('openingOrder.buy')
                      : t('openingOrder.sell')}{' '}
                    {new Decimal(position?.quantity ?? 0).toString()} {t('openingOrder.lot')}
                  </p>
                </div>
              )}
              <div className="bg-primary-50 rounded px-2.5 py-1.5">
                <p className="text-primary-500 text-caption-medium">{leverage}x</p>
              </div>

              {/* Symbol Sheet */}
              <Sheet open={showSymbolDropdown} onOpenChange={setShowSymbolDropdown}>
                <SheetContent
                  side="bottom"
                  className="mx-auto h-[80%] w-full max-w-192 overflow-hidden rounded-t-lg"
                  showCloseButton={false}
                  title={t('openingOrder.selectSymbol')}
                >
                  <Search
                    onCancel={() => setShowSymbolDropdown(false)}
                    onSelectSymbol={(symbol) => {
                      handleSelectSymbol(symbol);
                      setTakeProfitText('');
                      setStopLossText('');
                      setLimitStopPriceText('');
                      setOrderType(OrderType.MARKET);
                      setShowSymbolDropdown(false);
                      router.replace(
                        `/opening-order?tab=opening_position&symbol=${symbol}&tabBack=${tabBack || 'position'}`,
                      );
                    }}
                    isTrade={true}
                  />
                </SheetContent>
              </Sheet>
            </div>
            <p className="text-body-small-regular text-muted-foreground">
              {symbolAsset?.name || t('openingOrder.unknownAsset')}
            </p>
          </div>

          {/* Price Display */}
          <div className="mb-2">
            <div className="flex flex-row items-center justify-center gap-4">
              <div className="flex flex-1 justify-center text-center">
                <MT5PriceText
                  fixedDecimals={symbolAsset?.digit ?? 2}
                  style={{ color: colors.red500 }}
                  value={bid}
                />
              </div>
              <div className="bg-border h-8 w-px" />
              <div className="flex flex-1 justify-center text-center">
                <MT5PriceText
                  fixedDecimals={symbolAsset?.digit ?? 2}
                  style={{ color: colors.green500 }}
                  value={ask}
                />
              </div>
            </div>
          </div>

          {isClosePositionTab && orderType !== OrderType.LIMIT && orderType !== OrderType.STOP && (
            <div>
              <div className="mb-2 flex flex-row items-center justify-between">
                <p className="text-body-small-regular text-muted-foreground">
                  {t('openingOrder.positionId')}
                </p>
                <p className="text-body-large-semibold text-foreground">#{position?.id}</p>
              </div>
              <div className="mb-4 flex flex-row items-center justify-between">
                <p className="text-body-small-regular text-muted-foreground">
                  {t('openingOrder.entryPrice')}
                </p>
                <p className="text-body-large-semibold text-foreground">
                  {new Decimal(position?.openPrice ?? 0).toString()}
                </p>
              </div>
            </div>
          )}
          {isModifyOrder && orderType === OrderType.MODIFY && (
            <div>
              <div className="mb-2 flex flex-row items-center justify-between">
                <p className="text-body-small-regular text-muted-foreground">
                  {t('openingOrder.positionId')}
                </p>
                <p className="text-body-large-semibold text-foreground">#{position?.id}</p>
              </div>
              <div className="mb-4 flex flex-row items-center justify-between">
                <p className="text-body-small-regular text-muted-foreground">
                  {t('openingOrder.price')}
                </p>
                <p className="text-body-large-semibold text-foreground">
                  {new Decimal(position?.price ?? 0).toString()}
                </p>
              </div>
            </div>
          )}
          <OpeningOrderTypeSelector
            currentOrderType={orderType}
            isClosePositionTab={isClosePositionTab}
            isModifyOrder={isModifyOrder}
            onSelect={(nextOrderType) => {
              setOrderType(nextOrderType);
              setTakeProfitEnabled(false);
              setStopLossEnabled(false);
              setStopLossText('');
              setTakeProfitText('');
              setLimitStopPriceText('');
              setTakeProfitTriggerType(TriggerType.PRICE);
              setStopLossTriggerType(TriggerType.PRICE);
            }}
          />

          {orderType !== OrderType.MODIFY && (
            <div className="mb-1">
              <p className="text-foreground font-medium">
                {t('trade.web.orderForm.quantity')} (lot)
              </p>
              <div className="flex flex-row items-center">
                <button
                  className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5 dark:bg-neutral-800"
                  onClick={() => adjustLotByStep(-1, 0.01)}
                >
                  <Minus size={18} strokeWidth={2} />
                </button>

                <div className="relative min-w-0 flex-1">
                  <input
                    placeholder={'0'}
                    value={lotText}
                    onChange={(e) => handleLotInputChange(e.target.value)}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    className="text-h3-regular text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2.5 text-center placeholder:text-center focus:ring-0 focus:outline-none"
                  />
                </div>

                <button
                  className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-sm border-0 px-3 py-2.5 dark:bg-neutral-800"
                  onClick={() => adjustLotByStep(1, 0.01)}
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>
              <div className="mt-2 flex flex-row items-center gap-2">
                <button
                  className="border-border flex flex-1 cursor-pointer items-center justify-center rounded-sm border bg-transparent py-1"
                  onClick={() => adjustLotByStep(-5, 1)}
                >
                  <p className="">-5</p>
                </button>
                <button
                  className="border-border flex flex-1 cursor-pointer items-center justify-center rounded-sm border bg-transparent py-1"
                  onClick={() => adjustLotByStep(-1, 1)}
                >
                  <p className="">-1</p>
                </button>
                <button
                  className="border-border flex flex-1 cursor-pointer items-center justify-center rounded-sm border bg-transparent py-1"
                  onClick={() => adjustLotByStep(1, 1)}
                >
                  <p className=" ">+1</p>
                </button>
                <button
                  className="border-border flex flex-1 cursor-pointer items-center justify-center rounded-sm border bg-transparent py-1"
                  onClick={() => adjustLotByStep(5, 1)}
                >
                  <p className="">+5</p>
                </button>
              </div>
              {
                <div className="mb-4">
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <p className="text-caption-regular text-center">
                        {t('market.accountDropdown.margin')}
                      </p>
                      <p className="text-caption-regular text-neutral-primary text-center">
                        ≈ {formatBalance(requiredMarginForPosition)}
                      </p>
                    </div>
                  </div>
                </div>
              }
            </div>
          )}

          {(orderType === OrderType.LIMIT ||
            orderType === OrderType.STOP ||
            (isModifyOrder && orderType === OrderType.MODIFY)) && (
            <div className="mb-3">
              <div className="flex flex-row items-center">
                <p className="text-foreground flex-1 font-medium">{t('openingOrder.price')}</p>
                <button
                  className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5 dark:bg-neutral-800"
                  onClick={handleLimitStopPriceMinus}
                >
                  <Minus size={18} strokeWidth={2} />
                </button>

                <div className="min-w-0 flex-1">
                  <input
                    placeholder={t('openingOrder.notSet')}
                    value={limitStopPriceText}
                    onChange={(e) => handleLimitStopPriceInputChange(e.target.value)}
                    type="text"
                    inputMode="decimal"
                    className="text-h3-regular text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2.5 text-center placeholder:text-center focus:ring-0 focus:outline-none"
                  />
                </div>

                <button
                  className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5 dark:bg-neutral-800"
                  onClick={handleLimitStopPricePlus}
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-foreground font-medium">{t('openingOrder.takeProfit')}</p>
              <Switch
                checked={takeProfitEnabled}
                onCheckedChange={(checked) => {
                  setTakeProfitEnabled(checked);
                  if (!checked) {
                    setTakeProfitText('');
                  }
                }}
              />
            </div>

            {takeProfitEnabled && (
              <>
                <OpeningOrderTriggerSelector
                  currentTriggerType={takeProfitTriggerType}
                  onSelect={(nextTriggerType) => {
                    setTakeProfitTriggerType(nextTriggerType);
                    if (isModifyType && nextTriggerType === TriggerType.PRICE) {
                      setTakeProfitText(position?.takeProfitPrice ?? '');
                      return;
                    }
                    setTakeProfitText('');
                  }}
                />

                <div className="flex flex-row items-center">
                  <button
                    className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5 dark:bg-neutral-800"
                    onClick={handleTakeProfitMinus}
                  >
                    <Minus size={18} strokeWidth={2} />
                  </button>

                  <div className="relative min-w-0 flex-1">
                    <input
                      placeholder={t('openingOrder.notSet')}
                      value={takeProfitText}
                      onChange={(e) => handleTakeProfitInputChange(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="text-h3-regular text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2.5 text-center placeholder:text-center focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <button
                    className="bg-primary-50 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5 dark:bg-neutral-800"
                    onClick={handleTakeProfitPlus}
                  >
                    <Plus size={18} strokeWidth={2} />
                  </button>
                </div>

                {takeProfitValue != null &&
                  takeProfitEnabled &&
                  (estimatePnlPreview || shouldShowComputedPricePreview) && (
                    <div className="text-caption-regular flex items-start gap-3">
                      <div className="text-muted-foreground flex w-[60%] flex-col gap-0.5">
                        {isModifyType
                          ? takeProfitModifyPreview != null && (
                              <p>
                                {t('openingOrder.priceLabel')}{' '}
                                {formatPreviewPrice(takeProfitModifyPreview)}
                              </p>
                            )
                          : takeProfitDualPreview && (
                              <>
                                <p>
                                  {t('openingOrder.buyTP')}{' '}
                                  {formatPreviewPrice(takeProfitDualPreview.buy)}
                                </p>
                                <p>
                                  {t('openingOrder.sellTP')}{' '}
                                  {formatPreviewPrice(takeProfitDualPreview.sell)}
                                </p>
                              </>
                            )}
                      </div>

                      {estimatePnlPreview && (
                        <div className="text-muted-foreground flex flex-col gap-0.5 text-left">
                          {isModifyType ? (
                            <p>
                              <span className="inline-block">{t('openingOrder.estTP')}</span>{' '}
                              {formatPreviewPnL(
                                position?.side === ORDER_SIDES.BUY
                                  ? estimatePnlPreview.takeProfit.buy
                                  : estimatePnlPreview.takeProfit.sell,
                              )}
                            </p>
                          ) : (
                            <>
                              <p>
                                <span className="inline-block">{t('openingOrder.estTP')}</span>{' '}
                                {formatPreviewPnL(estimatePnlPreview.takeProfit.buy)}
                              </p>
                              <p>
                                <span className="inline-block">{t('openingOrder.estTP')}</span>{' '}
                                {formatPreviewPnL(estimatePnlPreview.takeProfit.sell)}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-foreground font-medium">{t('openingOrder.stopLoss')}</p>
              <Switch
                checked={stopLossEnabled}
                onCheckedChange={(checked) => {
                  setStopLossEnabled(checked);
                  if (!checked) {
                    setStopLossText('');
                  }
                }}
              />
            </div>

            {stopLossEnabled && (
              <>
                <OpeningOrderTriggerSelector
                  currentTriggerType={stopLossTriggerType}
                  onSelect={(nextTriggerType) => {
                    setStopLossTriggerType(nextTriggerType);
                    if (isModifyType && nextTriggerType === TriggerType.PRICE) {
                      setStopLossText(position?.stopLossPrice ?? '');
                      return;
                    }
                    setStopLossText('');
                  }}
                />

                <div className="flex flex-row items-center">
                  <button
                    className="bg-primary-50 dark:bg-neutaul-800 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5"
                    onClick={handleStopLossMinus}
                  >
                    <Minus size={18} strokeWidth={2} />
                  </button>

                  <div className="relative min-w-0 flex-1">
                    <input
                      placeholder={t('openingOrder.notSet')}
                      value={stopLossText}
                      onChange={(e) => handleStopLossInputChange(e.target.value)}
                      type="text"
                      inputMode="decimal"
                      className="text-h3-regular text-foreground placeholder:text-muted-foreground w-full rounded-lg px-3 py-2.5 text-center placeholder:text-center focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <button
                    className="bg-primary-50 dark:bg-neutaul-800 flex cursor-pointer items-center justify-center rounded-lg border-0 px-3 py-2.5"
                    onClick={handleStopLossPlus}
                  >
                    <Plus size={18} strokeWidth={2} />
                  </button>
                </div>

                {stopLossValue != null &&
                  stopLossEnabled &&
                  (estimatePnlPreview || shouldShowComputedPricePreview) && (
                    <div className="text-caption-regular flex items-start gap-3">
                      <div className="text-muted-foreground flex w-[60%] flex-col gap-0.5">
                        {isModifyType
                          ? stopLossModifyPreview != null && (
                              <p>
                                {t('openingOrder.priceLabel')}{' '}
                                {formatPreviewPrice(stopLossModifyPreview)}
                              </p>
                            )
                          : stopLossDualPreview && (
                              <>
                                <p>
                                  {t('openingOrder.buySL')}{' '}
                                  {formatPreviewPrice(stopLossDualPreview.buy)}
                                </p>
                                <p>
                                  {t('openingOrder.sellSL')}{' '}
                                  {formatPreviewPrice(stopLossDualPreview.sell)}
                                </p>
                              </>
                            )}
                      </div>

                      {estimatePnlPreview && (
                        <div className="text-muted-foreground flex flex-col gap-0.5 text-left">
                          {isModifyType ? (
                            <p>
                              <span className="inline-block">{t('openingOrder.estSL')}</span>{' '}
                              {formatPreviewPnL(
                                position?.side === ORDER_SIDES.BUY
                                  ? estimatePnlPreview.stopLoss.buy
                                  : estimatePnlPreview.stopLoss.sell,
                              )}
                            </p>
                          ) : (
                            <>
                              <p>
                                <span className="inline-block">{t('openingOrder.estSL')}</span>{' '}
                                {formatPreviewPnL(estimatePnlPreview.stopLoss.buy)}
                              </p>
                              <p>
                                <span className="inline-block">{t('openingOrder.estSL')}</span>{' '}
                                {formatPreviewPnL(estimatePnlPreview.stopLoss.sell)}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>

      {isModifyType && !isModifyOrder ? (
        <div className="mb-5 px-4 py-4">
          <button
            disabled={
              loadingModify ||
              !position ||
              !validateTPSL(
                position.side as 0 | 1,
                parseFloat(position.openPrice),
                bidNumber,
                askNumber,
                takeProfitEnabled ? takeProfitValue : null,
                stopLossEnabled ? stopLossValue : null,
                OrderType.MODIFY,
                takeProfitTriggerType,
                stopLossTriggerType,
                symbolAsset,
              )
            }
            className="bg-primary-500 flex w-full cursor-pointer items-center justify-center rounded border-0 py-3 font-medium text-white disabled:opacity-50"
            onClick={() => {
              handleModify();
            }}
          >
            {isCreatingOrder ? t('openingOrder.processing') : t('openingOrder.modify')}
          </button>
        </div>
      ) : isModifyType && isModifyOrder ? (
        <div className="mb-5 px-4 py-4">
          <button
            disabled={
              loadingModify ||
              !position ||
              (toDecimal(takeProfitModifyPreview)?.lt(0) ?? false) ||
              (toDecimal(stopLossModifyPreview)?.lt(0) ?? false) ||
              (orderType === OrderType.MODIFY && !limitStopPriceText) ||
              !validateTPSL(
                position.side as 0 | 1,
                parseFloat(limitStopPriceText || position.price),
                bidNumber,
                askNumber,
                takeProfitEnabled ? takeProfitValue : null,
                stopLossEnabled ? stopLossValue : null,
                OrderType.MODIFY,
                takeProfitTriggerType,
                stopLossTriggerType,
                symbolAsset,
                true,
              )
            }
            className="bg-primary-500 flex w-full cursor-pointer items-center justify-center rounded border-0 py-3 font-medium text-white disabled:opacity-50"
            onClick={() => {
              handleModify();
            }}
          >
            {isCreatingOrder ? t('openingOrder.processing') : t('openingOrder.modify')}
          </button>
        </div>
      ) : isClosePositionTab && orderType === OrderType.MARKET ? (
        <div className="mb-4 flex flex-col gap-2 px-4 py-4">
          <div>
            <p className="text-foreground text-center text-sm">
              {t('openingOrder.closePositionMessage', {
                positionType,
                positionId: position?.id,
                lot: quantity,
                profitLoss: unrealizedPnL > 0 ? t('openingOrder.profit') : t('openingOrder.loss'),
                amount: new Decimal(Math.abs(unrealizedPnL).toFixed(2)).toString(),
              })}
            </p>
          </div>

          <div className="flex flex-row gap-2">
            <Button
              disabled={isCreatingOrder || !isTPSLValidForSide(ORDER_SIDES.SELL)}
              className="text-button-large-medium flex flex-1 py-3"
              onClick={() => handlePlaceOrder(ORDER_SIDES.SELL)}
              variant="red-contained"
            >
              {getSellLabel()}
            </Button>
            <Button
              disabled={isCreatingOrder || !isTPSLValidForSide(ORDER_SIDES.BUY)}
              className="text-button-large-medium flex flex-1 py-3"
              onClick={() => handlePlaceOrder(ORDER_SIDES.BUY)}
              variant="green-contained"
            >
              {getBuyLabel()}
            </Button>
          </div>
          {/* Close Button */}
          <Button
            disabled={
              isCreatingOrder ||
              isClosingPosition ||
              !quantity ||
              !position ||
              (getLotAsNumber() ?? 0) > Number(position.quantity)
            }
            className="flex w-full cursor-pointer flex-row items-center justify-center gap-2 rounded border-0 bg-yellow-500 py-3 font-medium text-white disabled:opacity-50"
            onClick={() => position && handleClosePosition(position)}
          >
            <p>
              {isClosingPosition
                ? t('openingOrder.closing')
                : t('openingOrder.closePositionButton', {
                    positionType,
                    amount: new Decimal(unrealizedPnL.toFixed(2)).toString(),
                  })}
            </p>
          </Button>
        </div>
      ) : (
        <div className="mb-5 px-4 py-4">
          <div className="flex flex-row gap-2">
            <Button
              disabled={
                isCreatingOrder ||
                !isLimitStopPriceValid(ORDER_SIDES.SELL) ||
                !isTPSLValidForSide(ORDER_SIDES.SELL)
              }
              className="flex flex-1 cursor-pointer items-center justify-center py-3 font-medium"
              onClick={() => handlePlaceOrder(ORDER_SIDES.SELL)}
              variant="red-contained"
            >
              {getSellLabel()}
            </Button>
            <Button
              disabled={
                isCreatingOrder ||
                !isLimitStopPriceValid(ORDER_SIDES.BUY) ||
                !isTPSLValidForSide(ORDER_SIDES.BUY)
              }
              className="flex flex-1 cursor-pointer items-center justify-center py-3 font-medium"
              onClick={() => handlePlaceOrder(ORDER_SIDES.BUY)}
              variant="green-contained"
            >
              {getBuyLabel()}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
