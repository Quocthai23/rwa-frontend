import { NextRequest } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { authApi } from '@/services/auth';

export async function GET(request: NextRequest) {
  return withServerTokenRefresh(request, (token) => authApi.getMe(token), 'user-me-fetch-failed');
}

export async function DELETE(request: NextRequest) {
  return withServerTokenRefresh(
    request,
    (token) => authApi.deleteMe(token),
    'user-me-delete-failed',
  );
}
