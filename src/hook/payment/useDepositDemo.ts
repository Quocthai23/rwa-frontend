import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type ApiError } from '@/services/apiClient';
import { depositDemo } from '@/services/paymentService';
import { type DepositDemoPayload, type DepositDemoResponse } from '@/types/payment';

export const useDepositDemo = () => {
  const queryClient = useQueryClient();

  return useMutation<DepositDemoResponse, ApiError, DepositDemoPayload>({
    mutationFn: async (variables) => {
      return depositDemo({ accountId: variables.accountId });
    },

    onError: (error) => {
      // showError('Deposit failed', error.code);
    },

    onSuccess: (data, variables) => {
      // Invalidate balance queries
      queryClient.invalidateQueries({
        queryKey: ['balance', variables.accountId],
      });

      // Invalidate account queries if needed
      queryClient.invalidateQueries({
        queryKey: ['account', variables.accountId],
      });
    },
  });
};
