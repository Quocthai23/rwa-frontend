import React from 'react';

import { useAssetById } from '@/hook/useAssets';
import { useTranslation } from 'react-i18next';
import { useReferencePrice } from '@/hook/useReferencePrice';
import { useValuationHistory } from '@/hook/useValuationHistory';

type InfoTabProps = {
  readonly assetId?: string;
};

function InfoTab({ assetId }: InfoTabProps) {
  const { t } = useTranslation();
  const { data: asset, isLoadingAssets: isLoading } = useAssetById(assetId);
  const { data: referencePriceData } = useReferencePrice({ assetId: assetId || '', enabled: !!assetId });
  const { data: valuationHistoryData } = useValuationHistory({ assetId: assetId || '', limit: 5, enabled: !!assetId });

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

  // Format area
  const areaDisplay = asset.area ? `${asset.area} sqm` : '-';

  return (
    <div className="bg-background flex-1 overflow-y-auto">
      {/* Info Section */}
      <div className="px-4 py-4">
        <h2 className="text-h2-semibold mb-4">{t('symbolDetail.tabs.info')}</h2>

        {/* Description */}
        {/* <p className="text-body-small-regular">{t('symbolDetail.info.description')}</p> */}

        {/* Info Rows */}
        <InfoRow label="Location" value={asset.location || '-'} />
        <InfoRow label="Total Area" value={areaDisplay} />
        <InfoRow label="Zoning / Planning" value={asset.zoning || '-'} />
        <InfoRow label="Business Model" value={asset.businessModel || '-'} />
        <InfoRow label="Monthly Benefits" value={asset.monthlyBenefits || '-'} />
        {referencePriceData && (
          <InfoRow
            label="Reference Price (NAV)"
            value={referencePriceData?.referencePrice ? String(referencePriceData.referencePrice) : referencePriceData?.marketPrice ? String(referencePriceData.marketPrice) : '-'}
          />
        )}
      </div>

      {valuationHistoryData && Array.isArray(valuationHistoryData?.data) && valuationHistoryData.data.length > 0 && (
        <div className="px-4 py-4 pt-0">
          <p className="text-body-large-regular mb-3">Valuation History</p>
          {valuationHistoryData.data.slice(0, 3).map((item: any, idx: number) => (
            <div key={idx} className="mb-4 flex items-center justify-between">
              <p className="text-muted-foreground">{item.date || item.timestamp}</p>
              <p className="">{item.value || item.price}</p>
            </div>
          ))}
        </div>
      )}

      {/* Corporate Actions Section */}
      <div className="px-4 py-4 pt-0">
        <p className="text-body-large-regular mb-3">{t('symbolDetail.info.corporateActions')}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Property Ownership Document</p>
            <p className="">
              Verified
            </p>
          </div>
          {asset.titleDeedImage && (
            <div className="mt-3 relative w-full h-48 rounded-xl overflow-hidden border border-border">
              <img src={asset.titleDeedImage} alt="Title Deed" className="object-cover w-full h-full" />
            </div>
          )}
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
      {typeof value === 'string' ? (
        <p className="text-body-small-semibold text-foreground max-w-[55%] text-right wrap-break-word whitespace-normal">
          {value}
        </p>
      ) : (
        <div className="w-[35%]">{value}</div>
      )}
    </div>
  );
}
