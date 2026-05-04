import { NextRequest } from 'next/server';

import { transferAPI } from '@/services/paymentService';
import { type TransferPayload } from '@/types/payment';
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

type TransferChallengePurpose = 'TRANSFER';
type TransferRequestBody =
  | TransferPayload
  | {
      purpose: string;
      payload?: TransferPayload;
    };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TransferRequestBody;
    const purposeRaw = readStringField(body, 'purpose');
    const purpose = purposeRaw?.toUpperCase();

    // Challenge-first flow (same response shape as login challenge).
    if (purposeRaw) {
      if (purpose !== 'TRANSFER') {
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
        purpose: purpose as TransferChallengePurpose,
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

    const paymentPayload = body as TransferPayload;

    return withServerTokenRefresh(
      request,
      (token) => transferAPI(paymentPayload, token),
      'payment-transfer-failed',
    );
  } catch (error) {
    const errorCode = getErrorCode(error) ?? 'payment-transfer-failed';
    return errorResponse(getErrorMessage(error), getErrorStatus(error), {
      code: errorCode,
    });
  }
}
