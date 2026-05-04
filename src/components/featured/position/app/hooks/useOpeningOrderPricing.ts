import { useCallback, useMemo } from 'react';
import { ORDER_SIDES } from '@/types/orders';
import { OrderType } from '@/types/orders';
import { TriggerType, type TriggerTypeString } from '@/types/openingOrder';
import type { Asset } from '@/types/assets';
import { calcPnLUsd } from '../../utils/position.calculations';
import { getTPSLPrice } from '../../utils/position.validate';
import { toNullableNumber } from '../../utils/openingOrder.utils';
import { toDecimal } from '@/utils/decimal';

interface UseOpeningOrderPricingParams {
  ask: number;
  bid: number;
  contractSize: string | number;
  isModifyOrder: boolean;
  lotText: string;
  limitStopPriceText: string;
  orderType: string;
  position?: any;
  rtBySymbol?: Record<string, any>;
  selectedSymbol: string;
  stopLossText: string;
  symbolAsset?: Asset;
  takeProfitText: string;
  takeProfitTriggerType: TriggerTypeString;
  stopLossTriggerType: TriggerTypeString;
}

export const useOpeningOrderPricing = ({
  ask,
  bid,
  contractSize,
  isModifyOrder,
  lotText,
  limitStopPriceText,
  orderType,
  position,
  rtBySymbol,
  selectedSymbol,
  stopLossText,
  symbolAsset,
  takeProfitText,
  takeProfitTriggerType,
  stopLossTriggerType,
}: UseOpeningOrderPricingParams) => {
  const safeRtBySymbol = rtBySymbol ?? {};
  const takeProfitValue = toNullableNumber(takeProfitText);
  const stopLossValue = toNullableNumber(stopLossText);

  const limitStopPriceValue = useMemo(
    () => toNullableNumber(limitStopPriceText),
    [limitStopPriceText],
  );

  const getEntryPrice = useCallback(
    (side: 0 | 1): number | null => {
      if (orderType === OrderType.MARKET) {
        return side === ORDER_SIDES.BUY ? ask : bid;
      }

      if (orderType === OrderType.MODIFY && !isModifyOrder) {
        const modifyPrice = Number.parseFloat(position?.openPrice ?? position?.price ?? '');
        return Number.isFinite(modifyPrice) ? modifyPrice : null;
      }

      if (orderType === OrderType.MODIFY && isModifyOrder) {
        const modifyPrice = Number.parseFloat(limitStopPriceText ?? position?.price ?? '');
        return Number.isFinite(modifyPrice) ? modifyPrice : null;
      }

      return limitStopPriceValue;
    },
    [ask, bid, isModifyOrder, limitStopPriceText, limitStopPriceValue, orderType, position],
  );

  const canShowDualPreview =
    orderType === OrderType.MARKET ||
    orderType === OrderType.MODIFY ||
    ((orderType === OrderType.LIMIT || orderType === OrderType.STOP) &&
      limitStopPriceValue != null);

  const takeProfitDualPreview = useMemo(() => {
    if (!canShowDualPreview || takeProfitValue == null || !symbolAsset) return null;

    const buyEntryPrice = getEntryPrice(ORDER_SIDES.BUY);
    const sellEntryPrice = getEntryPrice(ORDER_SIDES.SELL);
    if (buyEntryPrice == null || sellEntryPrice == null) return null;

    return {
      buy: getTPSLPrice(
        takeProfitValue,
        true,
        ORDER_SIDES.BUY,
        takeProfitTriggerType,
        buyEntryPrice,
        symbolAsset,
      ),
      sell: getTPSLPrice(
        takeProfitValue,
        true,
        ORDER_SIDES.SELL,
        takeProfitTriggerType,
        sellEntryPrice,
        symbolAsset,
      ),
    };
  }, [canShowDualPreview, getEntryPrice, symbolAsset, takeProfitTriggerType, takeProfitValue]);

  const stopLossDualPreview = useMemo(() => {
    if (!canShowDualPreview || stopLossValue == null || !symbolAsset) return null;

    const buyEntryPrice = getEntryPrice(ORDER_SIDES.BUY);
    const sellEntryPrice = getEntryPrice(ORDER_SIDES.SELL);
    if (buyEntryPrice == null || sellEntryPrice == null) return null;

    return {
      buy: getTPSLPrice(
        stopLossValue,
        false,
        ORDER_SIDES.BUY,
        stopLossTriggerType,
        buyEntryPrice,
        symbolAsset,
      ),
      sell: getTPSLPrice(
        stopLossValue,
        false,
        ORDER_SIDES.SELL,
        stopLossTriggerType,
        sellEntryPrice,
        symbolAsset,
      ),
    };
  }, [canShowDualPreview, getEntryPrice, stopLossTriggerType, stopLossValue, symbolAsset]);

  const isModifyType = orderType === OrderType.MODIFY;

  const takeProfitModifyPreview = useMemo(() => {
    if (!isModifyType || takeProfitValue == null || !symbolAsset) {
      return null;
    }

    const modifySide = position?.side === ORDER_SIDES.SELL ? ORDER_SIDES.SELL : ORDER_SIDES.BUY;
    const entryPrice = getEntryPrice(modifySide);
    if (entryPrice == null) return null;

    return getTPSLPrice(
      takeProfitValue,
      true,
      modifySide,
      takeProfitTriggerType,
      entryPrice,
      symbolAsset,
    );
  }, [
    getEntryPrice,
    isModifyType,
    position?.side,
    symbolAsset,
    takeProfitTriggerType,
    takeProfitValue,
  ]);

  const stopLossModifyPreview = useMemo(() => {
    if (!isModifyType || stopLossValue == null || !symbolAsset) {
      return null;
    }

    const modifySide = position?.side === ORDER_SIDES.SELL ? ORDER_SIDES.SELL : ORDER_SIDES.BUY;
    const entryPrice = getEntryPrice(modifySide);
    if (entryPrice == null) return null;

    return getTPSLPrice(
      stopLossValue,
      false,
      modifySide,
      stopLossTriggerType,
      entryPrice,
      symbolAsset,
    );
  }, [
    getEntryPrice,
    isModifyType,
    position?.side,
    stopLossTriggerType,
    stopLossValue,
    symbolAsset,
  ]);

  const estimatedQuantity = useMemo(() => {
    const lotParsed = Number.parseFloat(lotText);
    if (Number.isFinite(lotParsed) && lotParsed > 0) {
      return lotParsed;
    }

    const positionQtyParsed = Number.parseFloat(position?.quantity ?? '');
    return Number.isFinite(positionQtyParsed) && positionQtyParsed > 0 ? positionQtyParsed : null;
  }, [lotText, position?.quantity]);

  const estimatePnlPreview = useMemo(() => {
    if (estimatedQuantity == null || !symbolAsset) {
      return null;
    }

    const buyEntryPrice = getEntryPrice(ORDER_SIDES.BUY);
    const sellEntryPrice = getEntryPrice(ORDER_SIDES.SELL);
    const buyEntryDecimal = toDecimal(buyEntryPrice);
    const sellEntryDecimal = toDecimal(sellEntryPrice);
    if (
      !buyEntryDecimal ||
      !sellEntryDecimal ||
      buyEntryDecimal.lte(0) ||
      sellEntryDecimal.lte(0)
    ) {
      return null;
    }

    const safeBuyEntryPrice = buyEntryDecimal.toNumber();
    const safeSellEntryPrice = sellEntryDecimal.toNumber();

    const safeContractSize = Number(symbolAsset?.contractSize ?? contractSize ?? 100);

    const getSideEstimate = (
      isTakeProfit: boolean,
      side: 0 | 1,
      entryPrice: number,
      value: number | null,
    ): number | null => {
      if (value == null) return null;

      const targetPrice = getTPSLPrice(
        value,
        isTakeProfit,
        side,
        isTakeProfit ? takeProfitTriggerType : stopLossTriggerType,
        entryPrice,
        symbolAsset,
      );

      const targetDecimal = toDecimal(targetPrice as any);
      if (!targetDecimal || targetDecimal.lte(0)) {
        return null;
      }

      return (
        calcPnLUsd({
          side,
          openPrice: entryPrice,
          targetPrice: targetDecimal.toNumber(),
          lotNumber: estimatedQuantity,
          symbol: selectedSymbol,
          rtBySymbol: safeRtBySymbol,
          contractSize: safeContractSize,
          profitCurrency: symbolAsset.profitCurrency as string,
        }) ?? null
      );
    };

    return {
      takeProfit: {
        buy: getSideEstimate(true, ORDER_SIDES.BUY, safeBuyEntryPrice, takeProfitValue),
        sell: getSideEstimate(true, ORDER_SIDES.SELL, safeSellEntryPrice, takeProfitValue),
      },
      stopLoss: {
        buy: getSideEstimate(false, ORDER_SIDES.BUY, safeBuyEntryPrice, stopLossValue),
        sell: getSideEstimate(false, ORDER_SIDES.SELL, safeSellEntryPrice, stopLossValue),
      },
    };
  }, [
    contractSize,
    estimatedQuantity,
    getEntryPrice,
    safeRtBySymbol,
    selectedSymbol,
    stopLossValue,
    symbolAsset,
    stopLossTriggerType,
    takeProfitValue,
    takeProfitTriggerType,
  ]);

  const formatPreviewPrice = useCallback(
    (value: number | null) => {
      if (value == null || !Number.isFinite(value)) return '--';
      const digits = symbolAsset?.digit ?? 4;
      return value.toFixed(digits);
    },
    [symbolAsset],
  );

  const formatPreviewPnL = useCallback((value: number | null) => {
    if (value == null || !Number.isFinite(value)) return '--';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
  }, []);

  const shouldShowComputedPricePreview =
    takeProfitTriggerType !== TriggerType.PRICE || stopLossTriggerType !== TriggerType.PRICE;

  return {
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
  };
};
