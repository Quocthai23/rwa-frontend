import type { NextRequest } from 'next/server';

import { ASSET_MANAGEMENT_ENDPOINTS } from '@/constants/api';
import { apiClient } from '@/services/apiClient';
import { getAccessTokenFromRequest } from '@/app/api/_utils/auth';

type RouteContext = {
    params: Promise<{ assetId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    const { assetId } = await context.params;
    if (!assetId) {
        return Response.json({ message: 'Missing asset id' }, { status: 400 });
    }

    const accessToken = getAccessTokenFromRequest(request);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

    const data = await apiClient.get<any>(
        ASSET_MANAGEMENT_ENDPOINTS.STATUS(assetId),
        undefined,
        {
            headers,
        },
    );

    return Response.json({ data });
}
