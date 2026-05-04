import { NextRequest } from 'next/server';
import {
  errorResponse,
  successResponse,
  setAuthCookies,
  getErrorMessage,
  getErrorStatus,
  readStringField,
} from '../../_utils/auth';
import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';
import { LoginResponse } from '@/types/auth';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { idToken: string };
    const idToken = readStringField(body, 'idToken') as string;
    if (!idToken) {
      return errorResponse('Missing id token', 401, {
        code: 'missing-id-token',
      });
    }

    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    
    const { data: response, response: backendResponse } = await apiClient.postWithResponse<LoginResponse>('auth/login-with-social', {
      idToken,
      provider: 'google',
    }, {
      baseUrl: backendUrl,
      skipAuth: true,
    });

    if ('status' in response && response.status === 'challenge_required') {
      return successResponse(response, 200);
    }

    if ('accessToken' in response && response.user) {
      const nextResponse = successResponse(
        {
          accessToken: response.accessToken,
          user: response.user,
        },
        200,
      );

      const setCookies = backendResponse.headers.getSetCookie();
      setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });

      setAuthCookies(nextResponse, {
        accessToken: response.accessToken,
      });

      return nextResponse;
    }

    return errorResponse('Missing tokens in response', 502, {
      code: 'invalid-auth-response',
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      getErrorStatus(error, 0) || (message.toLowerCase().includes('invalid id token') || message.toLowerCase().includes('login failed') ? 401 : 500);

    return errorResponse(message, status, {
      code: 'auth-exchange-failed',
    });
  }
}
