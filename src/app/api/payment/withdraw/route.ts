import { NextRequest } from 'next/server';

import { withdraw } from '@/services/paymentService';
import { type WithdrawPayload } from '@/types/payment';
import { authApi } from '@/services/auth';
import {
  errorResponse,
  getAccessTokenFromRequest,
  getErrorCode,
  getErrorMessage,
  getErrorStatus,
  readStringField,
  successResponse,
  withServerTokenRefresh,
} from '@/app/api/_utils/auth';

type WithdrawChallengePurpose = 'WITHDRAW';
type WithdrawRequestBody =
  | WithdrawPayload
  | {
      purpose: string;
      payload?: WithdrawPayload;
    };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WithdrawRequestBody;
    const purposeRaw = readStringField(body, 'purpose');
    const purpose = purposeRaw?.toUpperCase();

    // Challenge-first flow (same response shape as login challenge).
    if (purposeRaw) {
      if (purpose !== 'WITHDRAW') {
        return errorResponse('purpose is invalid', 422, { code: 'invalid-payload' });
      }

      const accessToken = getAccessTokenFromRequest(request);
      if (!accessToken) {
        return errorResponse('Unauthorized', 401, { code: 'missing-token' });
      }

      const payload = (body as { payload?: unknown }).payload;
      if (payload !== undefined && (typeof payload !== 'object' || Array.isArray(payload))) {
        return errorResponse('payload must be an object', 422, { code: 'invalid-payload' });
      }

      const challenge = await authApi.createAuthChallenge({
        purpose: purpose as WithdrawChallengePurpose,
        ...(payload === undefined ? {} : { payload: payload as any }),
        accessToken,
      });

      return successResponse(
        {
          status: 'challenge_required',
          challengeId: challenge.challengeId,
          purpose: challenge.purpose,
          requiredFactors: challenge.requiredFactors,
          expiresAt: challenge.expiresAt,
        },
        200,
      );
    }

    const paymentPayload = body as WithdrawPayload;

    return withServerTokenRefresh(
      request,
      (token) => withdraw(paymentPayload, token),
      'payment-withdraw-failed',
    );
  } catch (error) {
    const errorCode = getErrorCode(error) ?? 'payment-withdraw-failed';
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: errorCode,
    });
  }
}
