import { ORDERS_ENDPOINTS } from '../constants/api';
import type { CreateOrderPayload, CreateOrderResponse, GetOrdersParams, GetOrdersResponse, OrderItem } from '../types';

import { apiClient } from './apiClient';

/**
 * Spot Order Service
 * All endpoints use path-based parameters per Swagger spec
 */

export const createOrderAPI = async (
  payload: CreateOrderPayload,
  authHeader?: string,
): Promise<CreateOrderResponse> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;

  return apiClient.post<CreateOrderResponse>(ORDERS_ENDPOINTS.CREATE, payload, {
    headers,
  });
};

export const getOrdersListAPI = async (
  params?: GetOrdersParams,
  authHeader?: string,
): Promise<GetOrdersResponse> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;

  // Use the standardized ORDERS_ENDPOINTS.LIST ('/orders')
  const response = await apiClient.get<GetOrdersResponse>(
    ORDERS_ENDPOINTS.LIST,
    params,
    {
      headers,
    },
    true, // useAuth
  );

  return response;
};

type UpdateOrderPayload = {
  cancel?: boolean;
  price?: string;
};

export const updateOrderAPI = async (
  orderId: string,
  accountId: string,
  payload: UpdateOrderPayload = {},
  authHeader?: string,
): Promise<any> => {
  const { cancel = false, price } = payload;
  const updatePayload: any = {
    cancel,
  };
  
  if (price !== undefined && price !== null) {
    updatePayload.price = { price: String(price) };
  }

  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  
  // Use path parameter for orderId as per Swagger: PATCH /orders/{orderId}
  const response = await apiClient.patch<any>(
    ORDERS_ENDPOINTS.UPDATE(orderId),
    updatePayload,
    {
      headers,
    }
  );
  return response;
};

export const cancelAllOrdersAPI = async (
  accountId: string,
  authHeader?: string,
  orderIds?: string[],
): Promise<any> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  
  const payload = {
    orderIds: orderIds || [], // Bulk cancel expects an array of IDs
  };

  const response = await apiClient.post<any>(
    ORDERS_ENDPOINTS.BULK_CANCEL,
    payload,
    {
      headers,
    }
  );
  return response;
};
