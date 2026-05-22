import { TABS } from './tradePanelUtils';
import { TriggerType } from './tradePanelInputHelpers';

export type TradePanelLimitStopFlagsInput = {
  activeTab: (typeof TABS)[number];
  limitPriceNumber: number;
  rtAsk: number;
  rtBid: number;
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

  let isBuyLimitInvalid = false;
  if (activeTab === 'Limit') {
    if (!limitPriceNumber || !Number.isFinite(limitPriceNumber)) isBuyLimitInvalid = true;
    else if (rtAsk > 0 && !(limitPriceNumber < rtAsk)) isBuyLimitInvalid = true;
    else if (triggerType === 'price') {
      if (takeProfitNumber != null && !(takeProfitNumber > limitPriceNumber))
        isBuyLimitInvalid = true;
      if (stopLossNumber != null && !(stopLossNumber < limitPriceNumber)) isBuyLimitInvalid = true;
    }
  }

  let isSellLimitInvalid = false;
  if (activeTab === 'Limit') {
    if (!limitPriceNumber || !Number.isFinite(limitPriceNumber)) isSellLimitInvalid = true;
    else if (rtBid > 0 && !(limitPriceNumber > rtBid)) isSellLimitInvalid = true;
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
