import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.post(
        '/notifications/price-alerts/' + encodeURIComponent(id) + '/rearm',
        {},
        { headers: { Authorization: 'Bearer ' + token }, skipAuth: true },
      ),
    'price-alert-rearm-failed',
  );
}
