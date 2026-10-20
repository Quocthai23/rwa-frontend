import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';

export function GET(request: NextRequest) {
  return withServerTokenRefresh(request, async (token) => {
    await apiClient.get('user/me', undefined, { headers: { Authorization: `Bearer ${token}` }, skipAuth: true });
    return { accessToken: token };
  }, 'socket-auth-failed', (data) => NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } }));
}
