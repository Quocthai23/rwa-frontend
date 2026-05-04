import { COMMISSION_ENDPOINTS } from '@/constants/api';
import {
  ClaimRewardsPayload,
  ClaimRewardsResponse,
  RebateDetailItem,
  RebateStatsData,
  UnclaimedAmountData,
} from '@/types/reward.types';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export const getRebateStats = async (authHeader?: string): Promise<RebateStatsData> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<RebateStatsData>(COMMISSION_ENDPOINTS.REBATE_STATS, undefined, {
      headers,
    });
  }

  return apiClient.get<RebateStatsData>(`/api/${COMMISSION_ENDPOINTS.REBATE_STATS}`, undefined, {
    baseUrl: CLIENT_BASE_URL,
  });
};

export const getRebateDetails = async (authHeader?: string): Promise<RebateDetailItem[]> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<RebateDetailItem[]>(COMMISSION_ENDPOINTS.REBATE_DETAILS, undefined, {
      headers,
    });
  }

  return apiClient.get<RebateDetailItem[]>(
    `/api/${COMMISSION_ENDPOINTS.REBATE_DETAILS}`,
    undefined,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
};

export const getUnclaimedAmount = async (
  params?: { fromDate?: string; toDate?: string },
  authHeader?: string,
): Promise<RebateStatsData> => {
  const hasFrom = Boolean(params?.fromDate);
  const hasTo = Boolean(params?.toDate);
  if (hasFrom !== hasTo) {
    throw new Error('fromDate and toDate must be provided together or both omitted');
  }

  const query =
    params?.fromDate && params?.toDate
      ? { fromDate: params.fromDate, toDate: params.toDate }
      : undefined;

  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<RebateStatsData>(COMMISSION_ENDPOINTS.COMMISSION_STATS, query, {
      headers,
    });
  }

  return apiClient.get<RebateStatsData>(`/api/${COMMISSION_ENDPOINTS.COMMISSION_STATS}`, query, {
    baseUrl: CLIENT_BASE_URL,
  });
};

export const claimRewards = async (
  payload: ClaimRewardsPayload,
  authHeader?: string,
): Promise<ClaimRewardsResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.post<ClaimRewardsResponse>(COMMISSION_ENDPOINTS.CLAIM, payload, {
      headers,
    });
  }

  return apiClient.post<ClaimRewardsResponse>(`/api/${COMMISSION_ENDPOINTS.CLAIM}`, payload, {
    baseUrl: CLIENT_BASE_URL,
  });
};

export interface CommissionResponse {
  receiverId: string;
  totalAmount: string;
  details: Array<{
    email: string;
    volumes: Array<{
      symbol: string;
      quantity: string;
      amount: string;
    }>;
  }>;
}

export const getCommission = async (
  params?: { fromDate?: string; toDate?: string },
  authHeader?: string,
): Promise<CommissionResponse> => {
  if (isServer) {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<CommissionResponse>('commission', params, {
      headers,
    });
  }

  return apiClient.get<CommissionResponse>('/api/commission', params, {
    baseUrl: CLIENT_BASE_URL,
  });
};
