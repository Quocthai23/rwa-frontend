import { useTranslation } from 'react-i18next';
import { Asset } from '@/types/assets';
import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AssetCardProps {
  asset: Asset;
  type: 'RENTAL' | 'BUYOUT';
  onAction: () => void;
  actionLabel?: string;
}

export default function AssetCard({ asset, type, onAction, actionLabel }: AssetCardProps) {
  const { t } = useTranslation();
  const isGreen = asset.statusColor === 'GREEN';
  const isYellow = asset.statusColor === 'YELLOW';

  const imageUrl = asset.images?.find((img: any) => img.isPrimary)?.url || asset.images?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
      type === 'RENTAL' ? "border-green-500/20 hover:border-green-500/50 hover:shadow-green-500/10" : "border-yellow-500/20 hover:border-yellow-500/50 hover:shadow-yellow-500/10"
    )}>
      {/* Image Header */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        <Image 
          src={imageUrl}
          alt={asset.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-4 right-4 flex gap-2 z-10">
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white drop-shadow-md">{asset.symbol}</span>
            <span className="text-sm text-white/90 truncate max-w-[200px] drop-shadow-md">{asset.name}</span>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md",
            isGreen ? "bg-green-500/90 text-white" : "",
            isYellow ? "bg-yellow-500/90 text-black" : "",
            (!isGreen && !isYellow) ? "bg-gray-500/90 text-white" : ""
          )}>
            {asset.statusColor}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('assetManagement.price')}
            </span>
            <span className="text-base font-bold text-foreground">
              {((asset.tokenPrice as number) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} VNĐ
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('assetManagement.apy')}
            </span>
            <span className="text-base font-bold text-green-500">
              {asset.expectedApy}%
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            onClick={onAction}
            className={cn(
              "w-full h-11 font-semibold rounded-xl transition-all shadow-md hover:shadow-lg",
              type === 'RENTAL' 
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-yellow-500 hover:bg-yellow-600 text-black"
            )}
          >
            {actionLabel ?? (type === 'RENTAL'
              ? t('assetManagement.rental.mintBtn', { defaultValue: 'Mint Rental NFT' }) 
              : t('assetManagement.buyout.verifyBtn', { defaultValue: 'Verify Eligibility' })
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
