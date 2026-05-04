import { NextRequest } from 'next/server';
import { errorResponse, readStringField, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { claimRewards } from '@/services/reward.service';
import { CommissionPayoutDetailType } from '@/types/reward.types';

type ClaimRequestBody = {
  type?: number;
  idempotencyKey?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ClaimRequestBody;
  const type = Number(body.type);
  const idempotencyKey = readStringField(body, 'idempotencyKey');

  if (!Number.isInteger(type)) {
    return errorResponse('type is required', 422, { code: 'invalid-payload' });
  }

  if (
    type !== CommissionPayoutDetailType.Commission &&
    type !== CommissionPayoutDetailType.Rebate
  ) {
    return errorResponse('type is invalid', 422, { code: 'invalid-payload' });
  }

  if (!idempotencyKey) {
    return errorResponse('idempotencyKey is required', 422, { code: 'invalid-payload' });
  }

  return withServerTokenRefresh(
    request,
    (token) =>
      claimRewards(
        {
          type: type as CommissionPayoutDetailType,
          idempotencyKey,
        },
        token,
      ),
    'commission-claim-failed',
  );
}
