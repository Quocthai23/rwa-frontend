import React from 'react';

import { useAssetById } from '@/hook/useAssets';
import { useTranslation } from 'react-i18next';
import { chooseContractSizeUnit } from '@/utils/chooseContractSizeUnit';

type InfoTabProps = {
  readonly assetId?: string;
};

function InfoTab({ assetId }: InfoTabProps) {
  const { t } = useTranslation();
  const { data: asset, isLoadingAssets: isLoading } = useAssetById(assetId);

  if (isLoading) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <div
          className="border-muted-foreground border-t-foreground h-6 w-6 animate-spin rounded-full border-2"
          aria-label={t('symbolDetail.loading')}
          role="status"
        />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <p className="text-body-medium text-muted-foreground">{t('symbolDetail.assetNotFound')}</p>
      </div>
    );
  }

  // Format volume per trade
  const volumePerTrade = `${asset.minTradeSize}-${asset.maxTradeSize} ${t('symbolDetail.units.lot')}`;

  // Format leverage
  const leverage = `${asset.maxLeverage}X`;

  // Format contract size
  const category =
    (asset as any).categoryCode || (asset as any).category?.code || (asset as any).category || '';
  const unit = chooseContractSizeUnit(category, asset.symbol || '', asset.marginCurrency || '');
  const contractSize = `${asset.contractSize} ${unit}`;

  // Format max volume
  const maxVolume = `${asset.maxTradeSize} ${t('symbolDetail.units.lot')}`;

  const baseCurrency =
    asset.symbol?.replace(asset.profitCurrency || '', '') || asset.marginCurrency;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const swapRatesDisplay = asset.swapRates
    ? Object.entries(asset.swapRates)
        .map(([day, rate]) => `${dayNames[parseInt(day)]}: ${rate}`)
        .join(', ')
    : '-';

  return (
    <div className="bg-background scrollbar-neutral-slim flex-1 overflow-y-auto">
      {/* Info Section */}
      <div className="py-4">
        <h2 className="text-h2-semibold mb-4">{t('symbolDetail.tabs.info')}</h2>
        <InfoRow label={t('symbolDetail.info.volumePerTrade')} value={volumePerTrade} />
        <InfoRow label={t('symbolDetail.info.maximumLeverage')} value={leverage} />
        <InfoRow label={t('symbolDetail.info.contractSize')} value={contractSize} />
        <InfoRow label={t('symbolDetail.info.baseCurrency')} value={baseCurrency} />
        <InfoRow label={t('symbolDetail.info.currencyOfQuote')} value={asset.profitCurrency} />
        <InfoRow label={t('symbolDetail.info.swapLong')} value={asset.swapLong} />
        <InfoRow label={t('symbolDetail.info.swapShort')} value={asset.swapShort} />
        <InfoRow label={t('symbolDetail.info.swapRates')} value={swapRatesDisplay} />
        <InfoRow label={t('symbolDetail.info.decimalPlaces')} value={asset.digit} />
        <InfoRow label={t('symbolDetail.info.spread')} value={asset.spread} />
      </div>

      {/* Corporate Actions Section */}
      <div className="py-4 pt-0">
        <p className="text-body-large-regular mb-3">{t('symbolDetail.info.corporateActions')}</p>

        {/* Action Item */}
        <div className="mb-4">
          {/* <Text className=' mb-2'>{formatPositionDateTime(asset.createdAt)}</Text> */}
          <div className="flex items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              {t('symbolDetail.info.indicesDividend')}
            </p>
            <p className="text-body-small-medium">
              {asset.profitCurrency} {asset.minTradeSize} / {t('symbolDetail.units.lot')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoTab;

// Info Row Component
function InfoRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: React.ReactNode | string;
}) {
  return (
    <div className="flex justify-between py-3">
      <p className="text-body-small-regular text-muted-foreground">{label}</p>
      <p className="text-body-small-semibold text-foreground max-w-[55%] text-right wrap-break-word whitespace-normal">
        {value}
      </p>
    </div>
  );
}
