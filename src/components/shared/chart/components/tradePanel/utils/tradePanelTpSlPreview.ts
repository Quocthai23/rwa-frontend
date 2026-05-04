import { calcPnLUsd } from '@/components/featured/position/utils/position.calculations';
import { ORDER_SIDES } from '@/types/orders';
import type { Asset } from '@/types/assets';

import { TABS, convertTPSLToPrice } from './tradePanelUtils';
import type { TriggerType } from '../components/TradePanelTriggerSelect';

type RtBySymbol = NonNullable<Parameters<typeof calcPnLUsd>[0]['rtBySymbol']>;

export type TradePanelTpSlPreviewInput = {
  activeTab: (typeof TABS)[number];
  limitPriceNumber: number;
  takeProfitNumber: number | null;
  stopLossNumber: number | null;
  quantity: string;
  triggerType: TriggerType;
  transactionType: 'buy' | 'sell';
  buyPrice: number;
  sellPrice: number;
  rtAsk: number;
  rtBid: number;
  symbol: string;
  symbolAsset: Asset | undefined;
  rtBySymbol: RtBySymbol | null | undefined;
  contractSizeNumber: number;
};

export type TradePanelTpSlPreviewResult = {
  takeProfitTriggerPrice: number | null;
  stopLossTriggerPrice: number | null;
  buyTakeProfitPricePips: number | null;
  sellTakeProfitPricePips: number | null;
  buyStopLossPricePips: number | null;
  sellStopLossPricePips: number | null;
  buyTakeProfitPnLUsdPips: number | null;
  sellTakeProfitPnLUsdPips: number | null;
  buyStopLossPnLUsdPips: number | null;
  sellStopLossPnLUsdPips: number | null;
  buyTakeProfitPriceChange: number | null;
  sellTakeProfitPriceChange: number | null;
  buyStopLossPriceChange: number | null;
  sellStopLossPriceChange: number | null;
  buyTakeProfitPnLUsdChange: number | null;
  sellTakeProfitPnLUsdChange: number | null;
  buyStopLossPnLUsdChange: number | null;
  sellStopLossPnLUsdChange: number | null;
  buyTakeProfitPnLUsdPrice: number | null;
  sellTakeProfitPnLUsdPrice: number | null;
  buyStopLossPnLUsdPrice: number | null;
  sellStopLossPnLUsdPrice: number | null;
};

const previewPnLUsd = (params: {
  side: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];
  openPrice: number;
  targetPrice: number | null;
  lotNumber: number;
  symbol: string;
  rtBySymbol: RtBySymbol | null | undefined;
  contractSizeNumber: number;
  profitCurrency: string;
}) =>
  params.targetPrice != null
    ? calcPnLUsd({
        side: params.side,
        openPrice: params.openPrice,
        targetPrice: params.targetPrice,
        lotNumber: params.lotNumber,
        symbol: params.symbol,
        rtBySymbol: params.rtBySymbol as RtBySymbol,
        contractSize: params.contractSizeNumber,
        profitCurrency: params.profitCurrency,
      })
    : null;

