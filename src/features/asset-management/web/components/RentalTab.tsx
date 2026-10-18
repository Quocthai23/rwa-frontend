import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActiveAssets } from '@/hook/useAssets';
import AssetCard from './AssetCard';
import AssetActionModal from './AssetActionModal';
import { Asset } from '@/types/assets';

export default function RentalTab() {
  const { t } = useTranslation();
  const { data: assets = [], isLoading } = useActiveAssets();
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const eligibleAssets = assets.filter(a => a.statusColor === 'GREEN');

  const handleActionClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="max-w-3xl">
        <h2 className="text-heading-4 mb-4 font-extrabold text-foreground">
          {t('assetManagement.rental.title', { defaultValue: 'Rental NFT (Green Assets)' })}
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          {t('assetManagement.rental.desc', { 
            defaultValue: 'Deposit 1 month rent to mint a Rental NFT and start earning yields. If you miss the deadline by 7 days, your deposit is seized.' 
          })}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {eligibleAssets.length > 0 ? (
            eligibleAssets.map(asset => (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                type="RENTAL" 
                onAction={() => handleActionClick(asset)}
              />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-border/50 border-dashed">
              {t('assetManagement.emptyRental')}
            </div>
          )}
        </div>
      )}

      <AssetActionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        asset={selectedAsset} 
        type="RENTAL"
      />
    </div>
  );
}
