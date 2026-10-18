import { NextRequest, NextResponse } from 'next/server';

import { withServerTokenRefresh } from '@/app/api/_utils/auth';
import { apiClient } from '@/services/apiClient';

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

const passthrough = (data: unknown) => NextResponse.json({ data });

export async function GET(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;
  return withServerTokenRefresh(
    request,
    (accessToken) =>
      apiClient.get(`asset-management/${assetId}/rental-application`, undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    'rental-application-fetch-failed',
    passthrough,
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { assetId } = await context.params;
  const payload = (await request.json()) as {
    message?: string;
    desiredStartDate?: string;
  };

  return withServerTokenRefresh(
    request,
    (accessToken) =>
      apiClient.post(`asset-management/${assetId}/rental-application`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    'rental-application-submit-failed',
    passthrough,
  );
}
