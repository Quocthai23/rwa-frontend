import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

import { getCommission } from '@/services/reward.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fromDate = searchParams.get('fromDate') || undefined;
  const toDate = searchParams.get('toDate') || undefined;

  return withServerTokenRefresh(
    request,
    (token) => getCommission({ fromDate, toDate }, token),
    'commission-fetch-failed',
  );
}
