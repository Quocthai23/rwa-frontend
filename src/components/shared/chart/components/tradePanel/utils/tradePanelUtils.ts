import { ORDER_SIDES } from '@/types/orders';
import type { Asset } from '@/types/assets';

export const TABS = ['Market', 'Limit', 'Stop'] as const;

export const convertTPSLToPrice = (
  value: number | null | undefined,
  isTakeProfit: boolean,
  side: 0 | 1,
  triggerType: string,
  entryPrice: number,
  symbolAsset: Asset | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;

  const basePrice = entryPrice;

  if (triggerType === 'price') {
    return value > 0 ? value : null;
  }

  if (triggerType === 'changePercent') {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
    if ((side === 0 && isTakeProfit) || (side === 1 && !isTakeProfit)) {
      return basePrice + (basePrice * value) / 100;
    }
    return basePrice - (basePrice * value) / 100;
  }

  if (triggerType === 'pips') {
    if (!symbolAsset) return null;
    const pipValue = parseFloat(symbolAsset.pipSize as string);
    if (!Number.isFinite(pipValue) || pipValue <= 0) return null;
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
    if ((side === 0 && isTakeProfit) || (side === 1 && !isTakeProfit)) {
      return basePrice + pipValue * value;
    }
    return basePrice - pipValue * value;
  }

  return value;
};

export const validateTpSlDirection = ({
  side,
  entryPrice,
  takeProfitPrice,
  stopLossPrice,
}: {
  side: 0 | 1;
  entryPrice: number;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
}): string | null => {
  const hasTpOrSl = takeProfitPrice != null || stopLossPrice != null;
  if (!hasTpOrSl) return null;

  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return 'Invalid entry price.';

  if (takeProfitPrice != null) {
    if (!Number.isFinite(takeProfitPrice) || takeProfitPrice <= 0) {
      return 'Take profit price must be greater than 0.';
    }

    if (side === ORDER_SIDES.BUY && !(takeProfitPrice > entryPrice)) {
      return 'Take profit price must be above entry price for BUY orders.';
    }

    if (side === ORDER_SIDES.SELL && !(takeProfitPrice < entryPrice)) {
      return 'Take profit price must be below entry price for SELL orders.';
    }
  }

  if (stopLossPrice != null) {
    if (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0) {
      return 'Stop loss price must be greater than 0.';
    }

    if (side === ORDER_SIDES.BUY && !(stopLossPrice < entryPrice)) {
      return 'Stop loss price must be below entry price for BUY orders.';
    }

    if (side === ORDER_SIDES.SELL && !(stopLossPrice > entryPrice)) {
      return 'Stop loss price must be above entry price for SELL orders.';
    }
  }

  return null;
};
