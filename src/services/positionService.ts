import { POSITIONS_ENDPOINTS } from '@/constants/api';
import type { Position, PositionsResponse, PositionStats } from '../types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';
export type GetPositionsParams = {
  accountId: string;
  take?: number;
  skip?: number;
  cursor?: string;
  symbol?: string;
  side?: number;
  // Used for server-side time range filtering (YYYY-MM-DD)
  fromDate?: string;
  toDate?: string;
  orderType?: number;
  sortBy?: 'openedAt' | 'closedAt' | 'quantity' | 'symbol' | 'side' | 'realizedPnl';
  sortDir?: 'desc' | 'asc';
  status?: number[];
};
export type UpdatePositionParams = {
  accountId: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
};
const isServer = typeof window === 'undefined';
export const getPositions = async (
  params?: GetPositionsParams,
  authHeader?: string,
): Promise<PositionsResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.get<PositionsResponse>(
      POSITIONS_ENDPOINTS.LIST,
      params,
      {
        headers,
      },
      true,
    );
    return response;
  }
  const res = await apiClient.get<PositionsResponse>('/api/position/list', params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};
export const getPositionStats = async (
  params?: { accountId: string },
  authHeader?: string,
): Promise<PositionStats> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.get<PositionStats>(
      POSITIONS_ENDPOINTS.STATS,
      params,
      {
        headers,
      },
      true,
    );

    return response;
  }
  const res = await apiClient.get<PositionStats>('/api/position/stats', params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};
export const updatePosition = async (
  positionId: string,
  params: UpdatePositionParams,
  authHeader?: string,
): Promise<unknown> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.put(POSITIONS_ENDPOINTS.UPDATE(positionId), params, {
      headers,
    });
    return response;
  }
  const res = await apiClient.put(`/api/position/${positionId}`, params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};
export const closePositions = async (
  positionId: string,
  accountId: string,
  quantity: string | number,
  authHeader?: string,
): Promise<unknown> => {
  const params = {
    accountId,
    quantity: quantity.toString(),
  };
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.post(POSITIONS_ENDPOINTS.CLOSE(positionId), params, {
      headers,
    });
    return response;
  }
  const res = await apiClient.post(`/api/position/close/${positionId}`, params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};
export const closeAllPositions = async (
  accountId: string,
  positionIds: string[] | Position[],
  authHeader?: string,
): Promise<void> => {
  // Extract IDs - handle both string IDs and Position objects
  const ids = positionIds.map((id) => {
    if (typeof id === 'string') {
      return id;
    }
    // If it's a Position object, extract the id property
    return (id as Position).id.toString();
  });

  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    await apiClient.post(
      POSITIONS_ENDPOINTS.BULK_CLOSE,
      {
        accountId: accountId.toString(),
        positionIds: ids,
      },
      {
        headers,
      },
    );
    return;
  }
  await apiClient.post(
    '/api/position/bulk-close',
    {
      accountId: accountId.toString(),
      positionIds: ids,
    },
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
};
