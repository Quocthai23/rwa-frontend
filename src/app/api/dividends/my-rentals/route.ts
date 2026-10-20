import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getMyRentalContracts } from '@/services/dividendService';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => getMyRentalContracts(token),
    'rental-contracts-fetch-failed',
  );
}
