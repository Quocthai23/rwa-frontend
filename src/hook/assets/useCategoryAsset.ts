import { useMemo } from 'react';

import { useGetData } from '@/context/GetdataContext';
import type { GetAssetsResponse } from '@/types/assets';

export const useCategoryAsset = (categoryCode: string) => {
  const { assets, isLoadingAssets, isFetchingAssets, errorAssets, refetchAssets } = useGetData();

  const data = useMemo((): GetAssetsResponse | undefined => {
    if (!assets) return undefined;
    const trimmed = categoryCode.trim();
    const list = trimmed ? assets.filter((a) => a.category.code === trimmed) : assets;
    return { data: list, total: list.length };
  }, [assets, categoryCode]);

  return {
    data,
    isLoading: isLoadingAssets,
    isFetching: isFetchingAssets,
    error: errorAssets,
    refetch: refetchAssets,
  };
};
