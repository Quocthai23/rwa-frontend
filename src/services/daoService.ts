import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type ProposalStatus = 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED';

export type DaoProposal = {
  id: string;
  assetId: string;
  title: string;
  description: string;
  status: ProposalStatus;
  proposerId: string;
  createdAt: string;
  snapshotDate: string;
  endDate: string;
  type?: 'GENERAL' | 'INCREASE_RELEASED_TOKEN_PERCENTAGE' | 'BUYOUT_PROPOSAL' | 'RENTAL_ENABLEMENT' | 'RENTAL_APPLICATION';
  viewerCanVote?: boolean;
  viewerHasVoted?: boolean;
  metadata?: Record<string, unknown> | null;
  asset?: { symbol?: string; tokenPrice?: string | number };
  votes?: Array<{ isFor: boolean; votingPower: string | number }>;
  snapshots?: Array<{ userId: string; votingPower: string | number }>;
  _count?: { votes: number };
};

export type BuyoutEscrowState = {
  proposalId: string;
  buyoutId?: string;
  proposalStatus: ProposalStatus;
  isBuyer: boolean;
  mode?: 'DYNAMIC_VND';
  currency?: 'VND';
  terms?: Record<string, unknown> | null;
  schedule?: {
    status: string;
    totalMonths: number;
    monthsCompleted: number;
    nextExecutionAt: string;
    basePriceVnd?: string;
    depositVnd?: string;
    totalConsiderationVnd?: string;
    principalPaidVnd?: string;
    premiumPaidVnd?: string;
    monthlyWaitingRatePercent?: string;
    remainingMinorityTokens?: string;
    claimableAmount: string;
    claimableTokenAmount: string;
    claimablePeriods: number;
    installments?: import('@/types/dao').BuyoutPaymentPeriod[];
  } | null;
  escrow?: {
    status: number;
    assetToken: string;
    buyer: string;
    totalTokens: string;
    lockedTokens: string;
    totalConsideration: string;
    paidConsideration: string;
    depositAmount: string;
    totalInstallments: number;
    installmentsPaid: number;
    fundingDeadline: number;
    nextDueAt: number;
    sellerRoot: string;
    depositFunded: boolean;
  };
  seller?: {
    lockedTokens: string;
    claimablePayment: string;
    tokensRefunded: boolean;
  };
};

export type CreateProposalRequest = {
  title: string;
  description: string;
  snapshotDate: string;
  endDate: string;
  type?: 'GENERAL' | 'INCREASE_RELEASED_TOKEN_PERCENTAGE';
  category?: 'GENERAL' | 'MAINTENANCE' | 'OPERATOR_CHANGE' | 'RENT_CHANGE' | 'ASSET_SALE';
  monthlyRentVnd?: string; depositVnd?: string; maintenanceBudgetVnd?: string; operatorName?: string; operatorContact?: string; salePriceVnd?: string; salePlan?: string;
};

export type VoteProposalRequest = {
  isFor: boolean;
};

export const daoApi = {
  createProposal: async (
    assetId: string,
    payload: CreateProposalRequest,
    accessToken?: string,
  ): Promise<{ success: boolean; data: DaoProposal }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean; data: DaoProposal }>(`assets/${assetId}/proposals`, payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<{ success: boolean; data: DaoProposal }>(`/api/assets/${assetId}/proposals`, payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  voteProposal: async (
    proposalId: string,
    payload: VoteProposalRequest,
    accessToken?: string,
  ): Promise<{ success: boolean; data: { isFor: boolean; votingPower: string | number } }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{
        success: boolean;
        data: { isFor: boolean; votingPower: string | number };
      }>(
        `proposals/${proposalId}/vote`,
        payload,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.post<{
      success: boolean;
      data: { isFor: boolean; votingPower: string | number };
    }>(
      `/api/proposals/${proposalId}/vote`,
      payload,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  getAllProposals: async (accessToken?: string): Promise<DaoProposal[]> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<DaoProposal[]>(`proposals`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<DaoProposal[]>(`/api/proposals`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  getProposals: async (
    assetId: string,
    accessToken?: string,
  ): Promise<DaoProposal[]> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<DaoProposal[]>(`assets/${assetId}/proposals`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<DaoProposal[]>(`/api/assets/${assetId}/proposals`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  getBuyoutState: async (
    proposalId: string,
  ): Promise<BuyoutEscrowState> =>
    apiClient.get<BuyoutEscrowState>(
      `/api/proposals/${proposalId}/buyout`,
      undefined,
      { baseUrl: CLIENT_BASE_URL, skipAuth: false },
    ),

  executeBuyout: async (
    proposalId: string,
    challengeId: string,
  ): Promise<{ success: boolean; data: unknown }> =>
    apiClient.post<{ success: boolean; data: unknown }>(
      `/api/proposals/${proposalId}/buyout/execute`,
      { challengeId },
      { baseUrl: CLIENT_BASE_URL, skipAuth: false },
    ),

  payBuyoutInstallment: async (
    proposalId: string,
    challengeId: string,
  ): Promise<{ success: boolean; data: unknown }> =>
    apiClient.post<{ success: boolean; data: unknown }>(
      `/api/proposals/${proposalId}/buyout/installments`,
      { challengeId },
      { baseUrl: CLIENT_BASE_URL, skipAuth: false },
    ),

  claimBuyoutProceeds: async (
    proposalId: string,
  ): Promise<{ success: boolean; data: unknown }> =>
    apiClient.post<{ success: boolean; data: unknown }>(
      `/api/proposals/${proposalId}/buyout/claims`,
      {},
      { baseUrl: CLIENT_BASE_URL, skipAuth: false },
    ),
};
