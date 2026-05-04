import {
  errorResponse,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  getAccessTokenFromRequest,
  setAuthCookies,
  successResponse,
} from '@/app/api/_utils/auth';
import { API_BASE_URL } from '@/constants/env';
import { apiClient } from '@/services/apiClient';
import type { VerifyAuthChallengeResponse } from '@/types/auth';

type VerifyAuthChallengePayload = {
  challengeId: string;
  factor: string;
  code: string;
};

type AuthChallengeFactor = 'TOTP' | 'EMAIL_OTP';

const FACTOR_VALUES: Record<string, AuthChallengeFactor> = {
  TOTP: 'TOTP',
  EMAIL_OTP: 'EMAIL_OTP',
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyAuthChallengePayload;
    const challengeId = readStringField(body, 'challengeId');
    const factorRaw = readStringField(body, 'factor');
    const factorNormalized = factorRaw?.toUpperCase();
    const factor = factorNormalized ? FACTOR_VALUES[factorNormalized] : undefined;
    const code = readStringField(body, 'code');

    if (!challengeId || !code || !factorRaw) {
      return errorResponse('challengeId, factor and code are required', 422, {
        code: 'invalid-payload',
      });
    }

    if (!factor) {
      return errorResponse('factor is invalid', 422, { code: 'invalid-payload' });
    }

    const accessTokenHeader = getAccessTokenFromRequest(request);
    
    const backendUrl = API_BASE_URL || 'http://localhost:3001';
    
    const { data: response, response: backendResponse } = await apiClient.postWithResponse<VerifyAuthChallengeResponse>('auth/challenge/verify', {
      challengeId,
      factor,
      code,
    }, {
      baseUrl: backendUrl,
      skipAuth: !accessTokenHeader,
      headers: accessTokenHeader ? { Authorization: `Bearer ${accessTokenHeader}` } : {},
    });

    const nextResponse = successResponse(response, 200);
    
    if (response.completed === true && 'accessToken' in response && response.accessToken) {
      const setCookies = backendResponse.headers.getSetCookie();
      setCookies.forEach((cookie) => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });

      setAuthCookies(nextResponse, {
        accessToken: response.accessToken,
      });
    }

    return nextResponse;
  } catch (error) {
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: 'auth-verify-challenge-failed',
    });
  }
}
