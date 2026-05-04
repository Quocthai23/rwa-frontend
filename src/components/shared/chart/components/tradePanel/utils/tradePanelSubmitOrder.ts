import {
  calculateOrderMargin,
  isAvailableBalanceSufficient,
} from '@/components/featured/position/utils/position.calculations';
import { ORDER_SIDES, ORDER_TYPE_CODES } from '@/types/orders';
import { isForexMarketOpen } from '@/utils/forexMarketHours';
import type { CreateOrderPayload } from '@/types/orders';
import type { Asset } from '@/types/assets';
import type { DecimalValue } from '@/types/decimal';
import type { TFunction } from 'i18next';
import type { MutableRefObject } from 'react';
import Decimal from 'decimal.js';

import type { TradePanelSheetHandle } from './tradePanelTypes';
import {
  normalizeDecimalInput,
  snapQuantityToVolumeStep,
  toFiniteNumberFromNumberish,
} from './tradePanelInputHelpers';
import { TABS, convertTPSLToPrice } from './tradePanelUtils';
import type { TriggerType } from '../components/TradePanelTriggerSelect';

type RT = { ask?: DecimalValue; bid?: DecimalValue };

type TradePanelActiveTab = (typeof TABS)[number];

export type SubmitTradePanelOrderParams = {
  user: unknown;
  router: { push: (href: string) => void };
  canTrade: boolean;
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  t: TFunction;
  symbolAsset: { category?: { code?: string } } | undefined;
  isCreatingOrder: boolean;
  submitLockRef: MutableRefObject<boolean>;
  quantity: string;
  volumeStepNum: number;
  minTradeSize: number;
  maxTradeSize: number;
  setQuantity: (value: string) => void;
  activeTab: TradePanelActiveTab;
  transactionType: 'buy' | 'sell';
  buyTpSlError: string | null;
  sellTpSlError: string | null;
  leverage: number;
  symbol: string;
  selectedAccountId: string;
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
  calculatedAvailableBalance: number;
  contractSizeNumber: number;
  rtBySymbol: Parameters<typeof calculateOrderMargin>[5];
  limitPrice: string;
  rt: RT | undefined;
  takeProfitTriggerType: TriggerType;
  stopLossTriggerType: TriggerType;
  takeProfitValue: string;
  stopLossValue: string;
  symbolAssetForConvert: Asset | undefined;
  createOrder: (
    payload: CreateOrderPayload,
    callbacks: {
      onSuccess: (response: unknown) => void;
      onError: (error: unknown) => void;
      onSettled: () => void;
    },
  ) => void;
  refetchPositions: () => void;
  refetchOrders: () => void;
  tradePanelRef: MutableRefObject<TradePanelSheetHandle | null>;
  setIsSubmitLocked: (value: boolean) => void;
};

