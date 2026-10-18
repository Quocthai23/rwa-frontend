import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ assetId: string; applicationId: string }> },
) {
  const { assetId, applicationId } = await params;
  const payload = await request.json();

  return withServerTokenRefresh(
    request,
    (accessToken) =>
      apiClient.patch(
        `asset-management/${assetId}/rental-applications/${applicationId}`,
        payload,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    'rental-application-review-failed',
    (data) => NextResponse.json({ data }),
  );
}
