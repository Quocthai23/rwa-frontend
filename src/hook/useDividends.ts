'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClaimableDividends,
  claimDividend,
  getRentalIncomeDistributions,
  payRentalIncome,
  getMyRentalContracts,
  fundRentalWallet,
} from '@/services/dividendService';
import { useToast } from './useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import i18n from '@/i18n';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to retrieve all claimable dividends for the current user
 */
export const useClaimableDividends = (type?: 'DIVIDEND' | 'RENTAL_INCOME', enabled = true) => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['claimable-dividends', type ?? 'all', userId],
    queryFn: () => getClaimableDividends(undefined, type),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to claim a specific dividend distribution
 */
export const useClaimDividend = () => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const t = i18n.t.bind(i18n);

  return useMutation({
    mutationFn: (distributionId: string) => claimDividend(distributionId),
    onSuccess: () => {
      showSuccess(
        t('dividends.claimSuccessTitle', { defaultValue: 'Success' }),
        t('dividends.claimSuccessMessage', {
          defaultValue: 'Dividend successfully claimed!',
        }),
      );
      // Invalidate both dividends and account balance queries
      queryClient.invalidateQueries({ queryKey: ['claimable-dividends'] });
      queryClient.invalidateQueries({ queryKey: ['account-summary'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      for (const key of ['accounts', 'rental-income-distributions', 'asset-action-counts']) void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (error: unknown) => {
      showError(
        t('dividends.claimErrorTitle', { defaultValue: 'Claim Failed' }),
        localizeApiError(error, t) ||
          t('dividends.claimErrorMessage', { defaultValue: 'Unable to claim dividend.' }),
      );
    },
  });
};

export const usePayRentalIncome = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period?: string) => payRentalIncome(assetId, period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset-status', assetId] });
      queryClient.invalidateQueries({ queryKey: ['claimable-dividends'] });
      queryClient.invalidateQueries({ queryKey: ['account-summary'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      for (const key of ['accounts', 'rental-income-distributions', 'asset-action-counts']) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
};

export const useRentalIncomeDistributions = (assetId: string, enabled = true) => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['rental-income-distributions', assetId, userId],
    queryFn: () => getRentalIncomeDistributions(assetId),
    enabled: enabled && Boolean(assetId),
    staleTime: 30_000,
  });
};

export const useMyRentalContracts = (enabled = true) => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['my-rental-contracts-v2', userId],
    queryFn: () => getMyRentalContracts(),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
};

export const useFundRentalWallet = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof fundRentalWallet>[1]) =>
      fundRentalWallet(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-rental-contracts-v2'] });
      queryClient.invalidateQueries({ queryKey: ['asset-status', assetId] });
      queryClient.invalidateQueries({ queryKey: ['account-summary'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['rental-income-distributions'] });
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      // The header reads its balance from the accounts query via useAccountStore.
      return queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
