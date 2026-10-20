import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
export async function GET(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.get('/notifications/preferences', undefined, {
        headers: { Authorization: `Bearer ${token}` },
        skipAuth: true,
      }),
    'notification-preferences-failed',
  );
}
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.patch('/notifications/preferences', body, {
        headers: { Authorization: `Bearer ${token}` },
        skipAuth: true,
      }),
    'notification-preferences-failed',
  );
}
