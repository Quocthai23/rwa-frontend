import { demoTradingEndpoint } from './tradingScope';
import { ORDERS_ENDPOINTS } from '../constants/api';
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  GetOrdersParams,
  GetOrdersResponse,
} from '../types';

import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

/**
 * Spot Order Service
 * All endpoints use path-based parameters per Swagger spec
 */

export const createOrderAPI = async (
  payload: CreateOrderPayload,
  authHeader?: string,
): Promise<CreateOrderResponse> => {
  if (typeof window !== 'undefined' && !authHeader) {
    const demo = demoTradingEndpoint(payload.accountId, 'orders', undefined, true);
    return apiClient.post<CreateOrderResponse>(demo ?? '/api/create-order', payload, {
      baseUrl: window.location.origin,
      skipAuth: true,
    });
  }

  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;

  return apiClient.post<CreateOrderResponse>(ORDERS_ENDPOINTS.CREATE, payload, {
    headers,
  });
};

export const getOrdersListAPI = async (
  params?: GetOrdersParams,
  authHeader?: string,
): Promise<GetOrdersResponse> => {
  if (typeof window !== 'undefined' && !authHeader) {
    return apiClient.get<GetOrdersResponse>(
      demoTradingEndpoint(params?.accountId, 'orders') ?? '/api/order',
      params,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
      true,
    );
  }

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
  _accountId: string | null | undefined,
  payload: UpdateOrderPayload = {},
  authHeader?: string,
): Promise<unknown> => {
  const { cancel = false, price } = payload;
  const updatePayload: UpdateOrderPayload = {
    cancel,
  };

  if (price !== undefined && price !== null) {
    updatePayload.price = String(price);
  }

  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  if (typeof window !== 'undefined' && !authHeader) {
    return apiClient.patch<unknown>(
      demoTradingEndpoint(_accountId, 'orders', orderId, true) ??
        `/api/order?orderId=${encodeURIComponent(orderId)}&accountId=${encodeURIComponent(_accountId ?? '')}`,
      {
        ...updatePayload,
        ...(demoTradingEndpoint(_accountId, 'orders', undefined, true)
          ? { accountId: _accountId! }
          : {}),
      },
      { baseUrl: CLIENT_BASE_URL, skipAuth: true },
    );
  }

  // Use path parameter for orderId as per Swagger: PATCH /orders/{orderId}
  const response = await apiClient.patch<unknown>(ORDERS_ENDPOINTS.UPDATE(orderId), updatePayload, {
    headers,
  });
  return response;
};

export const cancelAllOrdersAPI = async (
  accountId: string,
  authHeader?: string,
  orderIds?: string[],
): Promise<unknown> => {
  const payload = {
    orderIds: orderIds || [], // Bulk cancel expects an array of IDs
  };

  if (typeof window !== 'undefined' && !authHeader) {
    const demo = demoTradingEndpoint(accountId, 'bulk-cancel', undefined, true);
    return apiClient.post<unknown>(
      demo ?? '/api/order?accountId=' + encodeURIComponent(accountId),
      demo ? { ...payload, accountId } : payload,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  }

  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;

  const response = await apiClient.post<unknown>(ORDERS_ENDPOINTS.BULK_CANCEL, payload, {
    headers,
  });
  return response;
};
