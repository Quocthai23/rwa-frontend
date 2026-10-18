import { NextRequest } from 'next/server';

import { payosCheckout } from '@/services/paymentService';
import { type PayosCheckoutPayload } from '@/types/payment';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PayosCheckoutPayload;

  try {
    return await withServerTokenRefresh(
      request,
      (token) => payosCheckout(body, token),
      'payment-payos-checkout-failed',
    );
  } catch (err) {
    console.error('SERVER SIDE PAYOS CHECKOUT ERROR:', err);
    throw err;
  }
}
