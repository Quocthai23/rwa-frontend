'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';
import { useAuthStore } from '@/store/authStore';

export type AssetActionCounts = { rental: number; governance: number; total: number };
export const useAssetActionCounts = () => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['asset-action-counts', userId],
    queryFn: () => apiClient.get<Record<string, AssetActionCounts>>('/api/asset-management/action-counts', undefined, { baseUrl: CLIENT_BASE_URL, skipAuth: true }),
    enabled: Boolean(userId), staleTime: 15_000, refetchInterval: 30_000,
  });
};
