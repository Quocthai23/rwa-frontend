import type {
  LoginResponse,
  RegisterResponse,
  UpdateReferralPayload,
  UpdateReferralResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
  User,
} from '../types/auth';
import type { TransferPayload } from '../types/payment';

import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';
const encodePathSegment = (value: string): string => encodeURIComponent(value);

type JsonValue = boolean | null | number | string;
type JsonObject = {
  [key: string]: JsonObject | JsonValue | JsonValue[];
};

export const authApi = {
  updateProfile: async (
    payload: UpdateProfilePayload,
    accessToken?: string,
  ): Promise<UpdateProfileResponse> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<UpdateProfileResponse>('user', payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<UpdateProfileResponse>('/api/user', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  getMe: async (accessToken?: string | null): Promise<User> => {
    const normalizeMe = (res: User): User => ({
      ...res,
      avatar: res.avatar ?? null,
      gender: res.gender ?? null,
      hasPassword: Boolean(res.hasPassword),
    });

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const res = await apiClient.get<User>('user/me', undefined, {
        headers,
        skipAuth: !accessToken,
        baseUrl: CLIENT_BASE_URL,
      });
      return normalizeMe(res);
    }

    const res = (await apiClient.get<User>('/api/user/me', undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    })) as User;
    return normalizeMe(res);
  },

  getUserId: async (userId: string, accessToken?: string): Promise<User> => {
    const encodedUserId = encodePathSegment(userId);

    if (isServer) {
      return apiClient.get<User>(`user/profile/${encodedUserId}`, undefined, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        skipAuth: !accessToken,
      });
    }
    return apiClient.get<User>(`/api/user/${encodedUserId}`, undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  deleteMe: async (accessToken?: string): Promise<{ success: boolean }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.delete<{ success: boolean }>('user/me', undefined, {
        headers,
        skipAuth: !accessToken,
        baseUrl: CLIENT_BASE_URL,
      });
    }

    return apiClient.delete<{ success: boolean }>('/api/user/me', undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  updateReferral: async (
    payload: UpdateReferralPayload,
    accessToken?: string,
  ): Promise<UpdateReferralResponse> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.patch<UpdateReferralResponse>('user/referral', payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.patch<UpdateReferralResponse>('/api/user/referral', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  checkEmail: async (email: string): Promise<{ exists: boolean }> => {
    if (isServer) {
      return apiClient.post<{ exists: boolean }>('auth/check-email', { email }, { skipAuth: true });
    }

    return apiClient.post<{ exists: boolean }>(
      '/api/auth/register/check-email',
      { email },
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  },

  checkReferenceCode: async (
    referenceCode: string,
  ): Promise<{ exists: boolean; isValid: boolean }> => {
    if (isServer) {
      return apiClient.post<{ exists: boolean; isValid: boolean }>(
        'auth/check-reference-code',
        { referenceCode },
        { skipAuth: true },
      );
    }

    return apiClient.post<{ exists: boolean; isValid: boolean }>(
      '/api/auth/register/check-reference-code',
      { referenceCode },
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  },

  login: async (payload: { email: string; password: string }): Promise<LoginResponse> => {
    if (isServer) {
      const data = await apiClient.post<LoginResponse>('auth/login', payload, {
        skipAuth: true,
      });
      return data;
    }

    return apiClient.post<LoginResponse>('/api/auth/login', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  loginSocial: async (payload: { idToken: string; provider: string }): Promise<LoginResponse> => {
    if (isServer) {
      return apiClient.post<LoginResponse>('auth/login-with-social', payload, {
        skipAuth: true,
      });
    }

    return apiClient.post<LoginResponse>('/api/auth/login-with-social', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  logout: async (): Promise<{ success: boolean }> => {
    if (isServer) {
      await apiClient.post<{ success: boolean }>('auth/logout', undefined);
      return { success: true };
    }

    return apiClient.post<{ success: boolean }>('/api/auth/logout', undefined, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  refreshToken: async (payload: {
    refreshToken: string;
  }): Promise<{ accessToken?: string; refreshToken?: string }> => {
    if (isServer) {
      return apiClient.post<{ accessToken?: string; refreshToken?: string }>(
        'auth/refresh',
        payload,
        { skipAuth: true },
      );
    }

    return apiClient.post<{ accessToken?: string; refreshToken?: string }>(
      '/api/auth/refresh',
      payload,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  },

  register: async (payload: {
    avatar?: null | string;
    password: string;
    referenceCode?: string;
    registerToken: string;
    username?: string;
  }): Promise<RegisterResponse> => {
    if (isServer) {
      return apiClient.post<RegisterResponse>('auth/register', payload, {
        skipAuth: true,
      });
    }

    return apiClient.post<RegisterResponse>('/api/auth/register', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: true,
    });
  },

  sendOTP: async (
    email: string,
    purpose: 'register' | 'reset_password' | 'transfer' | 'withdrawal',
    accessToken?: string,
  ): Promise<{ success: boolean }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      await apiClient.post(
        'auth/send-otp',
        { email, purpose },
        {
          headers,
          skipAuth: !accessToken,
          baseUrl: CLIENT_BASE_URL,
        },
      );
      return { success: true };
    }

    await apiClient.post(
      '/api/auth/register/send-otp',
      { email, purpose },
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: !accessToken,
      },
    );
    return { success: true };
  },

  verifyOTP: async (
    email: string,
    otp: string,
    purpose: 'register' | 'reset_password' | 'transfer' | 'withdrawal',
    accessToken?: string,
  ): Promise<{ token: string }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ token: string }>(
        'auth/verify-otp',
        { email, otp, purpose },
        { headers, skipAuth: !accessToken, baseUrl: CLIENT_BASE_URL },
      );
    }

    return apiClient.post<{ token: string }>(
      '/api/auth/register/verify-otp',
      { email, otp, purpose },
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: !accessToken,
      },
    );
  },

  resetPassword: async (
    resetPasswordToken: string,
    newPassword: string,
  ): Promise<{ success: boolean }> => {
    if (isServer) {
      return apiClient.post<{ success: boolean }>(
        'auth/reset-password',
        { resetPasswordToken, newPassword },
        { skipAuth: true },
      );
    }

    return apiClient.post<{ success: boolean }>(
      '/api/auth/reset-password',
      { resetPasswordToken, newPassword },
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  },

  changePassword: async (
    oldPassword: string | undefined,
    newPassword: string,
    accessToken?: string,
  ): Promise<{ success: boolean }> => {
    const payload: { newPassword: string } & Partial<{ oldPassword: string }> = { newPassword };
    if (oldPassword) {
      payload.oldPassword = oldPassword;
    }

    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean }>('auth/change-password', payload, {
        headers,
        skipAuth: !accessToken,
      });
    }

    return apiClient.post<{ success: boolean }>('/api/auth/change-password', payload, {
      baseUrl: CLIENT_BASE_URL,
    });
  },

  createAuthChallenge: async (body: {
    purpose: 'LOGIN' | 'DISABLE_MFA' | 'SETUP_MFA' | 'WITHDRAW' | 'TRANSFER';
    payload?: JsonObject;
    accessToken?: string;
  }): Promise<{
    challengeId: string;
    purpose: 'LOGIN' | 'DISABLE_MFA' | 'SETUP_MFA' | 'WITHDRAW' | 'TRANSFER';
    requiredFactors: string[];
    expiresAt: string;
  }> => {
    const requiresAuth = body.purpose !== 'LOGIN';
    if (isServer) {
      const requestBody = {
        purpose: body.purpose,
        ...(body.payload ? { payload: body.payload } : {}),
      };

      const headers = body.accessToken
        ? { Authorization: `Bearer ${body.accessToken}` }
        : undefined;

      return apiClient.post<{
        challengeId: string;
        purpose: 'LOGIN' | 'DISABLE_MFA' | 'SETUP_MFA' | 'WITHDRAW' | 'TRANSFER';
        requiredFactors: string[];
        expiresAt: string;
      }>('auth/challenge', requestBody, {
        headers,
        skipAuth: !body.accessToken && requiresAuth,
      });
    }

    const requestBody = {
      purpose: body.purpose,
      ...(body.payload ? { payload: body.payload } : {}),
    };

    return apiClient.post<{
      challengeId: string;
      purpose: 'LOGIN' | 'DISABLE_MFA' | 'SETUP_MFA' | 'WITHDRAW' | 'TRANSFER';
      requiredFactors: string[];
      expiresAt: string;
    }>('/api/auth/challenge', requestBody, {
      baseUrl: CLIENT_BASE_URL,
      // When MFA setup (SETUP_MFA) is requested, backend requires auth token.
      // We rely on the browser auth interceptor to attach `Authorization` from cookies.
      skipAuth: !requiresAuth,
    });
  },

  verifyAuthChallenge: async (body: {
    challengeId: string;
    factor: 'TOTP' | 'EMAIL_OTP';
    code: string;
    accessToken?: string;
  }): Promise<import('../types/auth').VerifyAuthChallengeResponse> => {
    if (isServer) {
      const headers = body.accessToken
        ? { Authorization: `Bearer ${body.accessToken}` }
        : undefined;
      return apiClient.post<import('../types/auth').VerifyAuthChallengeResponse>(
        'auth/challenge/verify',
        body,
        { headers, skipAuth: true },
      );
    }

    return apiClient.post<import('../types/auth').VerifyAuthChallengeResponse>(
      '/api/auth/challenge/verify',
      body,
      {
        baseUrl: CLIENT_BASE_URL,
        skipAuth: true,
      },
    );
  },

  transfer: async (
    payload: TransferPayload,
    accessToken?: string,
  ): Promise<{ success: boolean }> => {
    if (isServer) {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      return apiClient.post<{ success: boolean }>('payment/transfer', payload, {
        headers,
        skipAuth: !accessToken,
        baseUrl: CLIENT_BASE_URL,
      });
    }

    return apiClient.post<{ success: boolean }>('/api/payment/transfer', payload, {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: !accessToken,
    });
  },
};
