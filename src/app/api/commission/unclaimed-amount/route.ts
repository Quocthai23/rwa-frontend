import { NextRequest } from 'next/server';
import { errorResponse, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getUnclaimedAmount } from '@/services/reward.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;

  if ((fromDate && !toDate) || (!fromDate && toDate)) {
    return errorResponse('fromDate and toDate must be provided together', 422, {
      code: 'invalid-payload',
    });
  }

  const params = fromDate && toDate ? { fromDate, toDate } : undefined;

  return withServerTokenRefresh(
    request,
    (token) => getUnclaimedAmount(params, token),
    'commission-unclaimed-amount-fetch-failed',
  );
}
