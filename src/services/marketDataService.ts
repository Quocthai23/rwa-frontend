import { MARKET_DATA_ENDPOINTS } from '@/constants/api';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type Resolution = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export type GetCandlesRequest = {
  assetId: string;
  resolution: Resolution;
  from: string;
  to: string;
};

export type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type GetCandlesResponse = CandleData[];

export type GetReferencePriceRequest = {
  assetId: string;
};

export type ReferencePriceResponse = {
  [key: string]: unknown;
};

export type GetValuationHistoryRequest = {
  assetId: string;
  areaCode?: string;
  limit?: number;
};

export type ValuationHistoryResponse = {
  [key: string]: unknown;
};

export const marketDataApi = {
  getCandles: async (
    params: GetCandlesRequest,
    accessToken?: string,
  ): Promise<GetCandlesResponse> => {
    const query = { ...params } as Record<string, string | number>;

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<GetCandlesResponse>(MARKET_DATA_ENDPOINTS.CANDLES, query, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<GetCandlesResponse>(`/api${MARKET_DATA_ENDPOINTS.CANDLES}`, query, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  getReferencePrice: async (
    params: GetReferencePriceRequest,
    accessToken?: string,
  ): Promise<ReferencePriceResponse> => {
    const query = { ...params } as Record<string, string | number>;

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<ReferencePriceResponse>(
        MARKET_DATA_ENDPOINTS.REFERENCE_PRICE,
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.get<ReferencePriceResponse>(
      `/api${MARKET_DATA_ENDPOINTS.REFERENCE_PRICE}`,
      query,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  getValuationHistory: async (
    params: GetValuationHistoryRequest,
    accessToken?: string,
  ): Promise<ValuationHistoryResponse> => {
    const query = { ...params } as Record<string, string | number>;

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<ValuationHistoryResponse>(
        MARKET_DATA_ENDPOINTS.VALUATION_HISTORY,
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.get<ValuationHistoryResponse>(
      `/api${MARKET_DATA_ENDPOINTS.VALUATION_HISTORY}`,
      query,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },
};
