import React, { memo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';

type ViewType = 'spread' | 'chart';

type LayoutSymbolViewProps = {
  readonly onSelect: (viewType: ViewType) => void;
  readonly selectedView: ViewType;
};

function LayoutSymbolView({ onSelect, selectedView }: LayoutSymbolViewProps) {
  const { t } = useTranslation();
  return (
    <div className="pt-2 pb-10">
      <p className="text-h3-semibold border-border border-b p-4">{t('market.switchListStyle')}</p>

      <div className="flex gap-3 p-4">
        <Button
          variant="white-contained"
          className="flex-1 flex-col items-start text-left"
          onClick={() => onSelect('spread')}
        >
          <p
            className={`text-body-large-medium ${selectedView === 'spread' ? 'text-primary-500' : 'text-muted-foreground'}`}
          >
            {t('market.spreadView')}
          </p>
          <div
            className={`overflow-hidden rounded-lg border-2 ${
              selectedView === 'spread' ? 'border-primary-500' : 'border-border'
            }`}
          >
            <Image
              src="/assets/images/market/spread-view.png"
              alt={t('market.spreadViewLayoutPreview')}
              width={480}
              height={200}
              className="w-full object-cover"
            />
          </div>
        </Button>

        <Button
          variant="white-contained"
          className="flex-1 flex-col items-start text-left"
          onClick={() => onSelect('chart')}
        >
          <p
            className={`text-body-large-medium ${selectedView === 'chart' ? 'text-primary-500' : 'text-muted-foreground'}`}
          >
            {t('market.chartView')}
          </p>
          <div
            className={`overflow-hidden rounded-lg border-2 ${
              selectedView === 'chart' ? 'border-primary-500' : 'border-border'
            }`}
          >
            <Image
              src="/assets/images/market/chart-view.png"
              alt={t('market.chartViewLayoutPreview')}
              width={480}
              height={200}
              className="w-full object-cover"
            />
          </div>
        </Button>
      </div>
    </div>
  );
}

export default memo(LayoutSymbolView);
