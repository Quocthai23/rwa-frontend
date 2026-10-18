import { useInfiniteQuery, useMutation } from '@tanstack/react-query';

import { cancelAllOrdersAPI, getOrdersListAPI } from '@/services/orderService';
import type { GetOrdersParams, GetOrdersResponse, OrderItem } from '@/types/orders';
import { OrderStatus } from '@/types/orders';
import { useQueryClient } from '@tanstack/react-query';

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
      params.assetId,
      params.orderType,
      params.fromDate,
      params.toDate,
    ],
    queryFn: async ({ pageParam }): Promise<GetOrdersResponse> => {
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
          total: result.length,
        };
      }

      return result;
    },
    getNextPageParam: (lastPage: GetOrdersResponse) => {
      // Use nextCursor from API response for pagination
      return lastPage.nextCursor || undefined;
    },
    staleTime: Infinity,
  });
};

export const useCancelOrders = (accountId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orders: OrderItem[]) => {
      // Filter cancellable orders using string-based status enums
      const cancellableOrders = orders.filter(
        (order) =>
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.OPEN ||
          order.status === OrderStatus.PARTIALLY_FILLED ||
          order.status === 'PENDING' ||
          order.status === 'OPEN' ||
          order.status === 'PARTIALLY_FILLED'
      );
      const orderIds = cancellableOrders.map((order) => order.id);
      if (orderIds.length === 0) {
        return null;
      }

      const result = await cancelAllOrdersAPI(accountId, undefined, orderIds);
      return result;
    },
    onSuccess: () => {
      // Refresh orders and portfolio data after cancellation
      queryClient.invalidateQueries({ queryKey: ['infinite-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      queryClient.invalidateQueries({ queryKey: ['infinite-portfolio-items'] });
    },
  });
};
