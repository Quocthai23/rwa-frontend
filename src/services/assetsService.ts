import { ASSETS_ENDPOINTS } from '../constants/api';
import type { Asset, Category, GetAssetsParams, GetAssetsResponse } from '../types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

function normalizeAssetsParameters(parameters: GetAssetsParams) {
  const { skip = 0, take = 20, ...rest } = parameters;

  return {
    skip,
    take,
    ...rest,
  };
}

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
