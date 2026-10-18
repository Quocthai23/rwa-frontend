import type { NextRequest } from 'next/server';

import { ASSET_MANAGEMENT_ENDPOINTS } from '@/constants/api';
import { ApiError, apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

type RouteContext = {
  params: Promise<{ assetId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { assetId } = await context.params;
    const durationMonths = Number(request.nextUrl.searchParams.get('durationMonths') ?? '12');
    const premiumParam = request.nextUrl.searchParams.get('premiumPercent');
    const premiumPercent = premiumParam === null ? undefined : Number(premiumParam);
    if (!assetId || !Number.isInteger(durationMonths) || (premiumPercent !== undefined && !Number.isFinite(premiumPercent))) {
      return Response.json({ message: 'Invalid buyout quote request' }, { status: 400 });
    }

    const accessToken = getAccessTokenFromRequest(request);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    const data = await apiClient.get(
      ASSET_MANAGEMENT_ENDPOINTS.BUYOUT_QUOTE(assetId, durationMonths, premiumPercent),
      undefined,
      { headers },
    );
    return Response.json(data);
  } catch (error) {
    const status = error instanceof ApiError ? (error.status ?? 500) : 500;
    const message = error instanceof Error ? error.message : 'Unable to calculate buyout quote';
    return Response.json({ message }, { status });
  }
}
