import { ACCOUNTS_ENDPOINTS } from '../constants/api';
import type {
  Account,
  AccountType,
  AccountTypesResponse,
  CreateAccountRequest,
} from '../types/account';

import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

export type AccountBalanceResponse = {
  accountId: string;
  currentBalance: string;
  pnl: string;
};
const isServer = typeof window === 'undefined';

export const getAccounts = async (accessToken?: string): Promise<Account[]> => {
  if (isServer) {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    const response = await apiClient.get<{ accounts: Account[] }>(
      ACCOUNTS_ENDPOINTS.LIST,
      undefined,
      {
        headers,
        skipAuth: !accessToken,
      },
    );

    return (response as { accounts: Account[] }).accounts || [];
  }

  return apiClient.get<Account[]>('/api/accounts', undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

export const getAccountTypes = async (): Promise<AccountType[]> => {
  try {
    const response = await apiClient.get<AccountTypesResponse>(
      ACCOUNTS_ENDPOINTS.TYPES,
      undefined,
      {
        skipAuth: true,
      },
    );

    return response.accountTypes;
  } catch (error) {
    console.error('Error fetching account types:', error);
    throw error;
  }
};

export const createAccount = async (data: CreateAccountRequest): Promise<Account> => {
  try {
    const response = await apiClient.post<Account>(
      ACCOUNTS_ENDPOINTS.CREATE,
      data as CreateAccountRequest,
    );

    return response;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const deleteAccount = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(ACCOUNTS_ENDPOINTS.DELETE(id));
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const updateAccountName = async (id: string, name: string): Promise<Account> => {
  try {
    const response = await apiClient.patch<Account>(ACCOUNTS_ENDPOINTS.UPDATE(id), { name });

    return response;
  } catch (error) {
    console.error('Error updating account name:', error);
    throw error;
  }
};

export const archiveAccount = async (id: string): Promise<Account> => {
  try {
    const response = await apiClient.patch<Account>(ACCOUNTS_ENDPOINTS.UPDATE(id), {
      isArchived: true,
    });

    return response;
  } catch (error) {
    console.error('Error archiving account:', error);
    throw error;
  }
};

