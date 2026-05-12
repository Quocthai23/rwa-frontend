import type { NextRequest } from 'next/server';

import { ASSETS_ENDPOINTS } from '@/constants/api';
import type { AssetMarketData } from '@/types';
import { apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    const { id: assetId } = await context.params;
    if (!assetId) {
        return Response.json({ message: 'Missing asset id' }, { status: 400 });
    }

    const accessToken = getAccessTokenFromRequest(request);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    const data = await apiClient.get<AssetMarketData>(
        ASSETS_ENDPOINTS.MARKET_DATA(assetId),
        undefined,
        {
            headers,
        },
    );

    return Response.json(data);
}
