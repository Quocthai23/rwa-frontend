'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@/constants/api';
import {
  getPortfolioOverview,
  getPortfolioItems,
  GetPortfolioParams,
} from '@/services/portfolioService';
import type { PortfolioItem, PortfolioOverview, PortfoliosResponse } from '@/types/portfolio';

/**
 * Hook to fetch portfolio overview
 * Shows total portfolio value, profit/loss, and asset breakdown
 */
export const usePortfolioOverview = (params: { accountId: string }) => {
  return useQuery({
    enabled: !!params.accountId,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!params.accountId) {
        return null;
      }
      const result = await getPortfolioOverview({ accountId: params.accountId });
      return result;
    },
    queryKey: ['portfolio-overview', params.accountId],
    retry: 0,
    refetchOnReconnect: 'always',
    staleTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch paginated portfolio items
 * Lists individual assets held in portfolio
 */
export const useInfinitePortfolioItems = (
  params: Omit<GetPortfolioParams, 'take' | 'skip' | 'cursor'>,
  pageSize?: number,
) => {
  return useInfiniteQuery({
    enabled: !!params.accountId,
    initialPageParam: null as string | null,
    queryKey: [
      'infinite-portfolio-items',
      params.accountId,
      params.sortBy,
      params.sortDir,
      pageSize,
    ],
    queryFn: async ({ pageParam }) => {
      const result = await getPortfolioItems({
        ...params,
        cursor: pageParam || undefined,
        take: pageSize,
      });
      return result;
    },
    getNextPageParam: (lastPage: PortfoliosResponse) => {
      return lastPage.nextCursor || undefined;
    },
    staleTime: CACHE_TIMES.TRENDING,
    gcTime: CACHE_TIMES.TRENDING * 2,
  });
};

/**
 * Hook to fetch single portfolio item details
 */
export const usePortfolioItem = (params: { accountId: string; assetId?: string }) => {
  return useQuery({
    enabled: !!params.accountId && !!params.assetId,
    queryFn: async () => {
      if (!params.accountId || !params.assetId) {
        return null;
      }
      const result = await getPortfolioItems({
        accountId: params.accountId,
        assetId: params.assetId,
        take: 1,
      });
      // Filter for specific asset
      const item = result.data?.find((item) => item.assetId === params.assetId);
      return item || null;
    },
    queryKey: ['portfolio-item', params.accountId, params.assetId],
    retry: 0,
    staleTime: CACHE_TIMES.TRENDING,
    gcTime: CACHE_TIMES.TRENDING * 2,
  });
};
