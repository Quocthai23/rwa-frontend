import { ORDER_SIDES, ORDER_TYPE_CODES } from '@/types/orders';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { updateOrderAPI } from '@/services/orderService';
import { closePositions, updatePosition } from '@/services/positionService';
import type { Asset } from '@/types/assets';
import {
  MAX_CHANGE_PERCENT_THRESHOLD,
  TriggerType,
  type TriggerTypeString,
} from '@/types/openingOrder';
import { OrderType } from '@/types/orders';
import type { Position } from '@/types/position';
import { toDecimal } from '@/utils/decimal';
import Decimal from 'decimal.js';
import { useMemo, useState } from 'react';
import {
  calculateOrderMargin,
  isAvailableBalanceSufficient,
} from '../../utils/position.calculations';
import { getTPSLPrice } from '../../utils/position.validate';
import { formatDecimal } from '../../utils/position.formatters';

interface UseOpeningOrderActionsParams {
  accountId: string;
  ask: number | string;
  availableBalance: number;
  bid: number | string;
  canTrade: boolean;
  contractSize: number | string;
  getEntryPrice: (side: 0 | 1) => number | null;
  getLotAsNumber: () => number | null;
  isModifyOrder: boolean;
  isTPSLValidForSide: (side: 0 | 1) => boolean;
  leverage: number;
  limitStopPriceValue: number | null;
  lotText: string;
  maxTradeSize: number;
  minTradeSize: number;
  orderType: string;
  position?: any;
  rtBySymbol?: Record<string, any>;
  selectedSymbol: string;
  showError: (title: string, description: string) => void;
  showSuccess: (title: string, description: string) => void;
  stopLossText: string;
  stopLossValue: number | null;
  stopLossEnabled: boolean;
  stopLossTriggerType: TriggerTypeString;
  symbolAsset?: Asset;
  takeProfitText: string;
  takeProfitValue: number | null;
  takeProfitEnabled: boolean;
  takeProfitTriggerType: TriggerTypeString;
  t: (key: string, options?: Record<string, unknown>) => string;
  profitCurrency?: string;
  onNavigate: (path: string) => void;
  returnTab?: string;
}

const getOrderTypeCode = (orderType: string): 0 | 1 | 2 => {
  switch (orderType) {
    case OrderType.MARKET:
      return ORDER_TYPE_CODES.MARKET as 0;
    case OrderType.STOP:
      return ORDER_TYPE_CODES.STOP as 2;
    case OrderType.LIMIT:
      return ORDER_TYPE_CODES.LIMIT as 1;
    default:
      return ORDER_TYPE_CODES.MARKET as 0;
  }
};

const getOrderTypeLabel = (orderType: string, t: (key: string) => string): string => {
  switch (orderType) {
    case OrderType.MARKET:
      return t('openingOrder.orderTypeMarketExecution');
    case OrderType.LIMIT:
      return t('openingOrder.orderTypeLimit');
    case OrderType.STOP:
      return t('openingOrder.orderTypeStop');
    case OrderType.MODIFY:
      return t('openingOrder.orderTypeModifyPosition');
    default:
      return orderType;
  }
};

const getPositionPathByTab = (tab?: string): string => {
  if (!tab || tab === 'position' || tab === 'positionTab' || tab === 'positions') {
    return '/position';
  }

  if (tab === 'orders' || tab === 'orderTab') {
    return '/position?tab=orders';
  }

  if (tab === 'position-history') {
    return '/position?tab=position-history';
  }

  if (tab === 'order-history') {
    return '/position?tab=order-history';
  }

  return `/position?tab=${tab}`;
};

