'use client';
import { useAccountStore } from '@/store/useAccountStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';
import { useAuthStore } from '@/store/authStore';

export type AssetActionCounts = { rental: number; governance: number; total: number };
export const useAssetActionCounts = () => {
  const demo = useAccountStore((s) => Boolean(s.selectedAccount?.accountTypeId.includes('demo')));
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['asset-action-counts', userId, demo],
    queryFn: () =>
      apiClient.get<Record<string, AssetActionCounts>>(
        '/api/asset-management/action-counts',
        undefined,
        { baseUrl: CLIENT_BASE_URL, skipAuth: true },
      ),
    enabled: Boolean(userId) && !demo,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
};
