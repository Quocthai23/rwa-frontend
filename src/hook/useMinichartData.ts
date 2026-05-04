/**
 * Market Data React Query Hook
 * Custom hook for fetching klines (candlestick) data
 */

import { useQuery } from '@tanstack/react-query';

import { GetKlinesMarketParams, KlineData, marketService } from '@/services/marketService';
import { CACHE_TIMES } from '@/constants/api';

const MAX_SYMBOLS_PER_REQUEST = 100;

export const miniChartQueryKeys = {
  all: ['market'] as const,
  minicharts: (params: GetKlinesMarketParams) =>
    [...miniChartQueryKeys.all, 'minicharts', params] as const,
};

export type UseMiniChartDataParams = {
  enabled?: boolean;
  limit?: number;
  symbols: string[];
  timeframe: number;
};

export function useMiniChartData(params: UseMiniChartDataParams) {
  const { enabled = true, limit = 100, symbols, timeframe } = params;
  const normalizedSymbols = Array.from(new Set(symbols.filter(Boolean)));

  const queryParams: GetKlinesMarketParams = {
    limit,
    symbols: normalizedSymbols,
    timeframe,
  };

  return useQuery<KlineData[]>({
    enabled: false, // Disabled globally for RWA project
    queryFn: async () => {
      if (normalizedSymbols.length <= MAX_SYMBOLS_PER_REQUEST) {
        return marketService.getKlinesMarket(queryParams);
      }

      const chunks: string[][] = [];
      for (let i = 0; i < normalizedSymbols.length; i += MAX_SYMBOLS_PER_REQUEST) {
        chunks.push(normalizedSymbols.slice(i, i + MAX_SYMBOLS_PER_REQUEST));
      }

      const responses = await Promise.all(
        chunks.map((chunkSymbols) =>
          marketService.getKlinesMarket({
            limit,
            symbols: chunkSymbols,
            timeframe,
          }),
        ),
      );

      const mergedBySymbol = new Map<string, KlineData>();
      responses.flat().forEach((item) => {
        mergedBySymbol.set(item.symbol, item);
      });

      return normalizedSymbols.map((symbol) => ({
        candles: mergedBySymbol.get(symbol)?.candles || [],
        symbol,
        timeframe,
      }));
    },
    queryKey: miniChartQueryKeys.minicharts(queryParams),
    staleTime: CACHE_TIMES.TRENDING,
  });
}
