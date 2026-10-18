import { useMutation } from '@tanstack/react-query';
import { payosCheckout } from '../../services/paymentService';

export const usePayosCheckout = () => {
  return useMutation({
    mutationFn: (payload: { accountId: string; amount: number }) => payosCheckout(payload),
  });
};
