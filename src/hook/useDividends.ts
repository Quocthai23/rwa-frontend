'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClaimableDividends, claimDividend } from '@/services/dividendService';
import { useToast } from './useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import i18n from '@/i18n';

/**
 * Hook to retrieve all claimable dividends for the current user
 */
export const useClaimableDividends = () => {
  return useQuery({
    queryKey: ['claimable-dividends'],
    queryFn: () => getClaimableDividends(),
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
    onError: (error: any) => {
      showError(
        t('dividends.claimErrorTitle', { defaultValue: 'Claim Failed' }),
        localizeApiError(error, t) || t('dividends.claimErrorMessage', { defaultValue: 'Unable to claim dividend.' }),
      );
    },
  });
};
