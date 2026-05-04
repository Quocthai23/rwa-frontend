/**
 * Market Data React Query Hook
 * Custom hook for fetching klines (candlestick) data
 */

import { useQuery } from '@tanstack/react-query';

import { GetKlinesParams, KlineData, marketService } from '@/services/marketService';
import { CACHE_TIMES } from '@/constants/api';

export const marketQueryKeys = {
  all: ['market'] as const,
  klines: (params: GetKlinesParams) => [...marketQueryKeys.all, 'klines', params] as const,
};

export type UseKlineDataParams = {
  enabled?: boolean;
  includeActive?: boolean;
  limit?: number;
  symbol: string;
  timeframe: number; // Timeframe in seconds (e.g., 60, 300, 900, 3600, 14400, 86400)
};

export function useKlineData(params: UseKlineDataParams) {
  const { enabled = true, includeActive = true, limit = 100, symbol, timeframe } = params;

  const queryParams: GetKlinesParams = {
    includeActive,
    limit,
    symbol,
    timeframe,
  };

  return useQuery<KlineData>({
    enabled: enabled && !!symbol && !!timeframe,
    queryFn: () => marketService.getKlines(queryParams),
    queryKey: marketQueryKeys.klines(queryParams),
    staleTime: CACHE_TIMES.TRENDING,
  });
}
