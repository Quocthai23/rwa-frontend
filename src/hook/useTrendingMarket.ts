import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '../constants/api';
import type { TrendingMarketItem, TrendingMarketResponse } from '../services/marketService';
import { marketService } from '../services/marketService';

export const trendingMarketQueryKeys = {
  all: ['trending-market'] as const,
  list: () => [...trendingMarketQueryKeys.all, 'list'] as const,
  full: () => [...trendingMarketQueryKeys.all, 'full'] as const,
};

export function useTrendingMarket() {
  return useQuery<TrendingMarketItem[]>({
    queryFn: () => marketService.getTrendingMarket(),
    queryKey: trendingMarketQueryKeys.list(),
    staleTime: CACHE_TIMES.TRENDING,
  });
}

export function useTrendingData() {
  return useQuery<TrendingMarketResponse>({
    queryFn: () => marketService.getTrendingData(),
    queryKey: trendingMarketQueryKeys.full(),
    staleTime: CACHE_TIMES.TRENDING,
    refetchInterval: false,
  });
}
