import { MARKET_DATA_ENDPOINTS } from '@/constants/api';
import type {
  SwaggerCandle,
  SwaggerCandlesResponse,
  SwaggerReferencePrice,
  SwaggerValuationHistoryResponse,
} from '@/types/swagger';
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

/** @deprecated Use `SwaggerCandle` — kept for existing imports */
export type CandleData = SwaggerCandle;

export type GetCandlesResponse = SwaggerCandle[];

export type GetReferencePriceRequest = {
  assetId: string;
};

export type ReferencePriceResponse = SwaggerReferencePrice;

export type GetValuationHistoryRequest = {
  assetId: string;
  areaCode?: string;
  limit?: number;
};

export type ValuationHistoryResponse = SwaggerValuationHistoryResponse;

function normalizeCandlesPayload(raw: unknown): SwaggerCandle[] {
  if (Array.isArray(raw)) {
    return raw as SwaggerCandle[];
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as SwaggerCandlesResponse).data)) {
    return (raw as SwaggerCandlesResponse).data ?? [];
  }
  return [];
}

export const marketDataApi = {
  getCandles: async (
    params: GetCandlesRequest,
    accessToken?: string,
  ): Promise<GetCandlesResponse> => {
    const query = { ...params } as Record<string, string | number>;

    let raw: unknown;
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      raw = await apiClient.get<SwaggerCandle[] | SwaggerCandlesResponse>(
        MARKET_DATA_ENDPOINTS.CANDLES,
        query,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    } else {
      raw = await apiClient.get<SwaggerCandle[] | SwaggerCandlesResponse>(
        `/api${MARKET_DATA_ENDPOINTS.CANDLES}`,
        query,
        {
          baseUrl: CLIENT_BASE_URL,
          skipAuth: false,
        },
      );
    }

    return normalizeCandlesPayload(raw);
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
