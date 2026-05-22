import { TABS } from './tradePanelUtils';
import { toFiniteNumberFromNumberish } from './tradePanelInputHelpers';
import { TriggerType } from './tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

export type TradePanelLimitStopFlagsInput = {
  activeTab: (typeof TABS)[number];
  limitPriceNumber: number;
  rtAsk: DecimalValue;
  rtBid: DecimalValue;
  takeProfitNumber: number | null;
  stopLossNumber: number | null;
  triggerType: TriggerType;
};

export type TradePanelLimitStopFlagsResult = {
  isBuyLimitInvalid: boolean;
  isSellLimitInvalid: boolean;
};

export function computeTradePanelLimitStopFlags(
  input: TradePanelLimitStopFlagsInput,
): TradePanelLimitStopFlagsResult {
  const {
    activeTab,
    limitPriceNumber,
    rtAsk,
    rtBid,
    takeProfitNumber,
    stopLossNumber,
    triggerType,
  } = input;

  const rtAskN = toFiniteNumberFromNumberish(rtAsk) ?? 0;
  const rtBidN = toFiniteNumberFromNumberish(rtBid) ?? 0;

  let isBuyLimitInvalid = false;
  if (activeTab === 'Limit') {
    if (!limitPriceNumber || !Number.isFinite(limitPriceNumber)) isBuyLimitInvalid = true;
    else if (rtAskN > 0 && !(limitPriceNumber < rtAskN)) isBuyLimitInvalid = true;
    else if (triggerType === 'price') {
      if (takeProfitNumber != null && !(takeProfitNumber > limitPriceNumber))
        isBuyLimitInvalid = true;
      if (stopLossNumber != null && !(stopLossNumber < limitPriceNumber)) isBuyLimitInvalid = true;
    }
  }

  let isSellLimitInvalid = false;
  if (activeTab === 'Limit') {
    if (!limitPriceNumber || !Number.isFinite(limitPriceNumber)) isSellLimitInvalid = true;
    else if (rtBidN > 0 && !(limitPriceNumber > rtBidN)) isSellLimitInvalid = true;
    else if (triggerType === 'price') {
      if (takeProfitNumber != null && !(takeProfitNumber < limitPriceNumber))
        isSellLimitInvalid = true;
      if (stopLossNumber != null && !(stopLossNumber > limitPriceNumber)) isSellLimitInvalid = true;
    }
  }

  return {
    isBuyLimitInvalid,
    isSellLimitInvalid,
  };
}
