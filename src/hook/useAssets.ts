/**
 * useAssets Hook
 * React Query hook for fetching trading assets
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '../constants/api';
import {
  getActiveAssets,
  getAssetCategories,
  getAssets,
  getAssetsByCategory,
} from '../services/assetsService';
import type { Category } from '../types';
import { useGetData } from '@/context/GetdataContext';
import { useAuthStore } from '@/store/authStore';

/**
 * Fetch all assets
 */
export const useAssets = () => {
  return useQuery({
    queryFn: async () => {
      const result = await getAssets();

      return result;
    },
    queryKey: ['assets'],
  });
};

/**
 * Fetch only active assets
 */
export const useActiveAssets = () => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    gcTime: CACHE_TIMES.TRENDING * 2,
    queryFn: async () => {
      const result = await getActiveAssets();

      return result;
    },
    queryKey: ['assets', 'active', userId ?? 'guest'],
    retry: 0,
    staleTime: CACHE_TIMES.TRENDING,
  });
};

/**
 * Fetch assets by category
 */
export const useAssetsByCategory = (categoryId: string) => {
  return useQuery({
    enabled: !!categoryId,
    gcTime: CACHE_TIMES.TRENDING * 2,
    queryFn: () => getAssetsByCategory(categoryId),
    queryKey: ['assets', 'category', categoryId],
    staleTime: CACHE_TIMES.TRENDING,
  });
};

/**
 * Fetch asset categories
 */
export const useAssetCategories = () => {
  return useQuery<Category[]>({
    gcTime: CACHE_TIMES.TRENDING * 2,
    queryFn: () => getAssetCategories(),
    queryKey: ['asset-categories'],
    retry: 0,
    staleTime: CACHE_TIMES.TRENDING,
  });
};

/**
 * Fetch a specific asset by ID
 */
export const useAssetById = (assetId: string | undefined) => {
  const { assets: data, ...rest } = useGetData();

  const normalize = (value: string | undefined) =>
    (value ?? '').replaceAll('/', '').trim().toUpperCase();

  const needle = normalize(assetId);

  return {
    ...rest,
    data: data?.find((asset) => {
      if (!needle) return false;
      if (asset.id === assetId) return true;
      return normalize(asset.symbol) === needle;
    }),
  };
};
