import { NextRequest } from 'next/server';

import { createWallet } from '@/services/paymentService';
import { type CreateWalletPayload } from '@/types/payment';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateWalletPayload;

  return withServerTokenRefresh(
    request,
    (token) => createWallet(body, token),
    'payment-create-wallet-failed',
  );
}
