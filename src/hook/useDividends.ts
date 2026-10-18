'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getClaimableDividends,
  claimDividend,
  getRentalIncomeDistributions,
  payRentalIncome,
} from '@/services/dividendService';
import { useToast } from './useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import i18n from '@/i18n';

/**
 * Hook to retrieve all claimable dividends for the current user
 */
export const useClaimableDividends = (
  type?: 'DIVIDEND' | 'RENTAL_INCOME',
  enabled = true,
) => {
  return useQuery({
    queryKey: ['claimable-dividends', type ?? 'all'],
    queryFn: () => getClaimableDividends(undefined, type),
    enabled,
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
    },
    onError: (error: unknown) => {
      showError(
        t('dividends.claimErrorTitle', { defaultValue: 'Claim Failed' }),
        localizeApiError(error, t) || t('dividends.claimErrorMessage', { defaultValue: 'Unable to claim dividend.' }),
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
    },
  });
};

export const useRentalIncomeDistributions = (assetId: string, enabled = true) =>
  useQuery({
    queryKey: ['rental-income-distributions', assetId],
    queryFn: () => getRentalIncomeDistributions(assetId),
    enabled: enabled && Boolean(assetId),
    staleTime: 30_000,
  });
