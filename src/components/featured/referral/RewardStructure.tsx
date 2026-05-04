'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAssets } from '@/hook/useAssets';
import type { Asset } from '@/types/assets';
import { RewardCategoryItem } from './components/RewardCategoryItem';
import { RewardCategorySkeleton } from './components/RewardCategorySkeleton';
import Header from '@/components/shared/Header';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from '@untitledui/icons';

// cspell:ignore FOREX
const categoryIcons: Record<string, string> = {
  METAL: '/assets/images/referral/metals.svg',
  CRYPTO: '/assets/images/referral/Coin.svg',
  INDEX: '📊',
  FX: '💰',
  FOREX: '/assets/images/referral/forex.svg',
  STOCK: '📉',
  COMMODITY: '/assets/images/referral/metals.svg',
} as const;

type RewardStructureProps = {
  onBack?: () => void;
  useSimpleHeader?: boolean;
};

function RewardStructure({ onBack, useSimpleHeader = false }: RewardStructureProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: assets, isLoading } = useAssets();
  const groupedAssets = (assets ?? []).reduce(
    (acc: Record<string, { label: string; items: Asset[]; icon: string }>, asset: Asset) => {
      const categoryName = asset.category?.name || 'Other';
      const categoryCode = asset.category?.code || 'OTHER';

      if (!acc[categoryCode]) {
        acc[categoryCode] = {
          label: categoryName,
          items: [],
          icon: categoryIcons[categoryCode] || '📦',
        };
      }
      acc[categoryCode].items.push(asset);
      return acc;
    },
    {} as Record<string, { label: string; items: Asset[]; icon: string }>,
  );

  const sortedCategories = Object.values(groupedAssets).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div className="bg-background min-h-dvh">
      {/* Header */}
      {useSimpleHeader ? (
        <div className="flex h-15 items-center justify-between px-4">
          <button
            className="p-1"
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }
              router.back();
            }}
            aria-label={t('common.back', 'Back')}
            type="button"
          >
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <p className="text-h3-semibold text-foreground">{t('referral.rewardStructure.title')}</p>
          <div className="w-8" aria-hidden />
        </div>
      ) : (
        <Header
          label={t('referral.rewardStructure.title')}
          onBack={() => {
            if (onBack) {
              onBack();
              return;
            }
            router.back();
          }}
        />
      )}

      <div className="px-4">
        {/* Hero Section */}
        <div className="flex items-center justify-between py-6">
          <div className="flex-1 pr-4">
            <p className="text-h2-semibold text-foreground mb-2">
              {t('referral.rewardStructure.heroTitle')}
            </p>
            <p className="text-body-large-regular text-muted-foreground">
              {t('referral.rewardStructure.heroSubtitle')}
            </p>
          </div>
          <div className="flex h-20 w-20 items-center justify-center">
            <Image
              src="/assets/images/referral/reward.svg"
              alt={t('referral.rewardStructure.heroImageAlt')}
              width={80}
              height={80}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mt-4 pb-10">
          <p className="text-body-large-semibold text-foreground mb-4">
            {t('referral.rewardStructure.categoriesTitle')}
          </p>

          {isLoading ? (
            <div className="space-y-4 py-6">
              {[1, 2, 3].map((item) => (
                <RewardCategorySkeleton key={item} />
              ))}
            </div>
          ) : sortedCategories.length > 0 ? (
            sortedCategories.map((category, index) => (
              <RewardCategoryItem
                key={`${category.label}-${index}`}
                icon={
                  category.icon.startsWith('/') ? (
                    <Image
                      src={category.icon}
                      alt={category.label}
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center text-2xl">
                      {category.icon}
                    </span>
                  )
                }
                instruments={category.items.map((asset) => ({
                  logo: asset.logo ?? '',
                  symbol: asset.symbol,
                  ibCommissionPerLot: (asset as Asset & { ibCommissionPerLot?: string })
                    .ibCommissionPerLot,
                }))}
                label={category.label}
              />
            ))
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-body-large-regular text-muted-foreground">
                {t('market.noDataAvailable')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RewardStructure;
