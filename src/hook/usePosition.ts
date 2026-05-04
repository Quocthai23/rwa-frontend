import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@/constants/api';
import {
  closeAllPositions,
  getPositions,
  GetPositionsParams,
  getPositionStats,
} from '@/services/positionService';
import { type Position, PositionsResponse } from '@/types/position';

export const usePositionStats = (params: { accountId: string }) => {
  return useQuery({
    enabled: !!params.accountId,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!params.accountId) {
        return null;
      }
      const result = await getPositionStats({ accountId: params.accountId });
      return result;
    },
    // placeholderData: (prev) => prev,
    queryKey: ['stats', params.accountId],
    retry: 0,
    refetchOnReconnect: 'always',
    staleTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
};

export const useInfinitePositions = (
  params: Omit<GetPositionsParams, 'take' | 'skip' | 'cursor'>,
  pageSize?: number,
  queryScope: 'active' | 'history' = 'active',
) => {
  return useInfiniteQuery({
    enabled: !!params.accountId,
    initialPageParam: null as string | null,
    queryKey: [
      'infinite-positions',
      queryScope,
      params.accountId,
      params.sortBy,
      params.sortDir,
      params.status,
      params.side,
      params.fromDate,
      params.toDate,
      params.symbol,
      params.orderType,
      pageSize,
    ],
    queryFn: async ({ pageParam }) => {
      const result = await getPositions({
        ...params,
        cursor: pageParam || undefined,
        take: pageSize,
      });
      return result;
    },
    getNextPageParam: (lastPage: PositionsResponse) => {
      // Use nextCursor from API response for pagination
      return lastPage.nextCursor || undefined;
    },
    staleTime: CACHE_TIMES.TRENDING,
    gcTime: CACHE_TIMES.TRENDING * 2,
  });
};

export const useClosePositions = (accountId: string) => {
  return useMutation({
    mutationFn: async (positions: Position[]) => {
      const result = await closeAllPositions(accountId, positions);

      return result;
    },
  });
};
