/**
 * Market API Service
 * Fetches market data including klines (candlestick) data
 */

import { API_CHART_URL } from '@/constants/env';
import ky from 'ky';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';
import { getExternalJson } from './externalApiClient';
import { MARKET_ENDPOINTS } from '@/constants/api';

export type Candle = {
  close: number;
  high: number;
  low: number;
  open: number;
  time: number;
  volume?: number;
};

export type KlineData = {
  candles: Candle[];
  symbol: string;
  timeframe: number;
};

export type KlineResponse = {
  success: boolean;
  symbol: string;
  candles: Candle[];
};

type MiniChartItem = {
  symbol: string;
  candles: Candle[];
};

type MiniChartsBySymbol = Record<
  string,
  {
    candles?: Candle[];
    status?: string;
  }
>;

type MiniChartsResponse =
  | MiniChartItem[]
  | {
      data?: MiniChartItem[] | MiniChartsBySymbol;
      items?: MiniChartItem[];
      result?: MiniChartItem[];
    };

export type GetKlinesParams = {
  includeActive?: boolean;
  limit?: number;
  symbol: string;
  timeframe: number; // Timeframe in seconds (e.g., 60, 300, 900, 3600, 14400, 86400)
};

export type GetKlinesMarketParams = {
  limit?: number;
  symbols: string[];
  timeframe: number;
};

export type TrendingMarketItem = {
  id: string;
  symbol: string;
  name: string;
};

export type TrendingMarketResponse = {
  trendingMarket: TrendingMarketItem[];
  topMovers: {
    topRisers: TrendingMarketItem[];
    topFallers: TrendingMarketItem[];
  };
};

/**
 * Fetch klines (candlestick) data for a symbol
 * @param params - Parameters for klines query
 * @returns Promise with kline data
 */
async function getKlines(params: GetKlinesParams): Promise<KlineData> {
  const { includeActive = true, limit = 100, symbol, timeframe } = params;

  const response = await getExternalJson<KlineResponse>(
    `${API_CHART_URL}/api/v1/market/klines/${symbol}`,
    {
      includeActive: String(includeActive),
      limit: String(limit),
      timeframe: String(timeframe),
    },
  );

  return {
    candles: response.candles || [],
    symbol: response.symbol || symbol,
    timeframe,
  };
}

async function getKlinesMarket(params: GetKlinesMarketParams): Promise<KlineData[]> {
  const { limit = 100, symbols, timeframe } = params;
  if (!symbols.length) return [];

  const response = await ky
    .post(`${API_CHART_URL}/api/v1/market/mini-charts`, {
      headers: { Accept: 'application/json' },
      json: { limit, symbols },
      timeout: 30000,
    })
    .json<MiniChartsResponse>();

  const chartsBySymbol = new Map<string, Candle[]>();

  if (Array.isArray(response)) {
    response
      .filter((item): item is MiniChartItem => Boolean(item?.symbol))
      .forEach((item) => {
        chartsBySymbol.set(item.symbol, item.candles || []);
      });
  } else {
    const data = response.data;
    if (data && !Array.isArray(data)) {
      Object.entries(data).forEach(([symbol, payload]) => {
        chartsBySymbol.set(symbol, payload?.candles || []);
      });
    } else {
      const charts = (Array.isArray(data) ? data : response.items || response.result || []).filter(
        (item): item is MiniChartItem => Boolean(item?.symbol),
      );
      charts.forEach((item) => {
        chartsBySymbol.set(item.symbol, item.candles || []);
      });
    }
  }

  return symbols.map((symbol) => ({
    candles: chartsBySymbol.get(symbol) || [],
    symbol,
    timeframe,
  }));
}

/**
 * Fetch trending market data
 * @returns Promise with trending market items (limited to 4)
 */
const isServer = typeof window === 'undefined';
export async function getTrendingMarket(): Promise<TrendingMarketItem[]> {
  if (isServer) {
    const response = await apiClient.get<TrendingMarketResponse>(
      MARKET_ENDPOINTS.TRENDING,
      undefined,
      {
        skipAuth: true,
      },
    );
    return response.trendingMarket.slice(0, 4);
  }

  return apiClient.get<TrendingMarketItem[]>('/api/market-trending', undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
}

/**
 * Fetch full trending data including top risers and fallers
 * @returns Promise with full trending market response
 */
export async function getTrendingData(): Promise<TrendingMarketResponse> {
  if (isServer) {
    const response = await apiClient.get<TrendingMarketResponse>(
      MARKET_ENDPOINTS.TRENDING,
      undefined,
      {
        skipAuth: true,
      },
    );
    return response;
  }

  return apiClient.get<TrendingMarketResponse>('/api/data-trending', undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: true,
  });
}

export const marketService = {
  getKlines,
  getKlinesMarket,
  getTrendingMarket,
  getTrendingData,
};
