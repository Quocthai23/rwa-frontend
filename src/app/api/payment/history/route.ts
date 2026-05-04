import { NextRequest } from 'next/server';

import { getPaymentHistoryAPI } from '@/services/paymentService';
import { type GetPaymentHistoryParams } from '@/types/payment';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

const parseNumericFilters = (searchParams: URLSearchParams, key: string): number[] => {
  const rawValues = searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return rawValues.map(Number).filter((value) => Number.isFinite(value));
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parameters: GetPaymentHistoryParams = {
    accountId: searchParams.get('accountId') || '',
    take: Number(searchParams.get('take')) || 20,
    skip: Number(searchParams.get('skip')) || 0,
  };

  const startDate = searchParams.get('startDate');
  if (startDate) parameters.startDate = startDate;

  const endDate = searchParams.get('endDate');
  if (endDate) parameters.endDate = endDate;

  const types = parseNumericFilters(searchParams, 'type');
  if (types.length > 0) parameters.type = types;

  const statuses = parseNumericFilters(searchParams, 'status');
  if (statuses.length > 0) parameters.status = statuses;

  return withServerTokenRefresh(
    request,
    (token) => getPaymentHistoryAPI(parameters, token),
    'payment-history-failed',
  );
}
