import { PORTFOLIO_ENDPOINTS } from '@/constants/api';
import type { PortfolioItem, PortfolioOverview, PortfoliosResponse } from '@/types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type GetPortfolioParams = {
  accountId: string;
  assetId?: string;
  take?: number;
  skip?: number;
  cursor?: string;
  sortBy?:
    | 'symbol'
    | 'quantity'
    | 'currentPrice'
    | 'totalValue'
    | 'profitLoss'
    | 'averageBuyPrice'
    | 'category';
  sortDir?: 'desc' | 'asc';
};

/**
 * Fetch portfolio overview - displays user's asset holdings
 * Maps to /api/user/portfolio/overview endpoint from backend
 */
export const getPortfolioOverview = async (
  params?: { accountId: string },
  authHeader?: string,
): Promise<PortfolioOverview> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.get<PortfolioOverview>(
      PORTFOLIO_ENDPOINTS.OVERVIEW,
      params,
      {
        headers,
      },
      true,
    );
    return response;
  }

  const res = await apiClient.get<PortfolioOverview>(
    '/api' + PORTFOLIO_ENDPOINTS.OVERVIEW,
    params,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
  return res;
};

/**
 * Fetch paginated portfolio items
 * Lists all assets in user's portfolio with holding details
 */
export const getPortfolioItems = async (
  params?: GetPortfolioParams,
  authHeader?: string,
): Promise<PortfoliosResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.get<PortfoliosResponse>(
      PORTFOLIO_ENDPOINTS.ITEMS,
      params,
      {
        headers,
      },
      true, // haveTotal: return { data, total, nextCursor }
    );
    return response;
  }

  const res = await apiClient.get<PortfoliosResponse>(
    '/api' + PORTFOLIO_ENDPOINTS.ITEMS,
    params,
    {
      baseUrl: CLIENT_BASE_URL,
    },
    true,
  ); // haveTotal: return { data, total, nextCursor }
  return res;
};

/**
 * Get portfolio value history for charts/analytics
 */
export const getPortfolioHistory = async (
  params?: { accountId: string; fromDate?: string; toDate?: string },
  authHeader?: string,
): Promise<unknown> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const response = await apiClient.get(
      PORTFOLIO_ENDPOINTS.HISTORY,
      params,
      {
        headers,
      },
      true,
    );
    return response;
  }

  const res = await apiClient.get('/api' + PORTFOLIO_ENDPOINTS.HISTORY, params, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res;
};
