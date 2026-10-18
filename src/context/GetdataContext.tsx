'use client';

import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { IS_APP_PRODUCTION } from '@/constants/env';
import { useAccounts } from '@/hook/useAccount';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { authApi } from '@/services/auth';
import { getAssets } from '@/services/assetsService';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { Asset } from '@/types';
import type { User } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';

interface GetdataContextType {
  assets: Asset[] | undefined;
  errorMe: Error | null;
  isLoadingAssets: boolean;
  isLoadingMe: boolean;
  me: User | undefined;
  refetchAssets: () => void;
  refetchMe: () => Promise<{ data: User | undefined }>;
  isFetchingAssets: boolean;
  errorAssets: Error | null;
  isFetchingMe: boolean;
}

const GetdataContext = createContext<GetdataContextType | undefined>(undefined);

interface GetdataProviderProps {
  children: ReactNode;
}

export function GetdataProvider({ children }: GetdataProviderProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authUser = useAuthStore((state) => state.user);
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const hasHydratedAuth = useAuthHydrated();
  const { data: accounts } = useAccounts();
  const setAccounts = useAccountStore((state) => state.setAccounts);
  const selectAccount = useAccountStore((state) => state.selectAccount);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const useAssets = () => {
    return useQuery({
      queryFn: async () => {
        const result = await getAssets();

        return result;
      },
      enabled: hasHydratedAuth,
      queryKey: ['assets', authUser?.id ?? (isAuthenticated ? 'authenticated' : 'guest')],
    });
  };

  const useMe = () => {
    return useQuery({
      enabled: hasHydratedAuth && isAuthenticated,
      queryFn: async () => authApi.getMe(),
      queryKey: ['me', authUser?.id ?? 'unknown'],
    });
  };

  const {
    data: me,
    isLoading: isLoadingMe,
    refetch: refetchMe,
    isFetching: isFetchingMe,
    error: errorMe,
  } = useMe();

  const resolvedMe = useMemo<User | undefined>(() => {
    if (!hasHydratedAuth || !isAuthenticated) {
      return undefined;
    }

    return me ?? authUser;
  }, [authUser, hasHydratedAuth, isAuthenticated, me]);

  const {
    data: assets,
    isLoading: isLoadingAssets,
    refetch: refetchAssets,
    isFetching: isFetchingAssets,
    error: errorAssets,
  } = useAssets();

  useEffect(() => {
    if (!me) {
      return;
    }

    updateAuthUser(me);
  }, [me, updateAuthUser]);

  useEffect(() => {
    if (accounts) {
      const availableAccounts = IS_APP_PRODUCTION
        ? accounts.filter((account) => account.accountTypeId !== ACCOUNT_TYPES_ID.DEMO)
        : accounts;
      setAccounts(availableAccounts);

      if (availableAccounts.length === 0) {
        return;
      }

      const isSelectedValid =
        selectedAccount && availableAccounts.some((a) => a.id === selectedAccount.id);

      if (!selectedAccount || !isSelectedValid) {
        const accountLive =
          availableAccounts.find((a) => a.accountTypeId === ACCOUNT_TYPES_ID.STANDARD) ||
          availableAccounts[0];
        selectAccount(accountLive);
      }
    }
  }, [accounts, selectedAccount, selectAccount, setAccounts]);

  return (
    <GetdataContext.Provider
      value={{
        assets,
        isLoadingAssets,
        refetchAssets,
        isFetchingAssets,
        errorAssets,
        me: resolvedMe,
        isLoadingMe,
        refetchMe,
        isFetchingMe,
        errorMe,
      }}
    >
      {children}
    </GetdataContext.Provider>
  );
}

export function useGetData() {
  const context = useContext(GetdataContext);
  if (context === undefined) {
    throw new Error('useGetData must be used within a GetdataProvider');
  }
  return context;
}
