import { useMutation, useQueryClient } from '@tanstack/react-query';

import { transferAPI } from '@/services/paymentService';
import type { TransferPayload, WithdrawResponse } from '@/types/payment';
import i18n from '@/i18n';
import { localizeApiError } from '@/i18n/apiErrors';

import { useToast } from '../useToast';

/**
 * Validates the transfer payload before sending to API
 * @throws Error if validation fails
 */
function validateTransferPayload(payload: TransferPayload): void {
  // Check if all required fields are present
  if (!payload.fromAccountId || typeof payload.fromAccountId !== 'string') {
    throw new Error('Invalid fromAccountId: must be a non-empty string');
  }

  if (!payload.toAccountId || typeof payload.toAccountId !== 'string') {
    throw new Error('Invalid toAccountId: must be a non-empty string');
  }

  if (!payload.amount || typeof payload.amount !== 'string') {
    throw new Error('Invalid amount: must be a non-empty string');
  }

  if (!payload.chainId || typeof payload.chainId !== 'string') {
    throw new Error('Invalid chainId: must be a non-empty string');
  }

  // Validate amount is a valid number
  const amountNum = Number.parseFloat(payload.amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }

  // Validate amount range
  if (amountNum < 100 || amountNum > 100_000_000) {
    throw new Error('Amount must be between 100 and 100,000,000 USD');
  }

  // Check if transferring to same account
  if (payload.fromAccountId === payload.toAccountId) {
    throw new Error('Cannot transfer to the same account');
  }
}

export function useTransfer() {
  const queryClient = useQueryClient();
  const { showError } = useToast();
  const t = i18n.t.bind(i18n);

  return useMutation<WithdrawResponse, Error, TransferPayload>({
    mutationFn: async (payload: TransferPayload) => {
      // Validate payload before sending to API
      validateTransferPayload(payload);

      return transferAPI(payload);
    },

    onError: (error) => {
      showError(
        t('home.transferFailedTitle'),
        localizeApiError(error, t, 'transfer.form.transferFailed'),
      );
    },

    onSuccess: (data, variables) => {
      // Invalidate account queries to refresh balances
      queryClient.invalidateQueries({
        queryKey: ['accounts'],
      });

      queryClient.invalidateQueries({
        queryKey: ['account', variables.fromAccountId],
      });

      queryClient.invalidateQueries({
        queryKey: ['account', variables.toAccountId],
      });

      // Invalidate payment history
      queryClient.invalidateQueries({
        queryKey: ['paymentHistory'],
      });
    },
  });
}
