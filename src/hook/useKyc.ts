import { useMutation, useQuery } from '@tanstack/react-query';
import kycService, { SubmitKycRequest } from '@/services/kycService';
import { useToast } from '@/hook/useToast';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';

export function useKyc() {
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    data: kycStatus,
    refetch: refetchKyc,
    isLoading: isKycLoading,
  } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kycService.getMyKyc(),
    enabled: isAuthenticated,
  });

  const submitKycMutation = useMutation({
    mutationFn: (data: SubmitKycRequest) => kycService.submitKyc(data),
    onSuccess: () => {
      showSuccess('KYC Submitted', 'Your verification request has been received.');
      refetchKyc();
    },
    onError: (error: unknown) => {
      showError(t('apiErrors.generic'), localizeApiError(error, t));
    },
  });

  return {
    kycStatus,
    isKycLoading,
    refetchKyc,
    submitKyc: submitKycMutation.mutate,
    isSubmitting: submitKycMutation.isPending,
  };
}
