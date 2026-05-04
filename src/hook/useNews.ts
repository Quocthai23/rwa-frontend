/**
 * News React Query Hooks
 * Custom hooks for fetching news data with caching
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@/constants/api';
import { newsService } from '@/services/newsService';
import type { GetNewsListRequest, NewsDataResponse, NewsListResponse } from '@/types';

export const newsQueryKeys = {
  aggregated: (parameters?: { language?: string; limit?: number; page?: number }) =>
    [...newsQueryKeys.all, 'aggregated', parameters] as const,
  all: ['news'] as const,
  list: (parameters?: GetNewsListRequest) => [...newsQueryKeys.all, 'list', parameters] as const,
  topics: () => [...newsQueryKeys.all, 'topics'] as const,
};

export function useAggregatedNews(parameters?: {
  language?: string;
  limit?: number;
  page?: number;
}) {
  return useQuery<NewsListResponse>({
    queryFn: () => newsService.getAggregatedNews(parameters),
    queryKey: newsQueryKeys.aggregated(parameters),
    staleTime: CACHE_TIMES.NEWS,
  });
}

export function useNewsList(parameters?: GetNewsListRequest) {
  return useQuery<NewsDataResponse>({
    queryFn: () => newsService.getNewsList(parameters),
    queryKey: newsQueryKeys.list(parameters),
    staleTime: CACHE_TIMES.NEWS,
  });
}

export function useNewsTopics() {
  return useQuery<string[]>({
    queryFn: () => newsService.getNewsTopics(),
    queryKey: newsQueryKeys.topics(),
    staleTime: CACHE_TIMES.NEWS,
  });
}
