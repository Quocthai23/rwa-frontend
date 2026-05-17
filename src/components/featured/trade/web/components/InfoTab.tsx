import React from 'react';

import { useAssetById } from '@/hook/useAssets';
import { useTranslation } from 'react-i18next';

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

  // Format area
  const areaDisplay = asset.area ? `${asset.area} sqm` : '-';

  return (
    <div className="bg-background scrollbar-neutral-slim flex-1 overflow-y-auto">
      {/* Info Section */}
      <div className="py-4">
        <h2 className="text-h2-semibold mb-4">{t('symbolDetail.tabs.info')}</h2>
        <InfoRow label="Location" value={asset.location || '-'} />
        <InfoRow label="Total Area" value={areaDisplay} />
        <InfoRow label="Zoning / Planning" value={asset.zoning || '-'} />
        <InfoRow label="Business Model" value={asset.businessModel || '-'} />
        <InfoRow label="Monthly Benefits" value={asset.monthlyBenefits || '-'} />
      </div>

      {/* Corporate Actions Section */}
      <div className="py-4 pt-0">
        <p className="text-body-large-regular mb-3">{t('symbolDetail.info.corporateActions')}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <p className="text-body-small-regular text-muted-foreground">
              Property Ownership Document
            </p>
            <p className="text-body-small-medium">
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
      <p className="text-body-small-semibold text-foreground max-w-[55%] text-right wrap-break-word whitespace-normal">
        {value}
      </p>
    </div>
  );
}
