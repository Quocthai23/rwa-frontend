import { DIVIDEND_ENDPOINTS } from '../constants/api';
import type { DividendClaim } from '../types/dividend';
import { apiClient } from './apiClient';

/**
 * Dividend Service for RWA System
 */
export const getClaimableDividends = async (authHeader?: string): Promise<DividendClaim[]> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  return apiClient.get<DividendClaim[]>(
    DIVIDEND_ENDPOINTS.CLAIMABLE,
    undefined,
    {
      headers,
    },
    true, // useAuth
  );
};

export const claimDividend = async (
  distributionId: string,
  authHeader?: string,
): Promise<{ success: boolean; message?: string }> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  return apiClient.post<{ success: boolean; message?: string }>(
    DIVIDEND_ENDPOINTS.CLAIM(distributionId),
    {},
    {
      headers,
    },
  );
};
