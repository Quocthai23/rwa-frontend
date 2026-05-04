/**
 * Account Balance React Query Hook
 * Custom hook for fetching account balance data
 */

import { useQuery } from '@tanstack/react-query';

import type { AccountBalanceResponse } from '@/services/accountService';
import { getAccountBalance } from '@/services/accountService';

export const accountBalanceQueryKeys = {
  all: ['account-balance'] as const,
  detail: (accountId: string) => [...accountBalanceQueryKeys.all, accountId] as const,
};

export function useAccountBalance(accountId: string) {
  return useQuery<AccountBalanceResponse>({
    enabled: !!accountId,
    queryFn: () => getAccountBalance(accountId),
    queryKey: accountBalanceQueryKeys.detail(accountId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
