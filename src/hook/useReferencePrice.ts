import { useQuery } from '@tanstack/react-query';
import { marketDataApi, type GetReferencePriceRequest, type ReferencePriceResponse } from '@/services/marketDataService';
import { CACHE_TIMES } from '@/constants/api';

export const referencePriceQueryKeys = {
  all: ['referencePrice'] as const,
  detail: (params: GetReferencePriceRequest) => [...referencePriceQueryKeys.all, params] as const,
};

export function useReferencePrice(params: GetReferencePriceRequest & { enabled?: boolean }) {
  const { enabled = true, ...requestParams } = params;

  return useQuery<ReferencePriceResponse>({
    enabled: enabled && !!requestParams.assetId,
    queryFn: () => marketDataApi.getReferencePrice(requestParams),
    queryKey: referencePriceQueryKeys.detail(requestParams),
    staleTime: CACHE_TIMES.TRENDING,
  });
}
