import { useMutation } from '@tanstack/react-query';

import { type ApiError } from '@/services/apiClient';
import { payosCheckout } from '@/services/paymentService';
import { type PayosCheckoutPayload, type PayosCheckoutResponse } from '@/types/payment';
import i18n from '@/i18n';
import { localizeApiError } from '@/i18n/apiErrors';
import { useToast } from '../useToast';

export const useGeneratePayosLink = () => {
  const { showError } = useToast();
  const t = i18n.t.bind(i18n);

  return useMutation<PayosCheckoutResponse, ApiError, PayosCheckoutPayload>({
    mutationFn: (payload) => payosCheckout(payload),
    onError: (error) => {
      console.error('PAYOS CHECKOUT ERROR:', error);
      showError(t('apiErrors.generic'), localizeApiError(error, t));
    },
  });
};
