import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveAccount,
  createAccount,
  deleteAccount,
  getAccounts,
  getAccountTypes,
  updateAccountName,
} from '@/services/accountService';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import type { Account, CreateAccountRequest } from '@/types/account';

export const useAccounts = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const demo = useAccountStore((state) =>
    Boolean(state.selectedAccount?.accountTypeId.includes('demo')),
  );

  return useQuery<Account[]>({
    enabled: !!userId,
    queryFn: () => getAccounts(userId),
    queryKey: ['accounts', userId],
    staleTime: 10_000,
    refetchInterval: demo ? 5000 : false,
    gcTime: Infinity,
  });
};

export const useAccountTypes = () => {
  return useQuery({
    queryFn: getAccountTypes,
    queryKey: ['accountTypes'],
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => createAccount(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateAccountName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, name }: { accountId: string; name: string }) =>
      updateAccountName(accountId, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const clearSelection = useAccountStore((s) => s.clearSelection);

  return useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId),
    onSuccess: (_data, deletedId) => {
      if (selectedAccount?.id === deletedId) {
        clearSelection();
      }
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useArchiveAccount = () => {
  const queryClient = useQueryClient();
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const clearSelection = useAccountStore((s) => s.clearSelection);

  return useMutation({
    mutationFn: (accountId: string) => archiveAccount(accountId),
    onSuccess: (_data, archivedId) => {
      if (selectedAccount?.id === archivedId) {
        clearSelection();
      }
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
