import { NextRequest } from 'next/server';
import { authApi } from '@/services/auth';
import { errorResponse, readStringField, withServerTokenRefresh } from '@/app/api/_utils/auth';

type UpdateReferralPayload = {
  referenceCode: string;
};

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as UpdateReferralPayload;
  const referenceCode = readStringField(body, 'referenceCode');

  if (!referenceCode) {
    return errorResponse('referenceCode is required', 422, {
      code: 'invalid-payload',
    });
  }

  return withServerTokenRefresh(
    request,
    (token) => authApi.updateReferral({ referenceCode }, token),
    'user-referral-update-failed',
  );
}
