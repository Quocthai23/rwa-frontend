import { DIVIDEND_ENDPOINTS } from '../constants/api';
import type { DividendClaim, RentalIncomeDistribution } from '../types/dividend';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

/**
 * Dividend Service for RWA System
 */
export const getClaimableDividends = async (
  authHeader?: string,
  type?: 'DIVIDEND' | 'RENTAL_INCOME',
): Promise<DividendClaim[]> => {
  if (!isServer && !authHeader) {
    return apiClient.get<DividendClaim[]>(
      `/api${DIVIDEND_ENDPOINTS.CLAIMABLE}`,
      type ? { type } : undefined,
      { baseUrl: CLIENT_BASE_URL, skipAuth: true },
    );
  }

  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  return apiClient.get<DividendClaim[]>(
    `${DIVIDEND_ENDPOINTS.CLAIMABLE}${type ? `?type=${type}` : ''}`,
    undefined,
    {
      headers,
    },
    false,
  );
};

export const payRentalIncome = async (
  assetId: string,
  period?: string,
): Promise<DividendClaim['distribution'] & { id: string; status: string }> =>
  apiClient.post(`/dividends/rental-income/${assetId}/pay`, period ? { period } : {});

export const getRentalIncomeDistributions = async (
  assetId: string,
): Promise<RentalIncomeDistribution[]> =>
  apiClient.get(`/api/dividends/rental-income/${encodeURIComponent(assetId)}/distributions`, undefined, {
    baseUrl: CLIENT_BASE_URL, skipAuth: true,
  });

export type RentalWalletEntry = {
  id: string;
  type: string;
  direction: 'CREDIT' | 'DEBIT';
  amountVnd: string;
  balanceAfterVnd: string;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type TenantRentalContract = {
  id: string;
  assetId: string;
  fundingAccountId?: string | null;
  status: string;
  monthlyRentVnd: string;
  depositVnd: string;
  depositFundedVnd: string;
  walletBalanceVnd: string;
  walletReservedVnd: string;
  fundingDeadlineAt?: string | null;
  nextDueAt?: string | null;
  startDate: string;
  endDate?: string | null;
  autoDebitEnabled: boolean;
  asset: {
    id: string;
    symbol: string;
    name: string;
    location?: string | null;
    logo?: string | null;
  };
  walletEntries: RentalWalletEntry[];
};

export const getMyRentalContracts = async (
  authHeader?: string,
): Promise<TenantRentalContract[]> => {
  if (!isServer && !authHeader) {
    return apiClient.get('/api/dividends/my-rentals', undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  }

  return apiClient.get('/dividends/my-rentals', undefined, {
    headers: authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined,
    skipAuth: !authHeader,
  });
};

export type FundRentalWalletPayload = {
  accountId?: string;
  amountVnd: string;
  idempotencyKey?: string;
  autoDebitEnabled?: boolean;
};

export const fundRentalWallet = async (
  assetId: string,
  payload: FundRentalWalletPayload,
  authHeader?: string,
) => {
  const encodedAssetId = encodeURIComponent(assetId);
  if (!isServer && !authHeader) {
    return apiClient.post(`/api/dividends/rental-wallet/${encodedAssetId}/fund`, payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  }

  return apiClient.post(`/dividends/rental-wallet/${encodedAssetId}/fund`, payload, {
    headers: authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined,
    skipAuth: !authHeader,
  });
};

export const claimDividend = async (
  distributionId: string,
  authHeader?: string,
): Promise<{ success: boolean; message?: string }> => {
  const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
  return apiClient.post<{ success: boolean; message?: string }>(
    `/api/dividends/${encodeURIComponent(distributionId)}/claim`,
    {},
    { headers, baseUrl: CLIENT_BASE_URL, skipAuth: true },
  );
};
