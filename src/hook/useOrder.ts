import { useInfiniteQuery, useMutation } from '@tanstack/react-query';

import { cancelAllOrdersAPI, getOrdersListAPI } from '@/services/orderService';
import type { GetOrdersParams, GetOrdersResponse, OrderItem } from '@/types/orders';

export const useInfiniteOrders = (
  params: Omit<GetOrdersParams, 'take' | 'skip' | 'cursor'>,
  pageSize?: number,
  queryScope: 'active' | 'history' = 'active',
) => {
  return useInfiniteQuery({
    enabled: !!params.accountId,
    initialPageParam: null as string | null,
    queryKey: [
      'infinite-orders',
      queryScope,
      params.accountId,
      params.sortBy,
      params.sortDir,
      pageSize,
      params.status,
      params.side,
      params.symbol,
      params.orderType,
      params.fromDate,
      params.toDate,
    ],
    queryFn: async ({ pageParam }) => {
      const result = await getOrdersListAPI({
        ...params,
        cursor: pageParam || undefined,
        take: pageSize,
      });
      // Handle both array and object responses
      if (Array.isArray(result)) {
        return {
          data: result,
          nextCursor: undefined,
          take: pageSize,
        };
      }

      return result;
    },
    getNextPageParam: (lastPage) => {
      // Use nextCursor from API response for pagination
      if (Array.isArray(lastPage)) {
        return undefined;
      }
      return (lastPage as GetOrdersResponse).nextCursor || undefined;
    },
    staleTime: Infinity,
  });
};

export const useCancelOrders = (accountId: string) => {
  return useMutation({
    mutationFn: async (orders: OrderItem[]) => {
      const cancellableOrders = orders.filter((order) => order.status === 0 || order.status === 1);
      const orderIds = cancellableOrders.map((order) => order.id);
      if (orderIds.length === 0) {
        return null;
      }

      const result = await cancelAllOrdersAPI(accountId, undefined, orderIds);
      return result;
    },
  });
};
