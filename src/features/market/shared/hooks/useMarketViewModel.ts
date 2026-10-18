'use client';

import { useAssetCategories } from '@/hook/useAssets';
import { useGetData } from '@/context/GetdataContext';
import { useToggleFavoriteAsset } from '@/hook/users/useToggleFavoriteAsset';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { GetRowsOptions, MarketRowVM, MarketTabVM } from '../types';
import { buildMarketRows, buildMarketTabs, filterMarketRows } from '../utils';

const POPULAR_PRIORITY_ASSET_IDS = [
  'asset-xauusd',
  'asset-xagusd',
  'asset-eurusd',
  'asset-usdjpy',
  'asset-gbpusd',
  'asset-btcusd',
  'asset-ethusd',
] as const;

const POPULAR_PRIORITY_BY_ID = new Map<string, number>(
  POPULAR_PRIORITY_ASSET_IDS.map((assetId, index) => [assetId, index]),
);

const prioritizePopularRows = (rows: MarketRowVM[]): MarketRowVM[] => {
  return rows
    .map((row, index) => ({
      index,
      rank: POPULAR_PRIORITY_BY_ID.get(row.id) ?? Number.POSITIVE_INFINITY,
      row,
    }))
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.index - right.index;
    })
    .map((item) => item.row);
};

export function useMarketViewModel() {
  const { t } = useTranslation();
  const { assets, errorAssets, isFetchingAssets, isLoadingAssets, refetchAssets } = useGetData();
  const { data: categories } = useAssetCategories();

  const favoritesByAssetId = useFavoriteAssetsStore((state) => state.favoritesByAssetId);
  const favoritesBySymbol = useFavoriteAssetsStore((state) => state.favoritesBySymbol);

  const toggleFavoriteAsset = useToggleFavoriteAsset();

  const tabs = useMemo<MarketTabVM[]>(
    () =>
      buildMarketTabs({
        categories: Array.isArray(categories) ? categories : [],
        t,
      }),
    [categories, t],
  );

  const rows = useMemo<MarketRowVM[]>(
    () =>
      buildMarketRows({
        assets: Array.isArray(assets) ? assets : [],
        favoritesByAssetId,
        favoritesBySymbol,
      }),
    [assets, favoritesByAssetId, favoritesBySymbol],
  );

  const getRowsByTab = (tabId: string, options?: GetRowsOptions): MarketRowVM[] => {
    if (tabId === 'fav') {
      return filterMarketRows({
        marketOpenOnly: options?.marketOpenOnly,
        rows,
        search: options?.search,
      }).filter((row) => row.isFavorite);
    }

    if (tabId === 'popular') {
      return prioritizePopularRows(
        filterMarketRows({
          marketOpenOnly: options?.marketOpenOnly,
          rows,
          search: options?.search,
        }),
      );
    }

    if (tabId === 'rental') {
      return filterMarketRows({
        marketOpenOnly: options?.marketOpenOnly,
        rows,
        search: options?.search,
      }).filter((row) => Boolean(row.rentalStatus));
    }

    if (tabId === 'buyout') {
      return filterMarketRows({
        marketOpenOnly: options?.marketOpenOnly,
        rows,
        search: options?.search,
      }).filter((row) => row.tradingStatus === 'BUYOUT_ACTIVE');
    }

    const category = categories?.find((item) => item.name === tabId);

    return filterMarketRows({
      categoryCode: category?.code,
      marketOpenOnly: options?.marketOpenOnly,
      rows,
      search: options?.search,
    });
  };

  const toggleFavorite = (assetId: string) => {
    if (!assetId || toggleFavoriteAsset.isPending) {
      return;
    }

    toggleFavoriteAsset.mutate({ assetId });
  };

  return {
    error: errorAssets,
    getRowsByTab,
    isLoading: isLoadingAssets,
    isRefreshing: isFetchingAssets,
    refresh: refetchAssets,
    rows,
    tabs,
    toggleFavorite,
    togglingFavorite: toggleFavoriteAsset.isPending,
  };
}
