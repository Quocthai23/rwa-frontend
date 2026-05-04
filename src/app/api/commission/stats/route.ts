import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getReferralStats } from '@/services/referralService';

import {} from '@/services/referralService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;

  return withServerTokenRefresh(
    request,
    (token) => getReferralStats({ fromDate, toDate }, token),
    'commission-stats-fetch-failed',
  );
}