export function submitTradePanelOrder(
  sideOverride: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES] | undefined,
  p: SubmitTradePanelOrderParams,
): void {
  const {
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
    selectedAccountId,
    sellPrice,
    buyPrice,
    calculatedAvailableBalance,
    contractSizeNumber,
    rtBySymbol,
    limitPrice,
    rt,
    takeProfitTriggerType,
    stopLossTriggerType,
    takeProfitValue,
    stopLossValue,
    symbolAssetForConvert,
    createOrder,
    refetchPositions,
    refetchOrders,
    tradePanelRef,
    setIsSubmitLocked,
  } = p;

  if (!user) {
    router.push('/login');
    return;
  }

  if (!canTrade) {
    showError(t('trade.errors.connectionErrorTitle'), t('trade.errors.connectionErrorMessage'));
    return;
  }

  const categoryCode = symbolAsset?.category?.code?.toUpperCase?.() ?? '';
  if (categoryCode !== 'CRYPTO' && !isForexMarketOpen()) {
    showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
    return;
  }

  if (isCreatingOrder || submitLockRef.current) return;

  if (!quantity) {
    showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.enterValidQuantity'));
    return;
  }

  const rawQty = Number.parseFloat(normalizeDecimalInput(quantity));
  if (!Number.isFinite(rawQty) || rawQty <= 0) {
    showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.enterValidQuantity'));
    return;
  }

  // Validate min/max before step snapping. Otherwise small values (e.g. 0.1 with min 7) can
  // round to 0 when step is large and we show "enter valid quantity" instead of the real minimum.
  if (rawQty < minTradeSize) {
    showError(
      t('trade.errors.tradeFailedTitle'),
      t('trade.errors.minimumQuantity', { value: minTradeSize }),
    );
    return;
  }

  if (rawQty > maxTradeSize) {
    showError(
      t('trade.errors.tradeFailedTitle'),
      t('trade.errors.maximumQuantity', { value: maxTradeSize }),
    );
    return;
  }

  const step = volumeStepNum > 0 ? volumeStepNum : 0.01;
  const qty = snapQuantityToVolumeStep(rawQty, step);

  if (!Number.isFinite(qty) || qty <= 0) {
    showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.enterValidQuantity'));
    return;
  }

  if (qty < minTradeSize) {
    showError(
      t('trade.errors.tradeFailedTitle'),
      t('trade.errors.minimumQuantity', { value: minTradeSize }),
    );
    return;
  }

  if (qty > maxTradeSize) {
    showError(
      t('trade.errors.tradeFailedTitle'),
      t('trade.errors.maximumQuantity', { value: maxTradeSize }),
    );
    return;
  }

  setQuantity(qty.toFixed(2));

  const isMarket = activeTab === 'Market';
  const side = sideOverride ?? (transactionType === 'sell' ? ORDER_SIDES.SELL : ORDER_SIDES.BUY);
  const tpSlError = side === ORDER_SIDES.BUY ? buyTpSlError : sellTpSlError;
  if (tpSlError) return;

  const orderTypeCode =
    activeTab === 'Market'
      ? ORDER_TYPE_CODES.MARKET
      : activeTab === 'Stop'
        ? ORDER_TYPE_CODES.STOP
        : ORDER_TYPE_CODES.LIMIT;

  const calculateMarginRequired = (q: number, price: number): number => {
    if (!q || q <= 0 || !price || price <= 0) return 0;
    return calculateOrderMargin(
      q,
      price,
      symbol,
      leverage,
      contractSizeNumber,
      rtBySymbol,
      symbolAssetForConvert?.profitCurrency as string,
    );
  };

  const payload: CreateOrderPayload = {
    accountId: selectedAccountId,
    leverage,
    orderType: orderTypeCode,
    quantity: qty,
    side,
    symbol,
  };

  if (isMarket) {
    const marketPrice =
      toFiniteNumberFromNumberish(side === ORDER_SIDES.SELL ? sellPrice : buyPrice) ?? 0;

    const requiredMargin = calculateMarginRequired(qty, marketPrice);
    if (!isAvailableBalanceSufficient(calculatedAvailableBalance, requiredMargin)) {
      showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.insufficientAvailableBalance'));
      return;
    }

    const tpNum = takeProfitValue
      ? Number.parseFloat(normalizeDecimalInput(takeProfitValue))
      : null;
    const slNum =
      stopLossValue && stopLossValue !== '0.00'
        ? Number.parseFloat(normalizeDecimalInput(stopLossValue))
        : null;

    const tpPrice = convertTPSLToPrice(
      tpNum,
      true,
      side,
      takeProfitTriggerType,
      marketPrice,
      symbolAssetForConvert,
    );
    const slPrice = convertTPSLToPrice(
      slNum,
      false,
      side,
      stopLossTriggerType,
      marketPrice,
      symbolAssetForConvert,
    );
    if (tpPrice != null) payload.takeProfitPrice = tpPrice;
    if (slPrice != null) payload.stopLossPrice = slPrice;
  } else {
    if (!limitPrice) {
      showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.enterLimitPrice'));
      return;
    }

    const price = Number.parseFloat(normalizeDecimalInput(limitPrice));
    const ask = toFiniteNumberFromNumberish(rt?.ask) ?? 0;
    const bid = toFiniteNumberFromNumberish(rt?.bid) ?? 0;
    const isBuy = side === ORDER_SIDES.BUY;

    if (!Number.isFinite(price) || price <= 0) {
      showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.enterValidLimitPrice'));
      return;
    }

    if (activeTab === 'Limit') {
      if (isBuy && !new Decimal(price).lt(ask)) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.buyLimitPriceBelowAsk', { price, ask }),
        );
        return;
      }
      if (!isBuy && !new Decimal(price).gt(bid)) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.sellLimitPriceAboveBid', { price, bid }),
        );
        return;
      }
    }

    if (activeTab === 'Stop') {
      if (isBuy && !new Decimal(price).gt(ask)) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.buyStopPriceAboveAsk', { price, ask }),
        );
        return;
      }
      if (!isBuy && !new Decimal(price).lt(bid)) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.sellStopPriceBelowBid', { price, bid }),
        );
        return;
      }
    }

    payload.price = price;

    const requiredMargin = calculateMarginRequired(qty, price);
    if (!isAvailableBalanceSufficient(calculatedAvailableBalance, requiredMargin)) {
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.errors.insufficientAvailableBalanceToPlaceOrder'),
      );
      return;
    }

    const tpNum =
      takeProfitValue && takeProfitValue !== '0.00'
        ? Number.parseFloat(normalizeDecimalInput(takeProfitValue))
        : null;
    const slNum =
      stopLossValue && stopLossValue !== '0.00'
        ? Number.parseFloat(normalizeDecimalInput(stopLossValue))
        : null;

    const tpPrice = convertTPSLToPrice(
      tpNum,
      true,
      side,
      takeProfitTriggerType,
      price,
      symbolAssetForConvert,
    );
    const slPrice = convertTPSLToPrice(
      slNum,
      false,
      side,
      stopLossTriggerType,
      price,
      symbolAssetForConvert,
    );
    if (tpPrice != null) payload.takeProfitPrice = tpPrice;
    if (slPrice != null) payload.stopLossPrice = slPrice;
  }

  submitLockRef.current = true;
  setIsSubmitLocked(true);

  createOrder(payload, {
    onSuccess: (response: unknown) => {
      const res = response as {
        success?: boolean;
        code?: unknown;
        errors?: unknown;
        message?: unknown;
      } | null;

      const hasBusinessError =
        res != null &&
        (res.success === false || (typeof res.code === 'string' && res.code !== 'success'));

      if (hasBusinessError) {
        const errorMessage =
          (typeof res?.errors === 'string' && res.errors) ||
          (typeof res?.message === 'string' && res.message) ||
          (typeof res?.code === 'string' ? res.code : undefined) ||
          t('trade.errors.failedCreateOrder');

        showError(t('trade.errors.orderPlacementFailedTitle'), errorMessage);
        return;
      }

      showSuccess(
        t('trade.success.orderPlacedSuccessfullyTitle'),
        t('trade.success.orderPlacedSuccessfully'),
      );
      refetchPositions();
      refetchOrders();
      tradePanelRef.current?.close();
    },
    onError: (error: unknown) => {
      const err = error as { message?: unknown; errors?: unknown; code?: unknown } | null;
      // Support both ApiError shape (code/message) and nested errors shape
      const errorsObj = (err?.errors || {}) as { message?: unknown; code?: unknown };
      const backendMessage =
        (typeof errorsObj?.message === 'string' && errorsObj.message) || undefined;
      const backendCode = (typeof errorsObj?.code === 'string' && errorsObj.code) || undefined;

      const apiErrorMessage = (typeof err?.message === 'string' && err.message) || backendMessage;
      const apiErrorCode = (typeof err?.code === 'string' && err.code) || backendCode;

      const isStalePriceError =
        apiErrorCode === 'bad-request' &&
        typeof apiErrorMessage === 'string' &&
        apiErrorMessage.toLowerCase().includes('is stale');
      if (typeof apiErrorCode === 'string' && apiErrorCode.includes('price-not-found')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedMessage'));
        return;
      }
      if (isStalePriceError) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
        return;
      }

      const message =
        apiErrorMessage ||
        (typeof err?.errors === 'string' && err.errors) ||
        t('trade.errors.failedCreateOrder');

      showError(t('trade.errors.orderPlacementFailedTitle'), message);
    },
    onSettled: () => {
      submitLockRef.current = false;
      setIsSubmitLocked(false);
    },
  });
}
