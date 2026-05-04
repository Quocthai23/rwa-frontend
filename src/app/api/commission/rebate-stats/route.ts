import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { getRebateStats } from '@/services/reward.service';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => getRebateStats(token),
    'rebate-stats-fetch-failed',
  );
}
