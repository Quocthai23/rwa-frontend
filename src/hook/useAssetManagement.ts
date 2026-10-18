import { useQuery } from '@tanstack/react-query';
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

export const useMyRentalApplication = (assetId: string, enabled = true) =>
  useQuery({
    queryKey: ['rental-application', assetId],
    queryFn: () => getMyRentalApplication(assetId),
    enabled: enabled && !!assetId,
  });

export const useBuyoutProposals = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-buyout-proposals', assetId],
    queryFn: () => getBuyoutProposals(assetId),
    enabled: !!assetId,
  });
};

export const useAssetProposals = (assetId: string) =>
  useQuery({
    queryKey: ['asset-proposals', assetId],
    queryFn: () => daoApi.getProposals(assetId),
    enabled: !!assetId,
  });

export const useBuyoutQuote = (
  assetId: string,
  durationMonths: number,
  premiumPercent?: number,
  enabled = true,
) =>
  useQuery({
    queryKey: ['asset-buyout-quote', assetId, durationMonths, premiumPercent],
    queryFn: () => getBuyoutQuote(assetId, durationMonths, premiumPercent),
    enabled: enabled && !!assetId && Number.isInteger(durationMonths),
  });

export const useEligibility = (assetId: string) => {
  return useQuery({
    queryKey: ['asset-eligibility', assetId],
    queryFn: () => checkEligibility(assetId),
    enabled: !!assetId,
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
      queryClient.invalidateQueries({ queryKey: ['asset-buyout-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['asset-proposals'] });
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
    }) =>
      createProposal(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-buyout-proposals', assetId] });
    },
  });
};

export const useCreateGovernanceProposal = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../services/daoService').CreateProposalRequest) =>
      daoApi.createProposal(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-proposals', assetId] });
    },
  });
};

export const useSubmitRentalApplication = (assetId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message?: string; desiredStartDate?: string }) =>
      submitRentalApplication(assetId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-application', assetId] });
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
