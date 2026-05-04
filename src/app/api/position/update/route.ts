import { NextRequest } from 'next/server';
import { getPositionStats, type GetPositionsParams } from '@/services/positionService';
import { withServerTokenRefresh } from '../../_utils/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: GetPositionsParams = {
    accountId: searchParams.get('accountId') || '',
  };

  return withServerTokenRefresh(
    request,
    (token) => getPositionStats(params, token),
    'position-update-fetch-failed',
  );
}
