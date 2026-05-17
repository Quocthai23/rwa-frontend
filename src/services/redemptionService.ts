import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type RedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export type RedemptionRequest = {
  id: string;
  assetId: string;
  userId: string;
  status: RedemptionStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  completedAt?: string | null;
  txHash?: string | null;
};

export const redemptionApi = {
  requestRedeem: async (
    assetId: string,
    accessToken?: string,
  ): Promise<RedemptionRequest> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<RedemptionRequest>(`assets/${assetId}/redeem`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<RedemptionRequest>(`/api/assets/${assetId}/redeem`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },

  getMyRedemptions: async (
    assetId: string,
    accessToken?: string,
  ): Promise<RedemptionRequest[]> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.get<RedemptionRequest[]>(`assets/${assetId}/redemptions/me`, undefined, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.get<RedemptionRequest[]>(`/api/assets/${assetId}/redemptions/me`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    });
  },
};
