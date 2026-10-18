import { NEWS_ENDPOINTS, PAGINATION } from '../constants/api';
import type { GetNewsListRequest, NewsDataResponse, NewsItem, NewsListResponse } from '../types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type GetAggregatedNewsParameters = {
  language?: string;
  take?: number;
  skip?: number;
};

export const newsService = {
  async getAggregatedNews(parameters: GetAggregatedNewsParameters = {}): Promise<NewsListResponse> {
    const { take = PAGINATION.DEFAULT_LIMIT, skip = 0 } = parameters;

    try {
      const response = await this.getNewsList({ skip, take });
      return {
        data: (response.data || []) as unknown as NewsItem[],
        limit: take,
        page: Math.floor(skip / take) + 1,
        total: response.total ?? 0,
      };
    } catch (error) {
      console.error('Error fetching aggregated news:', error);
      return { data: [], limit: take, page: Math.floor(skip / take) + 1, total: 0 };
    }
  },

  async getMultiSourceNews(
    sources: ('bloomberg' | 'reuters' | 'tradingeconomics')[],
    limit = 10,
  ): Promise<NewsListResponse> {
    try {
      const response = await this.getNewsList({ skip: 0, take: limit });
      return {
        data: (response.data || []) as unknown as NewsItem[],
        limit,
        page: 1,
        total: response.total ?? 0,
      };
    } catch (error) {
      console.error('Error fetching multi-source news:', error);
      return { data: [], limit, page: 1, total: 0 };
    }
  },

  async getNewsList(parameters?: GetNewsListRequest): Promise<NewsDataResponse> {
    const searchParameters: Record<string, string> = {};

    if (parameters?.take !== undefined) searchParameters.limit = String(parameters.take);
    // Backend doesn't support numeric skip, only cursor. 
    // If skip is provided, we might have to fetch more and slice, but let's stick to limit for now.
    
    if (parameters?.topics?.length) {
      // Backend expects a single source per request currently in NewsController.findAll
      searchParameters.source = parameters.topics[0];
    }

    return apiClient.get<NewsDataResponse>(
      isServer ? NEWS_ENDPOINTS.LIST : '/api/news',
      searchParameters,
      { 
        baseUrl: isServer ? undefined : CLIENT_BASE_URL, 
        skipAuth: true 
      },
      true,
    );
  },

  async getNewsTopics(): Promise<string[]> {
    try {
      const sources = await apiClient.get<any[]>(
        isServer ? NEWS_ENDPOINTS.SOURCES : '/api/news/topics',
        undefined,
        { baseUrl: isServer ? undefined : CLIENT_BASE_URL, skipAuth: true }
      );
      // Return source IDs as "topics"
      return sources.map(s => s.id || s);
    } catch (error) {
      console.error('Error fetching news sources:', error);
      return [];
    }
  },
};

