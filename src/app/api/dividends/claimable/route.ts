import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getClaimableDividends } from '@/services/dividendService';

export async function GET(request: NextRequest) {
  const requestedType = request.nextUrl.searchParams.get('type');
  const type =
    requestedType === 'DIVIDEND' || requestedType === 'RENTAL_INCOME' ? requestedType : undefined;

  return withServerTokenRefresh(
    request,
    (token) => getClaimableDividends(token, type),
    'claimable-dividends-fetch-failed',
  );
}
