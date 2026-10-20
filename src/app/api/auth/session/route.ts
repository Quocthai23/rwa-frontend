import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest, withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';
import type { User } from '@/types/auth';

export function GET(request: NextRequest) {
  if (!getAccessTokenFromRequest(request)) return NextResponse.json({ data: null });
  return withServerTokenRefresh(request, (token) => apiClient.get<User>('user/me', undefined, {
    headers: { Authorization: `Bearer ${token}` }, skipAuth: true,
  }), 'session-fetch-failed', (data) => NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } }));
}
