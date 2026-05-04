import { ORDERS_ENDPOINTS } from '@/constants/api';
import { apiClient } from '@/services/apiClient';
import type { CreateOrderPayload, CreateOrderResponse } from '@/types/orders';
import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '../_utils/auth';

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as CreateOrderPayload;

  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.post<CreateOrderResponse>(ORDERS_ENDPOINTS.CREATE, payload, {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      }),
    'order-create-failed',
    (data) => NextResponse.json(data),
  );
}
