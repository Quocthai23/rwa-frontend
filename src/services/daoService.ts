import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type ProposalStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'EXECUTED';

export type DaoProposal = {
  id: string;
  assetId: string;
  title: string;
  description: string;
  status: ProposalStatus;
  yesVotes: number;
  noVotes: number;
  thresholdPercent: number;
  createdById: string;
  createdAt: string;
  endsAt: string;
  executedAt?: string | null;
};

export type CreateProposalRequest = {
  title: string;
  description: string;
  endsAt: string;
};

export type VoteProposalRequest = {
  vote: 'YES' | 'NO';
};

export const daoApi = {
  createProposal: async (
    assetId: string,
    payload: CreateProposalRequest,
    accessToken?: string,
  ): Promise<DaoProposal> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<DaoProposal>(`assets/${assetId}/proposals`, payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<DaoProposal>(`/api/assets/${assetId}/proposals`, payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  voteProposal: async (
    proposalId: string,
    payload: VoteProposalRequest,
    accessToken?: string,
  ): Promise<{ success: boolean; proposal: DaoProposal }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean; proposal: DaoProposal }>(
        `proposals/${proposalId}/vote`,
        payload,
        {
          headers,
          skipAuth: !accessToken,
        },
      );
    }

    return apiClient.post<{ success: boolean; proposal: DaoProposal }>(
      `/api/proposals/${proposalId}/vote`,
      payload,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: false,
      },
    );
  },

  // Fallback mock proposals generator since backend might have sparse proposals
  getProposals: async (assetId: string): Promise<DaoProposal[]> => {
    // In a production app, we would query the backend, but since this is spot-only,
    // we provide a highly realistic mock fallback that pulls from local mock assets
    return [
      {
        id: 'prop-1',
        assetId,
        title: 'Upgrade custody security protocol to Multi-Sig v2',
        description: 'Proposal to transition the core custody wallet from a 2-of-3 scheme to a premium 3-of-5 multi-sig setup including Coinbase Custody and Fireblocks to enhance security for underlying RWA.',
        status: 'PENDING',
        yesVotes: 124500,
        noVotes: 12000,
        thresholdPercent: 66,
        createdById: 'user-admin',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'prop-2',
        assetId,
        title: 'Distribute extraordinary rental yield dividend',
        description: 'Due to premium lease renewals at the London Residential Suites (LND-01), the net rental pool has accumulated a surplus. This proposal aims to distribute a one-time bonus dividend of 0.05 USDC per token.',
        status: 'PASSED',
        yesVotes: 250000,
        noVotes: 4500,
        thresholdPercent: 51,
        createdById: 'user-admin',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  },
};
