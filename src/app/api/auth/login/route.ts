import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';
import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  setAuthCookies,
  successResponse,
} from '@/app/api/_utils/auth';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginApiResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
  status?: 'challenge_required';
  challengeId?: string;
  purpose?: 'LOGIN';
  requiredFactors?: Array<'TOTP' | 'EMAIL_OTP'>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const email = readStringField(body, 'email');
    const password = readStringField(body, 'password');

    if (!email || !password) {
      return errorResponse('Email and password are required', 422, {
        code: 'invalid-payload',
      });
    }

    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    
    const { data: response, response: backendResponse } = await apiClient.postWithResponse<LoginApiResponse>('auth/login', { email, password }, {
      baseUrl: backendUrl,
      skipAuth: true,
    });

    if (response?.status === 'challenge_required') {
      return successResponse(response, 200);
    }

    const accessToken = response?.accessToken;

    if (!accessToken || !response.user) {
      return errorResponse('Missing tokens in response', 502, {
        code: 'invalid-auth-response',
      });
    }

    const nextResponse = successResponse(
      {
        accessToken,
        user: response.user,
      },
      200,
    );

    const setCookies = backendResponse.headers.getSetCookie();
    setCookies.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    setAuthCookies(nextResponse, { accessToken });

    return nextResponse;
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      getErrorStatus(error, 0) ||
      (message.toLowerCase().includes('invalid email or password') || message.toLowerCase().includes('login failed') ? 401 : 500);

    return errorResponse(message, status, {
      code: 'invalid-credentials',
    });
  }
}
