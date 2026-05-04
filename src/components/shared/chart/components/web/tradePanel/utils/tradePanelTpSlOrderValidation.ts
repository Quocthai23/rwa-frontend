import { ORDER_SIDES } from '@/types/orders';
import type { Asset } from '@/types/assets';

import { TABS, convertTPSLToPrice, validateTpSlDirection } from './tradePanelUtils';
import { toFiniteNumberFromNumberish } from './tradePanelInputHelpers';
import type { TriggerType } from '../components/TradePanelTriggerSelect';
import type { DecimalValue } from '@/types/decimal';

export type TradePanelTpSlOrderValidationInput = {
  activeTab: (typeof TABS)[number];
  buyPrice: DecimalValue;
  sellPrice: DecimalValue;
  limitPriceNumber: number;
  takeProfitNumber: number | null;
  stopLossNumber: number | null;
  triggerType: TriggerType;
  symbolAsset: Asset | undefined;
};

export type TradePanelTpSlOrderValidationResult = {
  entryPriceForBuy: number;
  entryPriceForSell: number;
  buyTakeProfitOrderPrice: number | null;
  buyStopLossOrderPrice: number | null;
  sellTakeProfitOrderPrice: number | null;
  sellStopLossOrderPrice: number | null;
  buyTpSlError: string | null;
  sellTpSlError: string | null;
};

export function computeTradePanelTpSlOrderValidation(
  input: TradePanelTpSlOrderValidationInput,
): TradePanelTpSlOrderValidationResult {
  const {
    activeTab,
    buyPrice,
    sellPrice,
    limitPriceNumber,
    takeProfitNumber,
    stopLossNumber,
    triggerType,
    symbolAsset,
  } = input;

  const buyPriceN = toFiniteNumberFromNumberish(buyPrice) ?? 0;
  const sellPriceN = toFiniteNumberFromNumberish(sellPrice) ?? 0;
  const entryPriceForBuy = activeTab === 'Market' ? buyPriceN : limitPriceNumber;
  const entryPriceForSell = activeTab === 'Market' ? sellPriceN : limitPriceNumber;

  const buyTakeProfitOrderPrice = convertTPSLToPrice(
    takeProfitNumber,
    true,
    ORDER_SIDES.BUY,
    triggerType,
    entryPriceForBuy,
    symbolAsset,
  );
  const buyStopLossOrderPrice = convertTPSLToPrice(
    stopLossNumber,
    false,
    ORDER_SIDES.BUY,
    triggerType,
    entryPriceForBuy,
    symbolAsset,
  );
  const sellTakeProfitOrderPrice = convertTPSLToPrice(
    takeProfitNumber,
    true,
    ORDER_SIDES.SELL,
    triggerType,
    entryPriceForSell,
    symbolAsset,
  );
  const sellStopLossOrderPrice = convertTPSLToPrice(
    stopLossNumber,
    false,
    ORDER_SIDES.SELL,
    triggerType,
    entryPriceForSell,
    symbolAsset,
  );

  const buyTpSlError = validateTpSlDirection({
    side: ORDER_SIDES.BUY,
    entryPrice: entryPriceForBuy,
    takeProfitPrice: buyTakeProfitOrderPrice,
    stopLossPrice: buyStopLossOrderPrice,
  });

  const sellTpSlError = validateTpSlDirection({
    side: ORDER_SIDES.SELL,
    entryPrice: entryPriceForSell,
    takeProfitPrice: sellTakeProfitOrderPrice,
    stopLossPrice: sellStopLossOrderPrice,
  });

  return {
    entryPriceForBuy,
    entryPriceForSell,
    buyTakeProfitOrderPrice,
    buyStopLossOrderPrice,
    sellTakeProfitOrderPrice,
    sellStopLossOrderPrice,
    buyTpSlError,
    sellTpSlError,
  };
}
