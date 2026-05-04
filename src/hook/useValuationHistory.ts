import { useQuery } from '@tanstack/react-query';
import { marketDataApi, type GetValuationHistoryRequest, type ValuationHistoryResponse } from '@/services/marketDataService';
import { CACHE_TIMES } from '@/constants/api';

export const valuationHistoryQueryKeys = {
  all: ['valuationHistory'] as const,
  list: (params: GetValuationHistoryRequest) => [...valuationHistoryQueryKeys.all, params] as const,
};

export function useValuationHistory(params: GetValuationHistoryRequest & { enabled?: boolean }) {
  const { enabled = true, ...requestParams } = params;

  return useQuery<ValuationHistoryResponse>({
    enabled: enabled && !!requestParams.assetId,
    queryFn: () => marketDataApi.getValuationHistory(requestParams),
    queryKey: valuationHistoryQueryKeys.list(requestParams),
    staleTime: CACHE_TIMES.TRENDING,
  });
}
