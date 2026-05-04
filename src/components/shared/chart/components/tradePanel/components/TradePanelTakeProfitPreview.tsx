import type { TFunction } from 'i18next';

import type { TriggerType } from './TradePanelTriggerSelect';

type TradePanelTakeProfitPreviewProps = {
  t: TFunction;
  triggerType: TriggerType;
  formatAssetPrice: (value: number) => string;
  formatUsdPnL: (value: number) => string;
  takeProfitTriggerPrice: number | null;
  buyTakeProfitPnLUsdPrice: number | null;
  sellTakeProfitPnLUsdPrice: number | null;
  buyTakeProfitPricePips: number | null;
  sellTakeProfitPricePips: number | null;
  buyTakeProfitPnLUsdPips: number | null;
  sellTakeProfitPnLUsdPips: number | null;
  buyTakeProfitPnLUsdChange: number | null;
  sellTakeProfitPnLUsdChange: number | null;
  buyTakeProfitPriceChange: number | null;
  sellTakeProfitPriceChange: number | null;
};

export function TradePanelTakeProfitPreview({
  t,
  triggerType,
  formatAssetPrice,
  formatUsdPnL,
  takeProfitTriggerPrice,
  buyTakeProfitPnLUsdPrice,
  sellTakeProfitPnLUsdPrice,
  buyTakeProfitPricePips,
  sellTakeProfitPricePips,
  buyTakeProfitPnLUsdPips,
  sellTakeProfitPnLUsdPips,
  buyTakeProfitPnLUsdChange,
  sellTakeProfitPnLUsdChange,
  buyTakeProfitPriceChange,
  sellTakeProfitPriceChange,
}: TradePanelTakeProfitPreviewProps) {
  if (triggerType === 'price') {
    if (
      takeProfitTriggerPrice == null ||
      buyTakeProfitPnLUsdPrice == null ||
      sellTakeProfitPnLUsdPrice == null
    ) {
      return null;
    }
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buyTpLabel')} {formatAssetPrice(takeProfitTriggerPrice)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellTpLabel')} {formatAssetPrice(takeProfitTriggerPrice)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estTpLabel')} {formatUsdPnL(buyTakeProfitPnLUsdPrice)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estTpLabel')} {formatUsdPnL(sellTakeProfitPnLUsdPrice)}
          </span>
        </div>
      </div>
    );
  }

  if (triggerType === 'pips') {
    if (
      buyTakeProfitPricePips == null ||
      sellTakeProfitPricePips == null ||
      buyTakeProfitPnLUsdPips == null ||
      sellTakeProfitPnLUsdPips == null
    ) {
      return null;
    }
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buyTpLabel')} {formatAssetPrice(buyTakeProfitPricePips)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellTpLabel')} {formatAssetPrice(sellTakeProfitPricePips)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estTpLabel')} {formatUsdPnL(buyTakeProfitPnLUsdPips)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.estTpLabel')} {formatUsdPnL(sellTakeProfitPnLUsdPips)}
          </span>
        </div>
      </div>
    );
  }

  if (triggerType === 'changePercent') {
    if (
      buyTakeProfitPriceChange == null ||
      sellTakeProfitPriceChange == null ||
      buyTakeProfitPnLUsdChange == null ||
      sellTakeProfitPnLUsdChange == null
    ) {
      return null;
    }
    const estTpPrefix = t('trade.estTpLabel').replace(':', ' ~');
    return (
      <div className="border-border flex w-full items-center justify-between border-t py-2">
        <div className="flex w-[60%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.buyTpLabel')} {formatAssetPrice(buyTakeProfitPriceChange)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {t('trade.sellTpLabel')} {formatAssetPrice(sellTakeProfitPriceChange)}
          </span>
        </div>
        <div className="flex w-[40%] flex-col items-start gap-2">
          <span className="text-caption-regular text-muted-foreground">
            {estTpPrefix} {formatUsdPnL(buyTakeProfitPnLUsdChange)}
          </span>
          <span className="text-caption-regular text-muted-foreground">
            {estTpPrefix} {formatUsdPnL(sellTakeProfitPnLUsdChange)}
          </span>
        </div>
      </div>
    );
  }

  if (takeProfitTriggerPrice == null) return null;
  return (
    <span className="text-body-small-regular text-muted-foreground">
      {t('trade.priceTriggerLabel')} {formatAssetPrice(takeProfitTriggerPrice)}
    </span>
  );
}
