import { useMutation, useQueryClient } from '@tanstack/react-query';
import { withdraw } from '@/services/paymentService';
import type { WithdrawPayload } from '@/types/payment';

/**
 * Validates the withdraw payload before sending to API
 * @throws Error if validation fails
 */
function validateWithdrawPayload(payload: WithdrawPayload): void {
  // Check if all required fields are present
  if (!payload.accountId || typeof payload.accountId !== 'string') {
    throw new Error('Invalid accountId: must be a non-empty string');
  }

  if (!payload.address || typeof payload.address !== 'string') {
    throw new Error('Invalid address: must be a non-empty string');
  }

  if (!payload.chainId || typeof payload.chainId !== 'string') {
    throw new Error('Invalid chainId: must be a non-empty string');
  }

  if (!payload.amount || typeof payload.amount !== 'string') {
    throw new Error('Invalid amount: must be a non-empty string');
  }

  // Validate amount is a valid number
  const amountNum = parseFloat(payload.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error('Invalid amount: must be a positive number');
  }

  // Validate address format (basic check for blockchain address)
  const addressPattern = /^0x[a-fA-F0-9]{40}$|^[a-zA-Z0-9]{26,44}$/;
  if (!addressPattern.test(payload.address)) {
    throw new Error('Invalid address: must be a valid blockchain address');
  }

  // Trim whitespace from string fields
  payload.accountId = payload.accountId.trim();
  payload.address = payload.address.trim();
  payload.chainId = payload.chainId.trim();
  payload.amount = payload.amount.trim();
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WithdrawPayload) => {
      // Validate payload before sending to API
      validateWithdrawPayload(payload);
      return withdraw(payload);
    },
    onSuccess: () => {
      // Invalidate all paymentHistory queries
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
    },
  });
}
