import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
export async function DELETE(request: NextRequest, context: { params: Promise<{ hash: string }> }) {
  const { hash } = await context.params;
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.delete('/notifications/push/' + encodeURIComponent(hash), undefined, {
        headers: { Authorization: 'Bearer ' + token },
        skipAuth: true,
      }),
    'push-removal-failed',
  );
}
