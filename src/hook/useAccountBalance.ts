/**
 * Account Balance React Query Hook
 * Custom hook for fetching account balance data
 */

import { useAccounts } from '@/hook/useAccount';

export type AccountBalanceResponse = {
  accountId: string;
  currentBalance: string;
  pnl: string;
};

export function useAccountBalance(accountId: string) {
  const { data: accounts, refetch, dataUpdatedAt, isFetching } = useAccounts();
  const account = accounts?.find((acc) => acc.id === accountId);

  const data = account
    ? {
        accountId: account.id,
        currentBalance: account.balance,
        pnl: '0',
      }
    : undefined;

  return {
    data,
    refetch,
    dataUpdatedAt,
    isFetching,
  };
}
