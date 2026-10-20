import { NextRequest } from 'next/server';

import { getPaymentHistoryAPI } from '@/services/paymentService';
import { type GetPaymentHistoryParams } from '@/types/payment';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

// Maps legacy numeric type/status string query params to BE string enum
const TYPE_MAP: Record<string, GetPaymentHistoryParams['type']> = {
  '0': 'DEPOSIT',
  '1': 'WITHDRAW',
  '2': 'TRANSFER',
};

const STATUS_MAP: Record<string, GetPaymentHistoryParams['status']> = {
  '0': 'PENDING',
  '3': 'COMPLETED',
  '4': 'FAILED',
  '6': 'CANCELLED',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parameters: GetPaymentHistoryParams = {
    take: Number(searchParams.get('take')) || 20,
    skip: Number(searchParams.get('skip')) || 0,
  };
  const transactionId = searchParams.get('transactionId');
  if (transactionId) parameters.transactionId = transactionId;
  const accountId = searchParams.get('accountId');
  if (accountId) parameters.accountId = accountId;

  const startDate = searchParams.get('startDate');
  if (startDate) parameters.startDate = startDate;

  const endDate = searchParams.get('endDate');
  if (endDate) parameters.endDate = endDate;

  // Support both string enum and legacy numeric values
  const rawType = searchParams.get('type');
  if (rawType) {
    parameters.type = TYPE_MAP[rawType] ?? (rawType as GetPaymentHistoryParams['type']);
  }

  const rawStatus = searchParams.get('status');
  if (rawStatus) {
    parameters.status = STATUS_MAP[rawStatus] ?? (rawStatus as GetPaymentHistoryParams['status']);
  }

  return withServerTokenRefresh(
    request,
    (token) => getPaymentHistoryAPI(parameters, token),
    'payment-history-failed',
  );
}
