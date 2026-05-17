import { NextRequest } from 'next/server';

import { depositDemo } from '@/services/paymentService';
import { type DepositDemoPayload } from '@/types/payment';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as DepositDemoPayload;

  return withServerTokenRefresh(
    request,
    (token) => depositDemo(body, token),
    'payment-deposit-demo-failed',
  );
}