export const useOpeningOrderActions = ({
  accountId,
  ask,
  availableBalance,
  bid,
  canTrade,
  contractSize,
  getEntryPrice,
  getLotAsNumber,
  isModifyOrder,
  isTPSLValidForSide,
  leverage,
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
  stopLossValue,
  stopLossEnabled,
  stopLossTriggerType,
  symbolAsset,
  takeProfitText,
  takeProfitValue,
  takeProfitEnabled,
  takeProfitTriggerType,
  t,
  profitCurrency,
  onNavigate,
  returnTab,
}: UseOpeningOrderActionsParams) => {
  const [loadingModify, setLoadingModify] = useState(false);
  const [isClosingPosition, setIsClosingPosition] = useState(false);
  const { isPending: isCreatingOrder, mutateAsync: createOrder } = useCreateOrder();

  // Quantity used for margin calculation (from input)
  const inputLot = useMemo(() => {
    const parsed = Number(lotText);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [lotText]);

  // Mid price fallback
  const midPrice = useMemo(() => {
    const askDecimal = toDecimal(ask);
    const bidDecimal = toDecimal(bid);
    if (!askDecimal || !bidDecimal) return 0;
    if (askDecimal.lte(0) || bidDecimal.lte(0)) return 0;
    return askDecimal.plus(bidDecimal).div(2).toNumber();
  }, [ask, bid]);
  const contractSizeNumber = useMemo(() => Number(contractSize || 100), [contractSize]);

  // Required margin using mid price (for preview before selecting side)
  const requiredMargin = useMemo(() => {
    if (!inputLot || !midPrice) return 0;
    return calculateOrderMargin(
      inputLot,
      midPrice,
      selectedSymbol,
      leverage,
      contractSizeNumber,
      rtBySymbol,
      profitCurrency as string,
    );
  }, [inputLot, midPrice, selectedSymbol, leverage, contractSizeNumber, rtBySymbol]);

  // Required margin for existing position (modify flow)
  const requiredMarginForPosition = useMemo(() => {
    const qty = Number(lotText) || 0;
    const price = midPrice || getEntryPrice(1);
    if (!qty || !price) return 0;
    return calculateOrderMargin(
      qty,
      price,
      selectedSymbol,
      leverage,
      contractSizeNumber,
      rtBySymbol,
      profitCurrency as string,
    );
  }, [position, getEntryPrice, midPrice, selectedSymbol, leverage, contractSizeNumber, rtBySymbol]);

  const convertTriggerValue = (
    value: number | null,
    isTakeProfit: boolean,
    orderSide: 0 | 1,
    triggerType: TriggerTypeString,
  ): number | undefined => {
    if (!value || !symbolAsset) return undefined;

    const entryPrice = getEntryPrice(orderSide);
    if (entryPrice == null) return undefined;

    const convertedPrice = getTPSLPrice(
      value,
      isTakeProfit,
      orderSide,
      triggerType,
      entryPrice,
      symbolAsset,
    );

    return convertedPrice ?? undefined;
  };

  const handleModify = async () => {
    try {
      setLoadingModify(true);
      if (!canTrade) {
        showError(
          t('openingOrder.errors.connectionError'),
          t('openingOrder.errors.cannotModifyDisconnected'),
        );
        return;
      }
      if (!position) return;
      if (
        (takeProfitEnabled &&
          takeProfitTriggerType === TriggerType.CHANGE_PERCENT &&
          Number(takeProfitText) >= MAX_CHANGE_PERCENT_THRESHOLD) ||
        (stopLossEnabled &&
          stopLossTriggerType === TriggerType.CHANGE_PERCENT &&
          Number(stopLossText) >= MAX_CHANGE_PERCENT_THRESHOLD)
      ) {
        showError(t('openingOrder.errors.error'), t('openingOrder.errors.tpslPercentageLimit'));
        return;
      }

      const modifySide = position?.side === ORDER_SIDES.SELL ? ORDER_SIDES.SELL : ORDER_SIDES.BUY;
      const convertedTakeProfit = takeProfitEnabled
        ? convertTriggerValue(takeProfitValue, true, modifySide, takeProfitTriggerType)
        : undefined;
      const convertedStopLoss = stopLossEnabled
        ? convertTriggerValue(stopLossValue, false, modifySide, stopLossTriggerType)
        : undefined;

      const updateParams: any = {
        accountId: position.accountId || accountId,
      };
      if (convertedStopLoss != null && Number.isFinite(convertedStopLoss)) {
        updateParams.stopLossPrice = convertedStopLoss.toFixed(symbolAsset?.digit ?? 4);
      } else {
        updateParams.stopLossPrice = null;
      }
      if (convertedTakeProfit != null && Number.isFinite(convertedTakeProfit)) {
        updateParams.takeProfitPrice = convertedTakeProfit.toFixed(symbolAsset?.digit ?? 4);
      } else {
        updateParams.takeProfitPrice = null;
      }

      if (isModifyOrder && orderType === OrderType.MODIFY) {
        const orderUpdatePayload: {
          price?: string;
          stopLossPrice?: string | null;
          takeProfitPrice?: string | null;
        } = {
          stopLossPrice: updateParams.stopLossPrice,
          takeProfitPrice: updateParams.takeProfitPrice,
        };
        if (limitStopPriceValue != null && Number.isFinite(limitStopPriceValue)) {
          orderUpdatePayload.price = limitStopPriceValue.toFixed(symbolAsset?.digit ?? 4);
        }
        await updateOrderAPI(position.id, accountId, orderUpdatePayload as any);
        showSuccess(
          t('openingOrder.success.success'),
          t('openingOrder.errors.orderModifiedSuccess'),
        );
        onNavigate(getPositionPathByTab('orders'));
        return;
      }

      await updatePosition(position.id, updateParams);
      showSuccess(
        t('openingOrder.success.success'),
        t('openingOrder.errors.positionModifiedSuccess'),
      );
      onNavigate(getPositionPathByTab('positions'));
    } catch (error: any) {
      if (error.message.includes('last update')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
      } else {
        showError(
          t('openingOrder.errors.error'),
          error instanceof Error ? error.message : t('openingOrder.errors.failedModifyPosition'),
        );
      }
    } finally {
      setLoadingModify(false);
    }
  };

  const handleClosePosition = async (targetPosition: Position) => {
    const lotNum = getLotAsNumber();
    if (!canTrade) {
      showError(
        t('openingOrder.errors.connectionError'),
        t('openingOrder.errors.cannotCloseDisconnected'),
      );
      return;
    }
    if (!targetPosition && !lotNum && !symbolAsset?.minTradeSize) return;

    const positionQty = new Decimal(targetPosition.quantity);
    const lot = new Decimal(lotNum as number);
    const min = new Decimal(symbolAsset?.minTradeSize as string);

    const remaining = positionQty.minus(lot);
    if (remaining.gt(0) && remaining.lessThan(min)) {
      showError(
        t('openingOrder.errors.error'),
        t('openingOrder.errors.remainingPositionSizeAtLeast', { min: min.toString() }),
      );
      return;
    }

    if (lotNum && lotNum <= Number(targetPosition.quantity)) {
      setIsClosingPosition(true);
      try {
        await closePositions(targetPosition.id, targetPosition.accountId, lotNum);
        const targetTab = returnTab || 'positions';
        onNavigate(getPositionPathByTab(targetTab));
        showSuccess(
          t('openingOrder.success.positionClosed'),
          t('openingOrder.success.positionClosedSuccess'),
        );
      } catch (error: any) {
        if (error.message.includes('last update')) {
          showError(
            t('trade.errors.marketClosedTitle'),
            t('trade.errors.marketClosedForexMessage'),
          );
        } else {
          showError(
            t('openingOrder.errors.error'),
            error instanceof Error ? error.message : t('openingOrder.errors.errorClosingPosition'),
          );
        }
      } finally {
        setIsClosingPosition(false);
      }
    }
  };

  const handlePlaceOrder = async (side: 0 | 1) => {
    if (!canTrade) {
      showError(
        t('openingOrder.errors.connectionError'),
        t('openingOrder.errors.cannotPlaceOrderDisconnected'),
      );
      return;
    }
    if (isCreatingOrder) return;
    const entryPrice = getEntryPrice(side);
    if (entryPrice == null) {
      showError(t('openingOrder.errors.error'), t('openingOrder.errors.pleaseSetPrice'));
      return;
    }

    if (
      (takeProfitEnabled &&
        takeProfitTriggerType === TriggerType.CHANGE_PERCENT &&
        Number(takeProfitText) >= MAX_CHANGE_PERCENT_THRESHOLD) ||
      (stopLossEnabled &&
        stopLossTriggerType === TriggerType.CHANGE_PERCENT &&
        Number(stopLossText) >= MAX_CHANGE_PERCENT_THRESHOLD)
    ) {
      showError(t('openingOrder.errors.error'), t('openingOrder.errors.tpslPercentageLimit'));
      return;
    }

    if (!isTPSLValidForSide(side)) {
      showError(t('openingOrder.errors.error'), t('openingOrder.errors.tpslNotValid'));
      return;
    }

    const quantity = Number(lotText);
    if (!quantity || quantity <= 0) {
      showError(t('openingOrder.errors.error'), t('openingOrder.errors.lotMustBeGreaterThanZero'));
      return;
    }

    if (quantity > maxTradeSize || quantity < minTradeSize) {
      showError(
        t('openingOrder.errors.error'),
        t('openingOrder.errors.lotMustBeBetween', { min: minTradeSize, max: maxTradeSize }),
      );
      return;
    }

    if (orderType === OrderType.MARKET) {
      const requiredMargin = calculateOrderMargin(
        quantity,
        entryPrice,
        selectedSymbol,
        leverage,
        Number(contractSize),
        rtBySymbol,
        profitCurrency as string,
      );

      if (!isAvailableBalanceSufficient(availableBalance, requiredMargin)) {
        showError(
          t('openingOrder.errors.insufficientBalance'),
          t('openingOrder.errors.requiredMarginAndAvailableBalance', {
            requiredMargin: requiredMargin.toFixed(2),
            availableBalance: availableBalance.toFixed(2),
          }),
        );
        return;
      }
    }

    const convertedTakeProfit = takeProfitEnabled
      ? convertTriggerValue(takeProfitValue, true, side, takeProfitTriggerType)
      : undefined;
    const convertedStopLoss = stopLossEnabled
      ? convertTriggerValue(stopLossValue, false, side, stopLossTriggerType)
      : undefined;

    try {
      await createOrder({
        accountId,
        leverage,
        quantity,
        side,
        symbol: selectedSymbol,
        orderType: getOrderTypeCode(orderType),
        price: orderType !== OrderType.MARKET ? entryPrice : undefined,
        takeProfitPrice: convertedTakeProfit
          ? Number(convertedTakeProfit.toFixed(symbolAsset?.digit ?? 4))
          : undefined,
        stopLossPrice: convertedStopLoss
          ? Number(convertedStopLoss.toFixed(symbolAsset?.digit ?? 4))
          : undefined,
      });

      const orderSideText =
        side === ORDER_SIDES.BUY ? t('openingOrder.buy') : t('openingOrder.sell');
      const successMessage = t('openingOrder.success.orderPlacedMessage', {
        side: orderSideText,
        quantity: quantity.toString(),
        symbol: selectedSymbol,
        price: formatDecimal(entryPrice, '-', symbolAsset?.digit ?? 4),
        orderType: getOrderTypeLabel(orderType, t),
      });
      showSuccess(t('openingOrder.success.orderPlaced'), successMessage);

      const targetTab = orderType === OrderType.MARKET ? 'positions' : 'orders';
      onNavigate(getPositionPathByTab(targetTab));
    } catch (error: any) {
      if (error.message.includes('last update')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
      } else if (error.code.includes('price-not-found')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedMessage'));
      } else {
        showError(
          t('openingOrder.errors.errorPlacingOrder'),
          error instanceof Error ? error.message : t('openingOrder.errors.failedPlaceOrder'),
        );
      }
    }
  };

  return {
    handleClosePosition,
    handleModify,
    handlePlaceOrder,
    isClosingPosition,
    isCreatingOrder,
    loadingModify,
    requiredMargin,
    requiredMarginForPosition,
  };
};
