import { apiClient } from '@/services/apiClient';
import { CLIENT_BASE_URL } from '@/services/baseUrl';

export interface ReferralStatsParams {
  fromDate?: string;
  toDate?: string;
}

export interface ReferralStatsResponse {
  totalAmountInPeriod: string;
  totalReferralCount: string;
}

export interface ReferralMember {
  accountId: string;
  referrerId: string;
  email: string;
  avatar: string | null;
  depth: number;
  joinedAt: string;
  directRefCount: number;
  totalDescendantCount: number;
  hasChildren: boolean;
  volume: Record<string, string>;
}

export interface ReferralMembersPagination {
  skip: number;
  take: number;
  total: number;
  hasNext: boolean;
}

export interface ReferralMembersSummary {
  parentUserId: string;
  viewDepth: number;
  directRefCount: number;
  depthTotalVolume: Record<string, string>;
  volumeUnit: string;
}

export interface ReferralMembersResponse {
  items: ReferralMember[];
  pagination: ReferralMembersPagination;
  summary: ReferralMembersSummary;
}

export interface ReferralMembersParams {
  userId: string;
  skip?: number;
  take?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

const isServer = typeof window === 'undefined';

export const getReferralStats = async (
  params: ReferralStatsParams,
  authHeader?: string,
): Promise<ReferralStatsResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const res = await apiClient.get(
      '/commission/stats',
      params as unknown as Record<string, string | undefined>,
      { headers },
    );
    return res as unknown as ReferralStatsResponse;
  }

  const res = await apiClient.get(
    '/api/commission/stats',
    params as unknown as Record<string, string | undefined>,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
  return res as unknown as ReferralStatsResponse;
};

export const getReferralMembers = async (
  params: ReferralMembersParams,
  authHeader?: string,
): Promise<ReferralMembersResponse> => {
  const query = params as unknown as Record<string, string | number | undefined>;

  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    const res = await apiClient.get('/referrals/members', query, { headers });
    return res as unknown as ReferralMembersResponse;
  }

  const res = await apiClient.get('/api/referrals', query, {
    baseUrl: CLIENT_BASE_URL,
  });
  return res as unknown as ReferralMembersResponse;
};
