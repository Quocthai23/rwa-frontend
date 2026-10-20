import { NextRequest } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.delete('/notifications/price-alerts/' + encodeURIComponent(id), undefined, {
        headers: { Authorization: 'Bearer ' + token },
        skipAuth: true,
      }),
    'price-alert-delete-failed',
  );
}
