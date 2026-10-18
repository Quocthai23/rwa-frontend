import { DIVIDEND_ENDPOINTS } from '../constants/api';
import type { DividendClaim, RentalIncomeDistribution } from '../types/dividend';
import { apiClient } from './apiClient';

/**
 * Dividend Service for RWA System
 */
export const getClaimableDividends = async (
  authHeader?: string,
  type?: 'DIVIDEND' | 'RENTAL_INCOME',
): Promise<DividendClaim[]> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  return apiClient.get<DividendClaim[]>(
    `${DIVIDEND_ENDPOINTS.CLAIMABLE}${type ? `?type=${type}` : ''}`,
    undefined,
    {
      headers,
    },
    true, // useAuth
  );
};

export const payRentalIncome = async (
  assetId: string,
  period?: string,
): Promise<DividendClaim['distribution'] & { id: string; status: string }> =>
  apiClient.post(
    `/dividends/rental-income/${assetId}/pay`,
    period ? { period } : {},
  );

export const getRentalIncomeDistributions = async (
  assetId: string,
): Promise<RentalIncomeDistribution[]> =>
  apiClient.get(`/dividends/rental-income/${assetId}/distributions`);

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

