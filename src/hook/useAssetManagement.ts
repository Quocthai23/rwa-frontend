import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  getAssetStatus,
  getBuyoutProposals,
  getBuyoutQuote,
  checkEligibility,
  createProposal,
  getContractTemplate,
  getAssetActivity,
  getAssetTransactions,
  getAssetLiquidity,
  getMyRentalApplication,
  submitRentalApplication,
  getRentalApplications,
  reviewRentalApplication,
  createRentalEnablementProposal,
  type ReviewRentalApplicationPayload,
} from '../services/assetManagementService';

export const useAssetStatus = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-status', assetId],
    queryFn: () => getAssetStatus(assetId),
    enabled: !!assetId,
  });
};

export const useAssetTransactions = (assetId: string) =>
  useQuery({
    queryKey: ['asset-transactions', assetId],
    queryFn: () => getAssetTransactions(assetId),
    enabled: !!assetId,
  });

export const useAssetActivity = (assetId: string) =>
  useQuery({
    queryKey: ['asset-activity', assetId],
    queryFn: () => getAssetActivity(assetId),
    enabled: !!assetId,
  });

export const useAssetLiquidity = (assetId: string) =>
  useQuery({
    queryKey: ['asset-liquidity', assetId],
    queryFn: () => getAssetLiquidity(assetId),
    enabled: !!assetId,
    refetchInterval: 15_000,
  });

export const useMyRentalApplication = (assetId: string, enabled = true) => {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ['rental-application', assetId, userId],
    queryFn: () => getMyRentalApplication(assetId),
    enabled: enabled && Boolean(assetId && userId),
  });
};

export const useBuyoutProposals = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-buyout-proposals', assetId],
    queryFn: () => getBuyoutProposals(assetId),
    enabled: !!assetId,
  });
};

export const useAssetProposals = (assetId: string) => {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['asset-proposals', assetId, userId],
    queryFn: () => daoApi.getProposals(assetId),
    enabled: Boolean(assetId && userId),
  });
};

export const useBuyoutQuote = (
  assetId: string,
  durationMonths: number,
  premiumPercent?: number,
  enabled = true,
) => {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ['asset-buyout-quote', assetId, durationMonths, premiumPercent, userId],
    queryFn: () => getBuyoutQuote(assetId, durationMonths, premiumPercent),
    enabled: enabled && Boolean(assetId && userId) && Number.isInteger(durationMonths),
  });
};

export const useEligibility = (assetId: string) => {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ['asset-eligibility', assetId, userId],
    queryFn: () => checkEligibility(assetId),
    enabled: Boolean(assetId && userId),
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { daoApi, VoteProposalRequest } from '../services/daoService';

export const useVoteProposal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ proposalId, payload }: { proposalId: string; payload: VoteProposalRequest }) =>
      daoApi.voteProposal(proposalId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-buyout-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['asset-proposals'] });
      void queryClient.invalidateQueries({ queryKey: ['asset-status'] });
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};

export const useCreateProposal = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      durationMonths: number;
      premiumPercent: number;
      revisionOfId?: string;
    }) => createProposal(assetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-buyout-proposals', assetId] });
      void queryClient.invalidateQueries({ queryKey: ['asset-proposals', assetId] });
    },
  });
};

export const useCreateGovernanceProposal = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../services/daoService').CreateProposalRequest) =>
      daoApi.createProposal(assetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-proposals', assetId] });
    },
  });
};

export const useSubmitRentalApplication = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof submitRentalApplication>[1]) =>
      submitRentalApplication(assetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['rental-application', assetId] });
    },
  });
};

export const useCreateRentalEnablementProposal = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createRentalEnablementProposal>[1]) =>
      createRentalEnablementProposal(assetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-proposals', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-status', assetId] });
    },
  });
};

export const useRentalApplications = (assetId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['rental-applications', assetId],
    queryFn: () => getRentalApplications(assetId),
    enabled: enabled && !!assetId,
  });

export const useReviewRentalApplication = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: ReviewRentalApplicationPayload;
    }) => reviewRentalApplication(assetId, applicationId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset-action-counts'] });
      queryClient.invalidateQueries({ queryKey: ['rental-applications', assetId] });
      queryClient.invalidateQueries({ queryKey: ['rental-application', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-status', assetId] });
    },
  });
};

export const useContractTemplate = (type: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['contract-template', type],
    queryFn: () => getContractTemplate(type),
    enabled: enabled && !!type,
  });
};
