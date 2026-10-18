import { apiClient } from '@/services/apiClient';
import { NextRequest, NextResponse } from 'next/server';
import { withServerTokenRefresh } from '../_utils/auth';

export async function POST(request: NextRequest) {
  const { assetId } = await request.json();

  return withServerTokenRefresh(
    request,
    (token) =>
      apiClient.post(
        `/user/favorites/assets`,
        { assetId },
        {
          headers: {
            Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          },
        },
      ),
    'favorites-upstream-failed',
    (data) => NextResponse.json(data),
  );
}