export function computeTradePanelTpSlPreview(
  input: TradePanelTpSlPreviewInput,
): TradePanelTpSlPreviewResult {
  const {
    activeTab,
    limitPriceNumber,
    takeProfitNumber,
    stopLossNumber,
    quantity,
    triggerType,
    transactionType,
    buyPrice,
    sellPrice,
    rtAsk,
    rtBid,
    symbol,
    symbolAsset,
    rtBySymbol,
    contractSizeNumber,
  } = input;
  const previewOrderSide = transactionType === 'sell' ? ORDER_SIDES.SELL : ORDER_SIDES.BUY;
  const previewEntryPrice =
    activeTab === 'Market'
      ? (transactionType === 'sell' ? sellPrice : buyPrice) || 0
      : limitPriceNumber;

  const takeProfitTriggerPrice = convertTPSLToPrice(
    takeProfitNumber,
    true,
    previewOrderSide,
    triggerType,
    previewEntryPrice,
    symbolAsset,
  );
  const stopLossTriggerPrice = convertTPSLToPrice(
    stopLossNumber,
    false,
    previewOrderSide,
    triggerType,
    previewEntryPrice,
    symbolAsset,
  );

  const entryPriceBuyPreview = activeTab === 'Market' ? rtAsk : limitPriceNumber;
  const entryPriceSellPreview = activeTab === 'Market' ? rtBid : limitPriceNumber;
  const lotNumber = Number.parseFloat(quantity) || 0;

  const pnl = (
    side: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES],
    openPrice: number,
    targetPrice: number | null,
  ) =>
    previewPnLUsd({
      side,
      openPrice,
      targetPrice,
      lotNumber,
      symbol,
      rtBySymbol,
      contractSizeNumber,
      profitCurrency: symbolAsset?.profitCurrency as string,
    });

  let buyTakeProfitPricePips: number | null = null;
  let sellTakeProfitPricePips: number | null = null;
  let buyStopLossPricePips: number | null = null;
  let sellStopLossPricePips: number | null = null;
  if (triggerType === 'pips') {
    buyTakeProfitPricePips = convertTPSLToPrice(
      takeProfitNumber,
      true,
      ORDER_SIDES.BUY,
      'pips',
      entryPriceBuyPreview,
      symbolAsset,
    );
    sellTakeProfitPricePips = convertTPSLToPrice(
      takeProfitNumber,
      true,
      ORDER_SIDES.SELL,
      'pips',
      entryPriceSellPreview,
      symbolAsset,
    );
    buyStopLossPricePips = convertTPSLToPrice(
      stopLossNumber,
      false,
      ORDER_SIDES.BUY,
      'pips',
      entryPriceBuyPreview,
      symbolAsset,
    );
    sellStopLossPricePips = convertTPSLToPrice(
      stopLossNumber,
      false,
      ORDER_SIDES.SELL,
      'pips',
      entryPriceSellPreview,
      symbolAsset,
    );
  }

  let buyTakeProfitPriceChange: number | null = null;
  let sellTakeProfitPriceChange: number | null = null;
  let buyStopLossPriceChange: number | null = null;
  let sellStopLossPriceChange: number | null = null;
  if (triggerType === 'changePercent') {
    buyTakeProfitPriceChange = convertTPSLToPrice(
      takeProfitNumber,
      true,
      ORDER_SIDES.BUY,
      'changePercent',
      entryPriceBuyPreview,
      symbolAsset,
    );
    sellTakeProfitPriceChange = convertTPSLToPrice(
      takeProfitNumber,
      true,
      ORDER_SIDES.SELL,
      'changePercent',
      entryPriceSellPreview,
      symbolAsset,
    );
    buyStopLossPriceChange = convertTPSLToPrice(
      stopLossNumber,
      false,
      ORDER_SIDES.BUY,
      'changePercent',
      entryPriceBuyPreview,
      symbolAsset,
    );
    sellStopLossPriceChange = convertTPSLToPrice(
      stopLossNumber,
      false,
      ORDER_SIDES.SELL,
      'changePercent',
      entryPriceSellPreview,
      symbolAsset,
    );
  }

  return {
    takeProfitTriggerPrice,
    stopLossTriggerPrice,
    buyTakeProfitPricePips,
    sellTakeProfitPricePips,
    buyStopLossPricePips,
    sellStopLossPricePips,
    buyTakeProfitPnLUsdPips: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, buyTakeProfitPricePips),
    sellTakeProfitPnLUsdPips: pnl(ORDER_SIDES.SELL, entryPriceSellPreview, sellTakeProfitPricePips),
    buyStopLossPnLUsdPips: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, buyStopLossPricePips),
    sellStopLossPnLUsdPips: pnl(ORDER_SIDES.SELL, entryPriceSellPreview, sellStopLossPricePips),
    buyTakeProfitPriceChange,
    sellTakeProfitPriceChange,
    buyStopLossPriceChange,
    sellStopLossPriceChange,
    buyTakeProfitPnLUsdChange: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, buyTakeProfitPriceChange),
    sellTakeProfitPnLUsdChange: pnl(
      ORDER_SIDES.SELL,
      entryPriceSellPreview,
      sellTakeProfitPriceChange,
    ),
    buyStopLossPnLUsdChange: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, buyStopLossPriceChange),
    sellStopLossPnLUsdChange: pnl(ORDER_SIDES.SELL, entryPriceSellPreview, sellStopLossPriceChange),
    buyTakeProfitPnLUsdPrice: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, takeProfitTriggerPrice),
    sellTakeProfitPnLUsdPrice: pnl(ORDER_SIDES.SELL, entryPriceSellPreview, takeProfitTriggerPrice),
    buyStopLossPnLUsdPrice: pnl(ORDER_SIDES.BUY, entryPriceBuyPreview, stopLossTriggerPrice),
    sellStopLossPnLUsdPrice: pnl(ORDER_SIDES.SELL, entryPriceSellPreview, stopLossTriggerPrice),
  };
}
