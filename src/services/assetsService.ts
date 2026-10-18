import { ASSETS_ENDPOINTS } from '../constants/api';
import type { Asset, AssetMarketData, Category } from '../types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

type AssetOnboardingJsonValue = boolean | null | number | string;
type AssetOnboardingPayload = {
  [key: string]: AssetOnboardingPayload | AssetOnboardingJsonValue | AssetOnboardingJsonValue[];
};

export const getAssetCategories = async (): Promise<Category[]> => {
  if (isServer) {
    return apiClient.get<Category[]>(ASSETS_ENDPOINTS.CATEGORIES, undefined, {
      skipAuth: true,
    });
  }

  return apiClient.get<Category[]>('/api/assetCategories', undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
};

/**
 * Fetch all available trading assets
 * This endpoint does not require authentication
 * Note: This API returns data directly without the standard ApiResponse wrapper
 */
export const getAssets = async (): Promise<Asset[]> => {
  return apiClient.get<Asset[]>('/api/assets', undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
};

/**
 * Fetch a specific asset by symbol
 */
export const getAssetBySymbol = async (symbol: string): Promise<Asset | undefined> => {
  const assets = await getAssets();

  return assets.find((asset) => asset.symbol === symbol);
};

/**
 * Fetch assets by category
 */
export const getAssetsByCategory = async (categoryId: string): Promise<Asset[]> => {
  const assets = await getAssets();

  return assets.filter((asset) => asset.categoryId === categoryId);
};

/**
 * Fetch only active assets
 */
export const getActiveAssets = async (): Promise<Asset[]> => {
  const assets = await getAssets();

  return assets.filter((asset) => asset.isActive);
};

export const getAssetMarketData = async (assetId: string): Promise<AssetMarketData> => {
  if (isServer) {
    return apiClient.get<AssetMarketData>(ASSETS_ENDPOINTS.MARKET_DATA(assetId), undefined, {
      skipAuth: true,
    });
  }

  return apiClient.get<AssetMarketData>(`/api/assets/${assetId}/market-data`, undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
};

export type AssetHolderDistribution = {
  totalSupply: string;
  holderCount: number;
  circulatingSupply: DistributionBucket;
  issuerReserve: DistributionBucket;
  primaryOffering: DistributionBucket;
  liquidityProvider: DistributionBucket;
  unallocated: DistributionBucket;
  ledgerSurplus: DistributionBucket;
  topHolders: Array<{
    userId: string;
    publicGuestNumber: number;
    avatar: string | null;
    amount: string;
    percentage: string;
  }>;
  others: {
    holderCount: number;
    amount: string;
    percentage: string;
  };
};

type DistributionBucket = {
  amount: string;
  percentage: string;
};

export const getAssetHolders = async (assetId: string): Promise<AssetHolderDistribution> => {
  if (isServer) {
    return apiClient.get<AssetHolderDistribution>(ASSETS_ENDPOINTS.HOLDERS(assetId), undefined, {
      skipAuth: true,
    });
  }
  return apiClient.get<AssetHolderDistribution>(`/api/assets/${assetId}/holders`, undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
};

export const submitAssetOnboardingAPI = async (
  assetId: string,
  data: AssetOnboardingPayload,
  authHeader?: string,
): Promise<unknown> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.post(ASSETS_ENDPOINTS.ONBOARDING(assetId), data, {
      headers,
    });
  }

  return apiClient.post(`/api/assets/${assetId}/onboarding/submit`, data, {
    baseUrl: CLIENT_BASE_URL,
  });
};
