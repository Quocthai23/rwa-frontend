import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ApiError } from '@/services/apiClient';
import { createWallet } from '@/services/paymentService';
import { type CreateWalletPayload, type CreateWalletResponse } from '@/types/payment';
import i18n from '@/i18n';
import { localizeApiError } from '@/i18n/apiErrors';

import { useToast } from '../useToast';
export const useCreateWallet = () => {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const t = i18n.t.bind(i18n);

  return useMutation<CreateWalletResponse, ApiError, CreateWalletPayload>({
    mutationFn: (payload) => createWallet(payload),

    onError: (error) => {
      showError(t('apiErrors.generic'), localizeApiError(error, t));
    },

    onSuccess: (data, variables) => {
      // Invalidate wallet queries
      queryClient.invalidateQueries({
        queryKey: ['wallet', variables.accountId],
      });
    },
  });
};
