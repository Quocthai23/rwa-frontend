import type { Asset } from '@/types/assets';
import { ORDER_SIDES } from '@/types/orders';

// RWA backend only supports Market and Limit orders (Stop orders deprecated)
export const TABS = ['Market', 'Limit'] as const;

export const convertTPSLToPrice = (
  value: number | null | undefined,
  isTakeProfit: boolean,
  side: 0 | 1 | 'BUY' | 'SELL',
  triggerType: string,
  entryPrice: number,
  symbolAsset: Asset | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;

  const basePrice = entryPrice;
  const numericSide = side === 'BUY' ? 0 : side === 'SELL' ? 1 : side;

  if (triggerType === 'price') {
    return value > 0 ? value : null;
  }

  if (triggerType === 'changePercent') {
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
    if ((numericSide === 0 && isTakeProfit) || (numericSide === 1 && !isTakeProfit)) {
      return basePrice + (basePrice * value) / 100;
    }
    return basePrice - (basePrice * value) / 100;
  }

  if (triggerType === 'pips') {
    if (!symbolAsset) return null;
    const pipValue = parseFloat(symbolAsset.pipSize as string);
    if (!Number.isFinite(pipValue) || pipValue <= 0) return null;
    if (!Number.isFinite(basePrice) || basePrice <= 0) return null;
    if ((numericSide === 0 && isTakeProfit) || (numericSide === 1 && !isTakeProfit)) {
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
  side: 0 | 1 | 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
}): string | null => {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) return 'Invalid entry price.';

  const isBuy = side === 0 || side === 'BUY';
  const isSell = side === 1 || side === 'SELL';

  if (takeProfitPrice != null) {
    if (!Number.isFinite(takeProfitPrice) || takeProfitPrice <= 0) {
      return 'Take profit price must be greater than 0.';
    }

    if (isBuy && !(takeProfitPrice > entryPrice)) {
      return 'Take profit price must be above entry price for BUY orders.';
    }

    if (isSell && !(takeProfitPrice < entryPrice)) {
      return 'Take profit price must be below entry price for SELL orders.';
    }
  }

  if (stopLossPrice != null) {
    if (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0) {
      return 'Stop loss price must be greater than 0.';
    }

    if (isBuy && !(stopLossPrice < entryPrice)) {
      return 'Stop loss price must be below entry price for BUY orders.';
    }

    if (isSell && !(stopLossPrice > entryPrice)) {
      return 'Stop loss price must be above entry price for SELL orders.';
    }
  }

  return null;
};
