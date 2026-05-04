import { NextRequest } from 'next/server';

import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  getRefreshTokenFromRequest,
  setAuthCookies,
  successResponse,
} from '@/app/api/_utils/auth';

type RefreshApiResponse = {
  accessToken?: string;
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      return errorResponse('Missing refresh token', 401, {
        code: 'missing-refresh-token',
      });
    }

    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    
    const { data: response, response: backendResponse } = await apiClient.postWithResponse<RefreshApiResponse>('auth/refresh', { refreshToken }, {
      baseUrl: backendUrl,
      skipAuth: true,
      headers: {
        'Cookie': `refresh_token=${refreshToken}`,
      },
    });
    const accessToken = response?.accessToken;

    if (!accessToken) {
      return errorResponse('Missing access token in response', 502, {
        code: 'invalid-refresh-response',
      });
    }

    const nextResponse = successResponse({ accessToken }, 200);

    const setCookies = backendResponse.headers.getSetCookie();
    setCookies.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    setAuthCookies(nextResponse, { accessToken });

    return nextResponse;
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-refresh-failed',
    });
  }
}
