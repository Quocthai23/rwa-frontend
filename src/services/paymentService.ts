import {
  type CreateWalletPayload,
  type CreateWalletResponse,
  type DepositDemoPayload,
  type DepositDemoResponse,
  type WithdrawPayload,
  type WithdrawResponse,
  type GetPaymentHistoryParams,
  type GetPaymentHistoryResponse,
  type TransferPayload,
} from '../types/payment';

import { apiClient } from './apiClient';
import { PAYMENT_ENDPOINTS } from '../constants/api';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export const depositDemo = async (payload: DepositDemoPayload, accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    return apiClient.post<DepositDemoResponse>(PAYMENT_ENDPOINTS.DEPOSIT_DEMO, payload, {
      headers,
      skipAuth: !accessToken,
    });
  }

  return apiClient.post<DepositDemoResponse>('/api/payment/deposit-demo', payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

export const createWallet = (payload: CreateWalletPayload, accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.post<CreateWalletResponse>(PAYMENT_ENDPOINTS.CREATE_WALLET, payload, {
      headers,
      skipAuth: !accessToken,
    });
  }

  return apiClient.post<CreateWalletResponse>('/api/payment/create-wallet', payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

export const withdraw = (payload: WithdrawPayload, accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.post<WithdrawResponse>(PAYMENT_ENDPOINTS.WITHDRAW, payload, {
      headers,
      skipAuth: !accessToken,
    });
  }

  return apiClient.post<WithdrawResponse>('/api/payment/withdraw', payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: !accessToken,
  });
};

export const transferAPI = (payload: TransferPayload, accessToken?: string) => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.post<{ success: boolean }>(PAYMENT_ENDPOINTS.TRANSFER, payload, {
      headers,
      skipAuth: !accessToken,
    });
  }

  return apiClient.post<{ success: boolean }>('/api/payment/transfer', payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

function normalizePaymentHistoryParameters(parameters: GetPaymentHistoryParams) {
  const { take = 20, skip = 0, type, status, ...rest } = parameters;

  return {
    skip,
    take,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...rest,
  };
}

export const getPaymentHistoryAPI = async (
  parameters: GetPaymentHistoryParams,
  accessToken?: string,
): Promise<GetPaymentHistoryResponse> => {
  const normalized = normalizePaymentHistoryParameters(parameters);

  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    return apiClient.get<GetPaymentHistoryResponse>(
      PAYMENT_ENDPOINTS.HISTORY,
      normalized as Record<string, string | number>,
      {
        headers,
        skipAuth: !accessToken,
      },
      true,
    );
  }

  return apiClient.get<GetPaymentHistoryResponse>(
    '/api/payment/history',
    normalized as Record<string, string | number>,
    {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    },
    true,
  );
};
