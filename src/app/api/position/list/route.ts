import { NextRequest } from 'next/server';
import { getPositions } from '@/services/positionService';
import type { GetPositionsParams } from '@/services/positionService';
import { withServerTokenRefresh } from '../../_utils/auth';

const SORT_BY_VALUES: NonNullable<GetPositionsParams['sortBy']>[] = [
  'openedAt',
  'closedAt',
  'quantity',
  'symbol',
  'side',
  'realizedPnl',
];

const parseSortBy = (value: string | null): GetPositionsParams['sortBy'] => {
  if (!value) {
    return undefined;
  }

  return SORT_BY_VALUES.includes(value as NonNullable<GetPositionsParams['sortBy']>)
    ? (value as NonNullable<GetPositionsParams['sortBy']>)
    : undefined;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let statusArray = searchParams.getAll('status');
  // If we have one element that contains comma, split it
  if (statusArray.length === 1 && statusArray[0].includes(',')) {
    statusArray = statusArray[0].split(',');
  }
  const params: GetPositionsParams = {
    accountId: searchParams.get('accountId') || '',
    take: searchParams.get('take') ? parseInt(searchParams.get('take')!) : undefined,
    skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined,
    cursor: searchParams.get('cursor') || undefined,
    symbol: searchParams.get('symbol') || undefined,
    side: searchParams.get('side') ? parseInt(searchParams.get('side')!) : undefined,
    orderType: searchParams.get('orderType') ? parseInt(searchParams.get('orderType')!) : undefined,
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') || undefined,
    fromDate: searchParams.get('fromDate') || undefined,
    toDate: searchParams.get('toDate') || undefined,
    status: statusArray.map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)),
  };

  return withServerTokenRefresh(
    request,
    (token) => getPositions(params, token),
    'positions-fetch-failed',
  );
}
