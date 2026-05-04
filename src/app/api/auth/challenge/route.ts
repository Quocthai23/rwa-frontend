import {
  errorResponse,
  getAccessTokenFromRequest,
  getErrorCode,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
} from '@/app/api/_utils/auth';
import { authApi } from '@/services/auth';

type AuthChallengePurpose = 'LOGIN' | 'SETUP_MFA' | 'DISABLE_MFA' | 'WITHDRAW' | 'TRANSFER';

const PURPOSE_MAP: Record<string, AuthChallengePurpose> = {
  LOGIN: 'LOGIN',
  SETUP_MFA: 'SETUP_MFA',
  DISABLE_MFA: 'DISABLE_MFA',
  WITHDRAW: 'WITHDRAW',
  WITHDRAWAL: 'WITHDRAW',
  TRANSFER: 'TRANSFER',
};

type CreateAuthChallengePayload = {
  purpose: string;
  payload?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateAuthChallengePayload;
    const purposeRaw = readStringField(body, 'purpose');
    const purposeNormalized = purposeRaw?.toUpperCase();
    const purpose = purposeNormalized ? PURPOSE_MAP[purposeNormalized] : undefined;

    const rawPayload = (body as { payload?: unknown }).payload;
    if (!purposeRaw || !purpose) {
      return errorResponse('purpose is invalid', 422, { code: 'invalid-payload' });
    }

    if (rawPayload !== undefined) {
      if (typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
        return errorResponse('payload must be an object', 422, { code: 'invalid-payload' });
      }
    }

    const requiresAuth =
      purpose === 'SETUP_MFA' ||
      purpose === 'WITHDRAW' ||
      purpose === 'TRANSFER' ||
      purpose === 'DISABLE_MFA';
    const accessToken = requiresAuth ? getAccessTokenFromRequest(request) : undefined;

    const response = await authApi.createAuthChallenge({
      purpose,
      ...(rawPayload === undefined ? {} : { payload: rawPayload as any }),
      ...(accessToken ? { accessToken } : {}),
    });

    return successResponse(response, 200);
  } catch (error) {
    const errorCode = getErrorCode(error) ?? 'auth-create-challenge-failed';
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: errorCode,
    });
  }
}
