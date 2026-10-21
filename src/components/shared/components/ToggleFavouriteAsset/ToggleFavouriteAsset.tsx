'use client';

import { Star01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useAuthStore } from '@/store/authStore';
import { useToggleFavoriteAsset } from '@/hook/users/useToggleFavoriteAsset';
import { Button } from '../../atoms/button';
import { useTranslation } from 'react-i18next';

type ToggleFavouriteAssetProps = {
  readonly assetId: string;
  readonly className?: string;
  readonly size?: number;
  readonly defaultIsFavorite?: boolean;
};

export function ToggleFavouriteAsset({
  assetId,
  className = '',
  size = 16,
  defaultIsFavorite,
}: ToggleFavouriteAssetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setFavoriteByAssetId = useFavoriteAssetsStore((s) => s.setFavoriteByAssetId);
  const favoriteFromStore = useFavoriteAssetsStore((s) =>
    assetId ? s.favoritesByAssetId[assetId] : undefined,
  );
  const isFavorite = favoriteFromStore ?? defaultIsFavorite ?? false;
  const { isPending: isTogglingFavorite, mutate: toggleFavorite } = useToggleFavoriteAsset();

  useEffect(() => {
    if (!assetId || favoriteFromStore !== undefined || defaultIsFavorite === undefined) return;
    setFavoriteByAssetId(assetId, defaultIsFavorite);
  }, [assetId, defaultIsFavorite, favoriteFromStore, setFavoriteByAssetId]);

  const handleToggleFavorite = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (isTogglingFavorite || !assetId) return;
    toggleFavorite({ assetId });
  };

  return (
    <Button
      variant="white-contained"
      aria-label={t('common.toggleFavoriteAsset')}
      className={`flex min-h-7 min-w-7 items-center justify-center ${className} cursor-pointer`}
      disabled={!assetId}
      onClick={(event) => {
        event.stopPropagation();
        handleToggleFavorite();
      }}
    >
      <Star01
        style={{ width: size, height: size, flexShrink: 0 }}
        className={
          isFavorite
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-neutral-300 dark:text-neutral-600'
        }
      />
    </Button>
  );
}

