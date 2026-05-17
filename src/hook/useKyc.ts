import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import kycService, { SubmitKycRequest } from '@/services/kycService';
import { useToast } from '@/hook/useToast';

export function useKyc() {
  const { showError, showSuccess } = useToast();

  const { data: kycStatus, refetch: refetchKyc, isLoading: isKycLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kycService.getMyKyc(),
  });

  const submitKycMutation = useMutation({
    mutationFn: (data: SubmitKycRequest) => kycService.submitKyc(data),
    onSuccess: () => {
      showSuccess('KYC Submitted', 'Your verification request has been received.');
      refetchKyc();
    },
    onError: (error: any) => {
      showError('Submission Failed', error.message || 'Please try again later.');
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
