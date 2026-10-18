import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  return withServerTokenRefresh(
    request,
    (accessToken) =>
      apiClient.get(`asset-management/${assetId}/rental-applications`, undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    'rental-applications-fetch-failed',
    (data) => NextResponse.json({ data }),
  );
}
