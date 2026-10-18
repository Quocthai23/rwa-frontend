import type { NextRequest } from 'next/server';

import { ASSET_MANAGEMENT_ENDPOINTS } from '@/constants/api';
import { ApiError, apiClient } from '@/services/apiClient';
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

    const data = await apiClient.get<unknown>(
        ASSET_MANAGEMENT_ENDPOINTS.BUYOUT_PROPOSALS(assetId),
        undefined,
        {
            headers,
        },
    );

    return Response.json(data);
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { assetId } = await context.params;
        if (!assetId) {
            return Response.json({ message: 'Missing asset id' }, { status: 400 });
        }
        const accessToken = getAccessTokenFromRequest(request);
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const body = await request.json();
        const data = await apiClient.post(
            ASSET_MANAGEMENT_ENDPOINTS.BUYOUT_PROPOSALS(assetId),
            body,
            { headers },
        );
        return Response.json(data);
    } catch (error) {
        const status = error instanceof ApiError ? (error.status ?? 500) : 500;
        const message = error instanceof Error ? error.message : 'Unable to create buyout proposal';
        return Response.json({ message }, { status });
    }
}
