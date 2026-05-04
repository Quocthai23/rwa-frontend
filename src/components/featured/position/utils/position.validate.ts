import { Asset, OrderType } from '@/types';
import { TriggerType } from '@/types/openingOrder';
import { OrderSide } from '@/types/orders';
import { toDecimal } from '@/utils/decimal';

export const validateTPSL = (
  side: OrderSide,
  entryPrice: number,
  bid: number | string,
  ask: number | string,
  tp: number | null,
  sl: number | null,
  orderType: string = OrderType.MARKET,
  tpTriggerType: string,
  slTriggerType: string,
  symbolAsset: Asset | undefined,
  isModifyOrder: boolean = false,
) => {
  const askDecimal = toDecimal(ask);
  const bidDecimal = toDecimal(bid);
  const entryDecimal = toDecimal(entryPrice);

  if (
    !symbolAsset ||
    !askDecimal ||
    !bidDecimal ||
    !entryDecimal ||
    askDecimal.lte(0) ||
    bidDecimal.lte(0)
  ) {
    return false;
  }
  const tpPrice = toDecimal(getTPSLPrice(tp, true, side, tpTriggerType, entryPrice, symbolAsset));
  const slPrice = toDecimal(getTPSLPrice(sl, false, side, slTriggerType, entryPrice, symbolAsset));
  const isBuy = side === OrderSide.BUY;

  // ================= MODIFY POSITION =================
  if (orderType === OrderType.MODIFY && !isModifyOrder) {
    if (tpPrice) {
      if (isBuy && tpPrice.lte(askDecimal)) return false;
      if (!isBuy && tpPrice.gte(bidDecimal)) return false;
    }

    if (slPrice) {
      if (isBuy && slPrice.gte(bidDecimal)) return false;
      if (!isBuy && slPrice.lte(askDecimal)) return false;
    }

    return true;
  }

  // ================= tpPrice / SL COMMON =================
  if (tpPrice) {
    if (isBuy && tpPrice.lte(entryDecimal)) return false;
    if (!isBuy && tpPrice.gte(entryDecimal)) return false;
  }

  if (slPrice) {
    if (isBuy && slPrice.gte(entryDecimal)) return false;
    if (!isBuy && slPrice.lte(entryDecimal)) return false;
  }

  // ================= ORDER TYPE =================
  if (orderType === OrderType.LIMIT) {
    if (isBuy && entryDecimal.gte(askDecimal)) return false;
    if (!isBuy && entryDecimal.lte(bidDecimal)) return false;
  }

  if (orderType === OrderType.STOP) {
    if (isBuy && entryDecimal.lte(askDecimal)) return false;
    if (!isBuy && entryDecimal.gte(bidDecimal)) return false;
  }

  return true;
};
export const getTPSLPrice = (
  value: number | null,
  isTP: boolean,
  side: OrderSide,
  triggerType: string,
  entry: number,
  symbol: Asset,
) => {
  if (!value) return null;

  if (triggerType === TriggerType.PRICE) return value;

  const isPositive = (side === OrderSide.BUY && isTP) || (side === OrderSide.SELL && !isTP);
  const factor = isPositive ? 1 : -1;

  if (triggerType === TriggerType.CHANGE_PERCENT) {
    return entry + (entry * value * factor) / 100;
  }

  if (triggerType === TriggerType.PIPS) {
    return entry + parseFloat(symbol.pipSize as string) * value * factor;
  }

  return value;
};
