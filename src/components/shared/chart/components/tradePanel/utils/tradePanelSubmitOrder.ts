import {
  isAvailableBalanceSufficient,
} from '@/components/featured/position/utils/position.calculations';
import { ORDER_SIDES } from '@/types/orders';
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
import { TABS } from './tradePanelUtils';

type RT = { ask?: DecimalValue; bid?: DecimalValue };

type TradePanelActiveTab = (typeof TABS)[number];

export type SubmitTradePanelOrderParams = {
  user: unknown;
  router: { push: (href: string) => void };
  canTrade: boolean;
  showError: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  t: TFunction;
  symbolAsset: Asset | undefined;
  isCreatingOrder: boolean;
  submitLockRef: MutableRefObject<boolean>;
  quantity: string;
  volumeStepNum: number;
  minTradeSize: number;
  maxTradeSize: number;
  setQuantity: (value: string) => void;
  activeTab: TradePanelActiveTab;
  transactionType: 'buy' | 'sell';
  symbol: string;
  sellPrice: DecimalValue;
  buyPrice: DecimalValue;
  calculatedAvailableBalance: number;
  limitPrice: string;
  rt: RT | undefined;
  createOrder: (
    payload: CreateOrderPayload,
    callbacks: {
      onSuccess: (response: unknown) => void;
      onError: (error: unknown) => void;
      onSettled: () => void;
    },
  ) => void;
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
    symbol,
    sellPrice,
    buyPrice,
    calculatedAvailableBalance,
    limitPrice,
    rt,
    createOrder,
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

  // Only check market hours for Forex. RWA and Crypto may trade 24/7
  const categoryCode = symbolAsset?.category?.code?.toUpperCase?.() ?? '';
  if (categoryCode === 'FOREX' && !isForexMarketOpen()) {
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
  // Map numeric enums to string enums for backend API
  const sideString = side === ORDER_SIDES.BUY ? 'BUY' : 'SELL';
  const orderTypeString = isMarket ? 'MARKET' : 'LIMIT';

  if (!symbol || !symbolAsset?.id) {
    showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.tradeFailedMessage'));
    return;
  }

  const referencePriceValue =
    (symbolAsset as { referencePrice?: string } | undefined)?.referencePrice ?? '';
  const priceBandValue =
    (symbolAsset as { priceBandPercentage?: string } | undefined)?.priceBandPercentage ?? '';
  const referencePriceNumber = Number(referencePriceValue);
  const priceBandPercentage = Number(priceBandValue);

  const calculateTotalCostRequired = (q: number, price: number): number => {
    if (!q || q <= 0 || !price || price <= 0) return 0;
    return q * price;
  };

  const payload: CreateOrderPayload = {
    assetId: symbolAsset.id,
    symbol,
    type: orderTypeString,
    quantity: String(qty),
    side: sideString,
  };

  if (isMarket) {
    const marketPrice =
      toFiniteNumberFromNumberish(side === ORDER_SIDES.SELL ? sellPrice : buyPrice) ?? 0;

    const totalCost = calculateTotalCostRequired(qty, marketPrice);
    if (!isAvailableBalanceSufficient(calculatedAvailableBalance, totalCost)) {
      showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.insufficientAvailableBalance'));
      return;
    }

  } else {
    // LIMIT orders
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

    // LIMIT order price validation
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

    if (
      Number.isFinite(referencePriceNumber) &&
      referencePriceNumber > 0 &&
      Number.isFinite(priceBandPercentage) &&
      priceBandPercentage > 0
    ) {
      const minBandPrice = referencePriceNumber * (1 - priceBandPercentage);
      const maxBandPrice = referencePriceNumber * (1 + priceBandPercentage);
      if (price < minBandPrice || price > maxBandPrice) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.priceOutsideBand', {
            defaultValue: 'Price is outside the allowed reference band.',
          }),
        );
        return;
      }
    }

    payload.price = String(price);

    const totalCost = calculateTotalCostRequired(qty, price);
    if (!isAvailableBalanceSufficient(calculatedAvailableBalance, totalCost)) {
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.errors.insufficientAvailableBalanceToPlaceOrder'),
      );
      return;
    }


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
