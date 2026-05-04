import type { TFunction } from 'i18next';

import type { TriggerType } from './TradePanelTriggerSelect';

type TradePanelStopLossPreviewProps = {
  t: TFunction;
  triggerType: TriggerType;
  formatAssetPrice: (value: number) => string;
  formatUsdPnL: (value: number) => string;
  stopLossTriggerPrice: number | null;
  buyStopLossPnLUsdPrice: number | null;
  sellStopLossPnLUsdPrice: number | null;
  buyStopLossPricePips: number | null;
  sellStopLossPricePips: number | null;
  buyStopLossPnLUsdPips: number | null;
  sellStopLossPnLUsdPips: number | null;
  buyStopLossPnLUsdChange: number | null;
  sellStopLossPnLUsdChange: number | null;
  buyStopLossPriceChange: number | null;
  sellStopLossPriceChange: number | null;
};

export function TradePanelStopLossPreview({
  t,
  triggerType,
  formatAssetPrice,
  formatUsdPnL,
  stopLossTriggerPrice,
  buyStopLossPnLUsdPrice,
  sellStopLossPnLUsdPrice,
  buyStopLossPricePips,
  sellStopLossPricePips,
  buyStopLossPnLUsdPips,
  sellStopLossPnLUsdPips,
  buyStopLossPnLUsdChange,
  sellStopLossPnLUsdChange,
  buyStopLossPriceChange,
  sellStopLossPriceChange,
}: TradePanelStopLossPreviewProps) {
  if (triggerType === 'price') {
    if (
      stopLossTriggerPrice == null ||
      buyStopLossPnLUsdPrice == null ||
      sellStopLossPnLUsdPrice == null
    ) {
      return null;
    }
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buySlLabel')} {formatAssetPrice(stopLossTriggerPrice)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellSlLabel')} {formatAssetPrice(stopLossTriggerPrice)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estSlLabel')} {formatUsdPnL(buyStopLossPnLUsdPrice)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estSlLabel')} {formatUsdPnL(sellStopLossPnLUsdPrice)}
          </span>
        </div>
      </div>
    );
  }

  if (triggerType === 'pips') {
    if (
      buyStopLossPricePips == null ||
      sellStopLossPricePips == null ||
      buyStopLossPnLUsdPips == null ||
      sellStopLossPnLUsdPips == null
    ) {
      return null;
    }
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buySlLabel')} {formatAssetPrice(buyStopLossPricePips)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellSlLabel')} {formatAssetPrice(sellStopLossPricePips)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estSlLabel')} {formatUsdPnL(buyStopLossPnLUsdPips)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estSlLabel')} {formatUsdPnL(sellStopLossPnLUsdPips)}
          </span>
        </div>
      </div>
    );
  }

  if (triggerType === 'changePercent') {
    if (
      buyStopLossPriceChange == null ||
      sellStopLossPriceChange == null ||
      buyStopLossPnLUsdChange == null ||
      sellStopLossPnLUsdChange == null
    ) {
      return null;
    }
    const estSlPrefix = t('trade.estSlLabel').replace(':value', '');
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buySlLabel')} {formatAssetPrice(buyStopLossPriceChange)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellSlLabel')} {formatAssetPrice(sellStopLossPriceChange)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {estSlPrefix} {formatUsdPnL(buyStopLossPnLUsdChange)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {estSlPrefix} {formatUsdPnL(sellStopLossPnLUsdChange)}
          </span>
        </div>
      </div>
    );
  }

  if (stopLossTriggerPrice == null) return null;
  return (
    <span className="text-body-small-regular text-muted-foreground">
      {t('trade.priceTriggerLabel')} {formatAssetPrice(stopLossTriggerPrice)}
    </span>
  );
}
