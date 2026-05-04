import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getRebateDetails } from '@/services/reward.service';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => getRebateDetails(token),
    'rebate-details-fetch-failed',
  );
}
