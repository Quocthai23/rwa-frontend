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

type RegisterPayload = {
  avatar?: null | string;
  password: string;
  referenceCode?: string;
  registerToken: string;
  username?: string;
};

type RegisterApiResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;

    const password = readStringField(body, 'password');
    const registerToken = readStringField(body, 'registerToken');

    if (!password || !registerToken) {
      return errorResponse('registerToken and password are required', 422, {
        code: 'invalid-payload',
      });
    }

    const backendUrl = API_BASE_URL || 'http://localhost:3001';

    const payload: Record<string, any> = {
      password,
      username: body.username,
    };

    if (body.avatar) payload.avatar = body.avatar;
    if (body.referenceCode) payload.referenceCode = body.referenceCode;
    if (registerToken) payload.registerToken = registerToken;

    const { data: response, response: backendResponse } = await apiClient.postWithResponse<RegisterApiResponse>('auth/register', payload, {
      baseUrl: backendUrl,
      skipAuth: true,
    });


    const accessToken = response?.accessToken;

    if (!accessToken) {
      return errorResponse('Missing tokens in response', 502, {
        code: 'invalid-auth-response',
      });
    }

    const nextResponse = successResponse(
      {
        accessToken,
        user: response?.user,
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
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-register-failed',
    });
  }
}
