import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.get('/notifications/price-alerts', undefined, {
        headers: { Authorization: 'Bearer ' + token },
        skipAuth: true,
      }),
    'price-alerts-failed',
  );
}
export async function POST(request: NextRequest) {
  const body = await request.json();
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.post('/notifications/price-alerts', body, {
        headers: { Authorization: 'Bearer ' + token },
        skipAuth: true,
      }),
    'price-alert-create-failed',
  );
}
