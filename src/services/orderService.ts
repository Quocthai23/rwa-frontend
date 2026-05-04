import { ORDERS_ENDPOINTS } from '../constants/api';
import type { GetOrdersParams, GetOrdersResponse, OrderItem } from '../types';

import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

/**
 * Fetch all available positions
 * This endpoint requires authentication
 * Note: This API returns data directly without the standard ApiResponse wrapper
 */
export const getOrders = async (accountId: string): Promise<OrderItem[]> => {
  return apiClient.get<OrderItem[]>('/api/order', { accountId }, { baseUrl: CLIENT_BASE_URL });
};

const isServer = typeof window === 'undefined';

// export const getOrdersListAPI = async (parameters: GetOrdersParams): Promise<GetOrdersResponse> => {
//   const normalized = normalizeOrdersParameters(parameters);
//   const data = await apiClient.get<GetOrdersResponse>('orders', normalized);
//   return data;
// };
export const getOrdersListAPI = async (
  params?: GetOrdersParams,
  authHeader?: string,
): Promise<GetOrdersResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;

    const response = await apiClient.get<GetOrdersResponse>(
      ORDERS_ENDPOINTS.LIST,
      params,
      {
        headers,
      },
      true,
    );

    return response;
  }

  const res = apiClient.get<GetOrdersResponse>('/api/order', params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};

type UpdateOrderPayload = {
  cancel?: boolean;
  price?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
};

export const updateOrderAPI = async (
  orderId: string,
  accountId: string,
  payload: UpdateOrderPayload = {},
  authHeader?: string,
): Promise<GetOrdersResponse> => {
  const { cancel = false, price, stopLossPrice, takeProfitPrice } = payload;
  const updatePayload = {
    accountId,
    cancel,
    ...(price !== undefined ? { price } : {}),
    ...(stopLossPrice !== undefined ? { stopLossPrice } : {}),
    ...(takeProfitPrice !== undefined ? { takeProfitPrice } : {}),
  };

  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.patch<GetOrdersResponse>(`orders/${orderId}`, updatePayload, {
      headers,
    });
    return response;
  }

  const data = await apiClient.patch<GetOrdersResponse>(
    `/api/order?orderId=${orderId}&accountId=${accountId}`,
    updatePayload,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
  return data;
};

export const cancelAllOrdersAPI = async (
  accountId: string,
  authHeader?: string,
  orderIds?: string[],
): Promise<GetOrdersResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const payload: Record<string, unknown> = {
      accountId,
      ...(orderIds && orderIds.length > 0 ? { orderIds } : {}),
    };
    const response = await apiClient.post<GetOrdersResponse>(
      `orders/bulk-cancel`,
      payload as unknown as Record<string, string | string[]>,
      {
        headers,
      },
    );
    return response;
  }
  const payload: Record<string, unknown> = {
    accountId,
    ...(orderIds && orderIds.length > 0 ? { orderIds } : {}),
  };
  const data = await apiClient.post<GetOrdersResponse>(
    `/api/order?accountId=${accountId}`,
    payload as unknown as Record<string, string | string[]>,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
  return data;
};
